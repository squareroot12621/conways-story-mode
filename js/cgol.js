import {images, ruleAliases} from "./utilities.js";

class CGoL {
  #lastTickTime;
  #statCounters;
  #maxBackSnapshots;
  #backSnapshots;
  #safeBackGenerations;
  #maxUndoSnapshots;
  #undoSnapshots;
  #currentUndoState;
  #ctx;
  #gridCanvas;
  #gridCtx;
  #lastDrawTime;
  #lastWidth;
  #lastHeight;
  #lastAnimationFrame;
  #changedCamera;
  #changedPattern;
  #cachedPicture;
  #recalculating;

  constructor(options = {}) {
    // CGoL stuff
    this.gridSize = options.gridSize ?? 64;
    this.border = options.border ?? 8;
    if (this.border >= this.gridSize / 2) {
      this.border = Math.floor((this.gridSize - 1) / 2);
    }
    this.intermediateRle = options.pattern ?? ".";
    const parsed = CGoL.parseRle(
      this.intermediateRle,
      true,
      this.gridSize,
      options.patternX ?? 0,
      options.patternY ?? 0,
    );
    this.rule = options.rule ?? parsed.rule ?? "B3/S23";
    this.pattern = parsed.pattern;
    this.patternCenterX = parsed.centerX;
    this.patternCenterY = parsed.centerY;
    this.objects = [];
    for (const object of options.objects ?? []) {
      const parsedObject = CGoL.parseRle(object.pattern);
      const rotatedObject = CGoL.rotatePattern(
        parsedObject.pattern,
        // 0 = upright, 1 = 90 degrees CW
        object.rotation ?? 0,
        object.flipX ?? false,
      );
      this.objects.push({
        "pattern": rotatedObject.pattern,
        "x": (object.x ?? 0) + rotatedObject.x + (options.patternX ?? 0),
        "y": (object.y ?? 0) + rotatedObject.y + (options.patternY ?? 0),
        "width": rotatedObject.width,
        "height": rotatedObject.height,
        "moving": false,
        "selected": false,
      });
    }

    // Simulation stuff
    this.generation = 0;
    this.playing = options.autoplay ?? false;
    this.speed = options.speed ?? 5;
    /*
     * The ranges [selection.left, selection.right]
     * and [selection.top, selection.bottom] are inclusive.
     */
    this.selection = {
      "left": Math.floor(this.patternCenterX),
      "right": Math.floor(this.patternCenterX),
      "top": Math.floor(this.patternCenterY),
      "bottom": Math.floor(this.patternCenterY),
      "visible": false,
    };
    this.#lastTickTime = document.timeline.currentTime;
    this.#statCounters = {
      "generation": options.generationCounter ?? null,
      "population": options.populationCounter ?? null,
      "boundingBox": options.boundingBoxCounter ?? null,
      "stateHandler": options.stateHandler ?? null,
      "tickHandler": options.tickHandler ?? null,
    };
    this.#maxBackSnapshots = options.maxBackSnapshots ?? 100;
    this.#safeBackGenerations = new Set([0]);
    this.#maxUndoSnapshots = options.maxUndoSnapshots ?? 50;
    this.#undoSnapshots = [];
    // Gets incremented by setState()
    this.#currentUndoState = -1;
    // this.#backSnapshots is already defined by this.compilePattern()

    // Graphical stuff
    this.canvas = options.canvas;
    this.#ctx = options.canvas.getContext("2d");
    this.xOffset = options.xOffset ?? 0;
    this.yOffset = options.yOffset ?? 0;
    this.zoom = CGoL.#roundZoom(options.zoom ?? 8);

    // Offscreen canvas for drawing the grid
    const gridCanvasSize = CGoL.#gridCanvasSize(this.zoom);
    this.#gridCanvas = new OffscreenCanvas(gridCanvasSize, gridCanvasSize);
    this.#gridCtx = this.#gridCanvas.getContext("2d");

    // Cache stuff
    this.#lastWidth = this.canvas.width;
    this.#lastHeight = this.canvas.height;
    this.#lastDrawTime = -Infinity;
    this.#lastAnimationFrame = null;
    this.#changedCamera = false;
    this.#changedPattern = false;
    this.#cachedPicture = null;
    this.#recalculating = false;
    /*
     * Make sure the canvas doesn't keep requesting animation frames
     * after it's destroyed
     * https://stackoverflow.com/questions/20156453/how-to-detect-element-being-added-removed-from-dom-element
     */
    const observer = new MutationObserver(() => {
      if (!this.canvas.isConnected) {
        observer.disconnect();
        this.stopDrawing();
      }
    });
    observer.observe(
      document.getElementById("conways-story-mode"),
      {"childList": true, "subtree": true},
    );

    this.compilePattern();
    this.setState(null, 1, 0);
    this.#updateStats();
  }

  static #normalizeRule(rule) {
    rule = rule.toUpperCase();
    const ruleMatch = rule.match(
      /^B?([0-8]*)(?:\/|S|\/S)([0-8]*)(?:(?:\/|G|\/G)(\d+))?$/,
    );
    if (ruleMatch) {
      // Either a B.../S.../G... rule or a .../.../... rule
      let birth = ruleMatch[1];
      let survival = ruleMatch[2];
      const generations = ruleMatch[3];
      if (!(rule.includes("B") || rule.includes("S"))) {
        [survival, birth] = [birth, survival];
      }
      if (birth.includes("0")) {
        throw new Error("B0 rules aren't supported yet");
      }
      if (generations) {
        throw new Error("Generations rules aren't supported yet");
      }
      return generations > 2
        ? `B${birth}/S${survival}/G${generations}`
        : `B${birth}/S${survival}`;
    } else {
      // Named rule
      if (Object.keys(ruleAliases).includes(rule)) {
        rule = ruleAliases[rule];
      } else {
        const namedRuleMatch = rule.match(/^[A-Za-z][A-Za-z0-9_-]*$/);
        if (namedRuleMatch) {
          throw new Error(`Unknown rule name ${rule}`);
        }
        throw new SyntaxError(`Invalid rule name ${rule}`);
      }
      return rule;
    }
  }

  static parseRle(
    rle,
    fullsize = false,
    gridSize = null,
    xOffset = 0,
    yOffset = 0,
  ) {
    const output = {"rule": null};
    const lines = [];
    for (const fullLine of rle.split("\n")) {
      const [line, comment] = fullLine.trim().split("#", 1);
      // TODO: Don't ignore #P or #R
      if (comment?.startsWith("r")) {
        output.rule = CGoL.#normalizeRule(comment.slice(1).trim());
      }
      lines.push(line);
    }
    // Parse the header
    const headerRegexpSections = [
      // Ensure the match starts at the beginning of the header
      "^",
      // The "x = ..." part of the header
      "x *= *(?:0|[1-9][0-9]*)",
      // The separator between dimensions
      " *(?:, *)?",
      // The "y = ..." part of the header
      "y *= *(?:0|[1-9][0-9]*)",
      // The separator between dimensions
      " *(?:, *)?",
      // The "rule = ..." part of the header
      "(?:rule *= *(.*))?",
      // Ensure the match covers the entire header
      "$",
    ];
    const headerRegexp = RegExp(headerRegexpSections.join(""));
    const headerMatch = lines[0].match(headerRegexp);
    if (headerMatch) {
      output.rule = CGoL.#normalizeRule(headerMatch[1]);
      lines.shift();
    }
    // Decode the RLE
    let grid = [];
    let currentLine = [];
    let rowWidth = 0;
    let maxRowWidth = 0;
    parseRleLoop: for (const line of lines) {
      let processingLine = line;
      while (processingLine) {
        const part = processingLine.match(/([1-9][0-9]*)?([.boA-Y$!])/);
        if (!part) {
          throw new SyntaxError(`Invalid RLE ${processingLine}`);
        } else if (part.index) {
          throw new SyntaxError(
            `Invalid RLE ${processingLine.slice(0, part.index)}`,
          );
        }
        // Count is 1 by default
        const count = parseInt(part[1]) || 1;
        const cell = part[2];
        let cellNumber;
        if (cell === "$") {
          grid.push(currentLine);
          grid = grid.concat(Array(count - 1).fill([]));
          maxRowWidth = Math.max(rowWidth, maxRowWidth);
          currentLine = [];
          rowWidth = 0;
        } else if (cell === "!") {
          if (part[1]) {
            throw new SyntaxError("! should not have a count");
          }
          // We processed the entire RLE
          break parseRleLoop;
        } else {
          switch (cell) {
            case ".":
            case "b":
              cellNumber = 0;
              break;
            case "o":
              cellNumber = 1;
              break;
            default:
              cellNumber = cell.codePointAt(0) - 64;
              break;
          }
          currentLine = currentLine.concat(Array(count).fill(cellNumber));
          rowWidth += count;
        }
        processingLine = processingLine.slice(part[0].length);
      }
    }
    // Push the last line because it doesn't end in a $
    grid.push(currentLine);
    maxRowWidth = Math.max(rowWidth, maxRowWidth);
    // Pad the rows with zeroes
    for (const [index, row] of grid.entries()) {
      grid[index] = row.concat(Array(maxRowWidth - row.length).fill(0));
    }

    /*
     * If fullsize is set, pad grid some more
     * until the size of the pattern is the same as gridSize
     */
    if (fullsize) {
      if (gridSize === null || gridSize === undefined) {
        throw new TypeError("gridSize must be this.gridSize");
      }
      const padLeft = Math.floor((gridSize - maxRowWidth) / 2) + xOffset;
      const padRight = Math.ceil((gridSize - maxRowWidth) / 2) - xOffset;
      const padTop = Math.floor((gridSize - grid.length) / 2) + yOffset;
      const padBottom = Math.ceil((gridSize - grid.length) / 2) - yOffset;
      for (const [index, row] of grid.entries()) {
        /*
         * The Math.max(..., 0) is there to stop errors
         * from occurring due to Array(negativeNumber).
         * However, the grid needs to be sliced anyway
         * because otherwise it will be bigger than this.gridSize.
         */
        grid[index] = Array(Math.max(padLeft, 0)).fill(0).concat(
          row.slice(Math.max(-padLeft, 0), Math.max(-padLeft, 0) + gridSize),
          Array(Math.max(padRight, 0)).fill(0),
        );
      }
      for (let i = 0; i < padTop; ++i) {
        grid.unshift(new Array(gridSize).fill(0));
      }
      for (let i = 0; i < padBottom; ++i) {
        grid.push(new Array(gridSize).fill(0));
      }
      grid = grid.slice(Math.max(-padTop, 0), Math.max(-padTop, 0) + gridSize);
      output.centerX = (gridSize - (padRight - padLeft)) / 2 + xOffset;
      output.centerY = (gridSize - (padBottom - padTop)) / 2 + yOffset;
    } else {
      output.centerX = output.width / 2 + xOffset;
      output.centerY = output.height / 2 + yOffset;
    }
    output.pattern = grid;
    output.width = fullsize ? gridSize : maxRowWidth;
    output.height = grid.length;
    return output;
  }

  static rotate(pattern, rotation = 0, flipX = false) {
    const height = pattern.length;
    const width = height === 0 ? 0 : pattern[0].length;

    let newPattern;
    let xOffset;
    let yOffset;
    let newWidth;
    let newHeight;

    if (rotation === 1 || rotation === 3) {
      // Annoying rotation
      newWidth = height;
      newHeight = width;

      // Find the pivot point and offset
      let pivotX = (width - 1) / 2;
      let pivotY = (height - 1) / 2;
      if (rotation === 1) {
        if (width % 2 === 0 && height % 2 === 1) {
          pivotX -= 0.5;
        } else if (width % 2 === 1 && height % 2 === 0) {
          pivotX += 0.5;
        }
        xOffset = (pivotX + pivotY - (height - 1)) | 0;
        yOffset = (pivotY - pivotX) | 0;
      } else {
        if (width % 2 === 0 && height % 2 === 1) {
          pivotY += 0.5;
        } else if (width % 2 === 1 && height % 2 === 0) {
          pivotY -= 0.5;
        }
        xOffset = (pivotX - pivotY) | 0;
        yOffset = (pivotX + pivotY - (width - 1)) | 0;
      }

      // Generate newPattern
      newPattern = [];
      for (let newRow = 0; newRow < width; ++newRow) {
        newPattern.push(Array(height));
      }
      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          let newX;
          let newY;
          if (rotation === 1) {
            newX = (((pivotY - y) + pivotX) | 0) - xOffset;
            newY = (((x - pivotX) + pivotY) | 0) - yOffset;
          } else {
            newX = (((y - pivotY) + pivotX) | 0) - xOffset;
            newY = (((pivotX - x) + pivotY) | 0) - yOffset;
          }
          newPattern[newY][newX] = pattern[y][x];
        }
      }
    } else if (rotation === 2) {
      // Easier rotation
      xOffset = 0;
      yOffset = 0;
      newWidth = width;
      newHeight = height;

      newPattern = [];
      for (let newRow = 0; newRow < width; ++newRow) {
        newPattern.push(Array(height));
      }
      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          const newX = width - 1 - x;
          const newY = height - 1 - y;
          newPattern[newY][newX] = pattern[y][x];
        }
      }
    } else if (rotation === 0) {
      // No rotation
      xOffset = 0;
      yOffset = 0;
      newWidth = width;
      newHeight = height;
      newPattern = structuredClone(pattern);
    }

    // Flip newPattern
    if (flipX) {
      for (let y = 0; y < newHeight; ++y) {
        newPattern[y].reverse();
      }
    }

    return {
      "pattern": newPattern,
      "x": xOffset,
      "y": yOffset,
      "width": newWidth,
      "height": newHeight,
    };
  }

  compilePattern() {
    this.board = Array(this.gridSize * this.gridSize).fill(0);
    this.cellTypes = Array(this.gridSize * this.gridSize).fill(0);
    /*
     * Cell types:
     * 0 = normal
     * 1 = delete
     * 2 = create
     * 3 = important
     * 4 = unchangeable
     * 5 = connecting N
     * 6 = connecting NE
     * 7 = connecting E
     * 8 = connecting SE
     * 9 = connecting S
     * 10 = connecting SW
     * 11 = connecting W
     * 12 = connecting NW
     */
    for (let y = 0; y < this.gridSize; ++y) {
      for (let x = 0; x < this.gridSize; ++x) {
        const cell = this.pattern[y][x];
        const boardPosition = y * this.gridSize + x;
        this.board[boardPosition] = cell & 1;
        this.cellTypes[boardPosition] = cell >> 1;
      }
    }
    for (let object = 0; object < this.objects.length; ++object) {
      this.bakeObject(object, false, false);
    }
    this.#changedPattern = true;
    this.#backSnapshots = {"0": this.#fullBoard};

    this.#updateStats();
  }

  get #fullBoard() {
    const output = [];
    for (let i = 0; i < this.board.length; ++i) {
      output.push((this.cellTypes[i] << 1) | this.board[i]);
    }
    return output;
  }

  set #fullBoard(value) {
    throw new TypeError("Can't assign to #fullBoard");
  }

  pageToBoardCoordinates(x, y) {
    const canvas = this.canvas;
    const boundingBox = canvas.getBoundingClientRect();
    const cellSize = this.zoom;
    const trueXOffset = (
      (this.xOffset + this.patternCenterX) * cellSize - canvas.width / 2
    ) | 0;
    const trueYOffset = (
      (this.yOffset + this.patternCenterY) * cellSize - canvas.height / 2
    ) | 0;
    const outputX = Math.floor((x - boundingBox.x + trueXOffset) / cellSize);
    const outputY = Math.floor((y - boundingBox.y + trueYOffset) / cellSize);
    return {"x": outputX, "y": outputY};
  }

  boardToCanvasCoordinates(i, j) {
    const canvas = this.canvas;
    const cellSize = this.zoom;
    const trueXOffset = (
      (this.xOffset + this.patternCenterX) * cellSize - canvas.width / 2
    ) | 0;
    const trueYOffset = (
      (this.yOffset + this.patternCenterY) * cellSize - canvas.height / 2
    ) | 0;
    const outputX = (i * cellSize - trueXOffset) | 0;
    const outputY = (j * cellSize - trueYOffset) | 0;
    return {"x": outputX, "y": outputY};
  }

  editCells(cellArray, changeTo, actionParameters) {
    if (cellArray.length === 0) {
      return undefined;
    }

    const changeToIsArray = Array.isArray(changeTo);
    const changeToIsFunction = changeTo instanceof Function;
    if (this.generation === 0) {
      for (let i = 0; i < cellArray.length; ++i) {
        const [x, y] = cellArray[i];
        let newCell;
        if (changeToIsArray) {
          newCell = changeTo[i];
        } else if (changeToIsFunction) {
          newCell = changeTo(this.pattern[y][x], x, y);
        } else {
          newCell = changeTo;
        }
        this.pattern[y][x] = newCell;
      }
      this.compilePattern();
    } else {
      for (let i = 0; i < cellArray.length; ++i) {
        const [x, y] = cellArray[i];
        const cellPosition = y * this.gridSize + x;
        const oldCell
          = (this.cellTypes[cellPosition] >> 1) | this.board[cellPosition];
        let newCell;
        if (changeToIsArray) {
          newCell = changeTo[i];
        } else if (changeToIsFunction) {
          newCell = changeTo(oldCell, x, y);
        } else {
          newCell = changeTo;
        }
        this.board[cellPosition] = newCell & 1;
        this.cellTypes[cellPosition] = newCell >> 1;
      }
      this.#safeBackGenerations.add(this.generation);
    }
    this.#changedPattern = true;
    this.#backSnapshots[this.generation] = this.#fullBoard;

    actionParameters ??= ["cell", 1, 0, {"control1": (a) => Math.min(a, 1)}];
    if (Array.isArray(actionParameters) && actionParameters.length) {
      this.setState(...actionParameters);
    }

    this.#updateStats();

    return undefined;
  }

  extractSelectionToObject(destructive = true) {
    const pattern = [];
    for (let y = this.selection.top; y <= this.selection.bottom; ++y) {
      pattern.push([]);
      for (let x = this.selection.left; x <= this.selection.right; ++x) {
        const boardPosition = y * this.gridSize + x;
        let newCell;
        if (this.generation === 0) {
          newCell = this.pattern[y][x];
        } else {
          newCell
            = (this.cellTypes[boardPosition] << 1) | this.board[boardPosition];
        }
        pattern[pattern.length - 1].push(newCell);
      }
      if (destructive && this.generation === 0) {
        this.pattern[y].fill(0, this.selection.left, this.selection.right + 1);
      }
    }
    this.compilePattern();
    this.objects.unshift({
      "pattern": pattern,
      "x": this.selection.left,
      "y": this.selection.top,
      "width": this.selection.right + 1 - this.selection.left,
      "height": this.selection.bottom + 1 - this.selection.top,
      "moving": false,
      "selected": false,
    });
    // DEBUG
    console.log(this.objects);
    this.#changedPattern = true;
  }

  bakeObject(index = 0, destructive = false, updatePattern = true) {
    const object = this.objects[index];

    function getNewCell(oldCell, cellX, cellY) {
      const oldBoard = oldCell & 1;
      const oldCellType = oldCell >> 1;

      const patternX = cellX - object.x;
      const patternY = cellY - object.y;
      const patternCell = object.pattern[patternY][patternX];
      const patternBoard = patternCell & 1;
      const patternCellType = patternCell >> 1;

      const newBoard = oldBoard | patternBoard;
      const newCellType = patternCellType || oldCellType;
      return (newCellType << 1) | newBoard;
    }

    if (this.generation === 0 && updatePattern) {
      for (let y = object.y; y < object.y + object.height; ++y) {
        for (let x = object.x; x < object.x + object.width; ++x) {
          const newCell = getNewCell(this.pattern[y][x], x, y);
          this.pattern[y][x] = newCell;
          const cellPosition = y * this.gridSize + x;
          this.board[cellPosition] = newCell & 1;
          this.cellTypes[cellPosition] = newCell >> 1;
        }
      }
    } else {
      for (let y = object.y; y < object.y + object.height; ++y) {
        for (let x = object.x; x < object.x + object.width; ++x) {
          const cellPosition = y * this.gridSize + x;
          const oldCell
            = (this.cellTypes[cellPosition] << 1) | this.board[cellPosition];
          const newCell = getNewCell(oldCell, x, y);
          this.board[cellPosition] = newCell & 1;
          this.cellTypes[cellPosition] = newCell >> 1;
        }
      }
      this.#safeBackGenerations.add(this.generation);
    }
    if (destructive) {
      this.objects.splice(index, 1);
    }
    this.#changedPattern = true;
    this.#backSnapshots[this.generation] = this.#fullBoard;
    this.#updateStats();
  }

  getSelection() {
    for (const object of this.objects) {
      if (object.selected && !object.moving) {
        return {
          "left": object.x,
          "right": object.x + object.width,
          "top": object.y,
          "bottom": object.y + object.height,
          "type": "object",
          "visible": this.generation === 0,
        };
      }
    }
    return {
      "left": this.selection.left,
      "right": this.selection.right + 1,
      "top": this.selection.top,
      "bottom": this.selection.bottom + 1,
      "type": "selection",
      "visible": this.selection.visible,
    };
  }

  forceUpdate() {
    this.#changedPattern = true;
  }

  get population() {
    let population = 0;
    for (let i = 0; i < this.board.length; ++i) {
      population += this.board[i];
    }
    return population;
  }

  set population(value) {
    throw new TypeError("Can't assign to population");
  }

  get boundingBox() {
    let leftX = this.gridSize;
    let rightX = 0;
    let topY = this.gridSize;
    let bottomY = 0;
    let x, y;
    for (let i = 0; i < this.board.length; ++i) {
      if (this.board[i]) {
        x = i % this.gridSize;
        y = (i / this.gridSize) | 0;
        leftX = Math.min(x, leftX);
        rightX = Math.max(x, rightX);
        topY = Math.min(y, topY);
        /*
         * Due to the scanning order we're using
         * (left to right, then top to bottom),
         * y always be more than the previous bottomY.
         */
        bottomY = y;
      }
    }
    const width = Math.max(0, rightX - leftX + 1);
    const height = Math.max(0, bottomY - topY + 1);
    return [width, height];
  }

  set boundingBox(value) {
    throw new TypeError("Can't assign to boundingBox");
  }

  setState(action, value1, value2, options = {}) {
    const control1 = options.control1 ?? ((a) => a);
    const control2 = options.control2 ?? ((b) => b);
    const mergeable = options.mergeable ?? true;
    const endMerge = options.endMerge ?? false;

    /*
     * Remove the other branch of undos, if necessary.
     * This can happen if you undo something and then do an action normally.
     */
    if (this.#currentUndoState < this.#undoSnapshots.length - 1) {
      this.#undoSnapshots.splice(this.#currentUndoState + 1);
    }
    // Make the state and push it into the snapshot array.
    this.#undoSnapshots.push({
      "action": action,
      // Values get merged when the actions are the same.
      "value1": value1,
      "value2": value2,
      /*
       * cancelable stops nested merging from happening.
       * Example: Move up, step forward, step backward, move down.
       * The steps should merge, but not the moves.
       */
      "cancelable": mergeable,
      "board": this.#fullBoard,
      "generation": this.generation,
      "pattern": structuredClone(this.pattern),
      "objects": structuredClone(this.objects),
      "safeBackGenerations": structuredClone(this.#safeBackGenerations),
    });
    ++this.#currentUndoState;

    // Merge the states, if possible.
    const unmergedState = this.#undoSnapshots[this.#undoSnapshots.length - 3];
    const previousState = this.#undoSnapshots[this.#undoSnapshots.length - 2];
    const newState = this.#undoSnapshots[this.#undoSnapshots.length - 1];
    if (previousState && previousState.cancelable
      && action === previousState.action) {
      if (unmergedState) {
        unmergedState.cancelable = false;
      }
      newState.value1 = control1(newState.value1 + previousState.value1);
      newState.value2 = control2(newState.value2 + previousState.value2);
      // Remove previousState.
      this.#undoSnapshots.splice(this.#undoSnapshots.length - 2, 1);
      --this.#currentUndoState;
      if (newState.value1 === 0 && newState.value2 === 0
      // Edge case if this.#maxUndoSnapshots is really low
        && this.#undoSnapshots.length > 1) {
        this.#undoSnapshots.pop();
        --this.#currentUndoState;
      }
    }
    if (endMerge && this.#undoSnapshots.length > 0) {
      this.#undoSnapshots[this.#undoSnapshots.length - 1].cancelable = false;
    }
    // If the array is longer than #maxUndoSnapshots, remove the first element.
    if (this.#undoSnapshots.length >= this.#maxUndoSnapshots) {
      this.#undoSnapshots.shift();
      --this.#currentUndoState;
    }

    // Run the state handler
    const stateHandler = this.#statCounters.stateHandler;
    if (stateHandler) {
      stateHandler(this);
    }
  }

  #getState(index = null) {
    index ??= this.#currentUndoState;
    const snapshot = this.#undoSnapshots[index];
    this.board = snapshot.board.map((x) => x & 1);
    this.cellTypes = snapshot.board.map((x) => x >> 1);
    this.generation = snapshot.generation;
    this.pattern = structuredClone(snapshot.pattern);
    this.objects = structuredClone(snapshot.objects);
    this.#safeBackGenerations = structuredClone(this.#safeBackGenerations);
  }

  canUndo() {
    return this.#currentUndoState > 0;
  }

  canRedo() {
    return this.#currentUndoState < this.#undoSnapshots.length - 1;
  }

  undo() {
    if (this.canUndo()) {
      --this.#currentUndoState;
      this.#getState();
      this.#updateStats();
      this.#changedPattern = true;
    }
  }

  redo() {
    if (this.canRedo()) {
      ++this.#currentUndoState;
      this.#getState();
      this.#updateStats();
      this.#changedPattern = true;
    }
  }

  stepForward() {
    ++this.generation;
    this.#changedPattern = true;
    this.board = this.board.map((currentCell, index, oldBoard) => {
      const x = index % this.gridSize;
      const y = index / this.gridSize | 0;
      let neighbors = 0;
      for (const [dx, dy] of [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1],
      ]) {
        const cx = x + dx;
        const cy = y + dy;
        if (cx >= 0 && cx < this.gridSize
          && cy >= 0 && cy < this.gridSize) {
          neighbors += oldBoard[cy * this.gridSize + cx];
        }
      }
      if ((currentCell && neighbors === 2) || neighbors === 3) {
        return 1;
      } else {
        return 0;
      }
    });
    this.setState("step", 1, 0);
    this.#updateStats();
    // Update snapshots
    this.#backSnapshots[this.generation] = this.#fullBoard;
    const oldGeneration = this.generation - this.#maxBackSnapshots;
    if (!this.#safeBackGenerations.has(oldGeneration)) {
      delete this.#backSnapshots[oldGeneration];
    }
  }

  play() {
    this.playing = true;
    this.#lastTickTime = performance.now();
  }

  pause() {
    this.playing = false;
  }

  resetToGeneration0() {
    const lastGeneration = this.generation;
    this.playing = false;
    this.generation = 0;
    this.#changedPattern = true;
    this.board = this.#backSnapshots[0].map((x) => x & 1);
    this.cellTypes = this.#backSnapshots[0].map((x) => x >> 1);
    this.setState("step", -lastGeneration, 0);
    this.#backSnapshots = {"0": this.#backSnapshots[0]};
    this.#safeBackGenerations.clear();
    this.#safeBackGenerations.add(0);
    this.#updateStats();
  }

  stepBack() {
    // We can't step back from generation 0
    if (this.generation <= 0) {
      return undefined;
    }
    this.playing = false;
    this.#changedPattern = true;
    const newGeneration = this.generation - 1;
    const snapshot = this.#backSnapshots[newGeneration];
    if (snapshot) {
      this.board = snapshot.map((x) => x & 1);
      this.cellTypes = snapshot.map((x) => x >> 1);
      delete this.#backSnapshots[this.generation];
      this.generation = newGeneration;
      this.setState("step", -1, 0);
      this.#updateStats();
    } else {
      /*
       * We couldn't find a snapshot,
       * so we have to reset to the last safe generation
       */
      const safeGeneration = Math.max(...this.#safeBackGenerations);
      const lastGeneration = this.generation;
      this.generation = safeGeneration;
      this.#recalculating = true;
      this.board = this.#backSnapshots[safeGeneration].map((x) => x & 1);
      this.cellTypes = this.#backSnapshots[safeGeneration].map((x) => x >> 1);
      this.setState("step", safeGeneration - lastGeneration, 0);
      // Then step forward until we get to the target generation
      this.#stepForwardFast(
        newGeneration - safeGeneration,
        () => {
          this.#recalculating = false;
          this.#changedPattern = true;
          this.#updateStats();
        },
      );
    }
  }

  #stepForwardFast(iterations, callback) {
    /*
     * Adapted from https://stackoverflow.com/a/719599 by Helgi,
     * licensed under CC BY-SA 4.0
     */
    const iterationsPerBatch = 4;
    for (let i = 0; i < iterationsPerBatch && i < iterations; ++i) {
      this.stepForward();
    }
    iterations -= iterationsPerBatch;
    if (iterations > 0) {
      setTimeout(() => this.#stepForwardFast(iterations, callback), 0);
    } else {
      callback();
    }
  }

  moveTo(x, y, zoom) {
    this.xOffset = x;
    this.yOffset = y;
    this.zoom = CGoL.#roundZoom(zoom);
    this.#changedCamera = true;
  }

  static #roundZoom(zoom) {
    if (zoom < 4) {
      return zoom;
    } else {
      const fudgeFactor = CGoL.#zoomFudgeFactor(zoom);
      return Math.round(zoom * fudgeFactor) / fudgeFactor;
    }
  }

  static #gridCanvasSize(zoom) {
    if (zoom < 4) {
      // It doesn't make sense to draw a grid if it would obscure the cells
      return 1;
    } else {
      return zoom * CGoL.#zoomFudgeFactor(zoom);
    }
  }

  static #zoomFudgeFactor(zoom) {
    if (zoom < 4) {
      return null;
    } else if (zoom < 8) {
      return 16;
    } else if (zoom < 16) {
      return 8;
    } else {
      return 4;
    }
  }

  static #convertToString(number, short = false) {
    let output;
    if (number >= 10 ** 18) {
      output = number.toExponential(short ? 2 : 5);
    } else if (!short || number < 10_000) {
      const text = number.toString();
      output = "";
      for (let i = text.length; i > 0; i -= 3) {
        output = text.slice(Math.max(0, i - 3), i)
          + (output ? "," : "")
          + output;
      }
    } else {
      // short && number >= 10_000 && number < 10 ** 18
      /*
       * The toString method used here is more reliable
       * than Math.floor(Math.log10(number) / 3)
       * for numbers very close to the boundary, like 10**18 - 4031.
       */
      const log1000 = (number.toString().length - 1) / 3;
      const letter = "-KMBTQ"[log1000];
      const digits = (number / 1000 ** log1000).toPrecision(3);
      output = digits + letter;
    }
    return output;
  }

  #updateStats() {
    // Update the generation
    const generationElement = this.#statCounters.generation;
    if (generationElement) {
      const generationText = CGoL.#convertToString(this.generation, true);
      generationElement.replaceChildren(`Gen. ${generationText}`);
      generationElement.ariaLabel = `Generation ${generationText}`;
    }
    // Update the population
    const populationElement = this.#statCounters.population;
    if (populationElement) {
      const populationText = CGoL.#convertToString(this.population);
      populationElement.replaceChildren(
        this.population === 1 ? "1 cell" : `${populationText} cells`,
      );
    }
    // Update the bounding box
    const boundingBoxElement = this.#statCounters.boundingBox;
    if (boundingBoxElement) {
      const [boundingWidth, boundingHeight] = this.boundingBox;
      const boundingWidthText = CGoL.#convertToString(boundingWidth);
      const boundingHeightText = CGoL.#convertToString(boundingHeight);
      boundingBoxElement.replaceChildren(
        `${boundingWidthText}\u00D7${boundingHeightText}`,
      );
      boundingBoxElement.ariaLabel
        = `Bounding box: ${boundingWidthText} by ${boundingHeightText}`;
    }
    // Run the state handler
    const stateHandler = this.#statCounters.stateHandler;
    if (stateHandler) {
      stateHandler(this);
    }
    // Run the tick handler
    const tickHandler = this.#statCounters.tickHandler;
    if (tickHandler) {
      tickHandler(this);
    }
  }

  draw(options = {}, timestamp) {
    if (timestamp === null || timestamp === undefined) {
      this.#drawInner(options);
    } else {
      const selectionVisible = this.objects.some((object) => object.selected)
        || this.selection.visible;
      const cacheExpired = timestamp - this.#lastDrawTime >= 1000
        || selectionVisible;
      // TODO: Make the cache interval changeable using the speed slider
      const changedSize = this.canvas.width !== this.#lastWidth
        || this.canvas.height !== this.#lastHeight;
      if (this.playing) {
        const timeSinceTick = timestamp - this.#lastTickTime;
        const timeBetweenTicks = 1000 / this.speed;
        const stepForwardNeeded = timeSinceTick >= timeBetweenTicks;
        if (stepForwardNeeded) {
          this.stepForward();
          this.#lastTickTime += timeBetweenTicks;
        }
      }
      if (cacheExpired
        || changedSize
        || this.#changedCamera
        || this.#changedPattern
        || this.#recalculating) {
        if (cacheExpired) {
          this.#lastDrawTime = timestamp;
        }
        if (changedSize) {
          this.#lastWidth = this.canvas.width;
          this.#lastHeight = this.canvas.height;
        }
        if (this.#changedCamera) {
          this.#changedCamera = false;
          /*
           * Because the camera changed,
           * the gridlines need to be updated as well
           */
          const gridCanvasSize = CGoL.#gridCanvasSize(this.zoom);
          this.#gridCanvas.width = gridCanvasSize;
          this.#gridCanvas.height = gridCanvasSize;
        }
        this.#changedPattern = false;
        this.#drawInner(options);
      } else {
        this.#ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.#ctx.putImageData(this.#cachedPicture, 0, 0);
      }
      this.#lastAnimationFrame = requestAnimationFrame(
        (t) => this.draw(options, t),
      );
    }
  }

  stopDrawing() {
    cancelAnimationFrame(this.#lastAnimationFrame);
  }

  #drawInner(options = {}) {
    const colorblind = options.colorblind ?? false;
    const canUseSymbols = colorblind && this.zoom >= 6;
    const showGrid = options.grid ?? true;
    const canUseGrid = showGrid && this.zoom >= 6;

    // DEBUG
    // eslint-disable-next-line no-unused-vars
    const startTime = performance.now();

    const canvas = this.canvas;
    const ctx = this.#ctx;
    const gridCanvas = this.#gridCanvas;
    const gridCtx = this.#gridCtx;
    const gridSize = this.gridSize;
    const cellSize = this.zoom;
    const trueXOffset = (
      (this.xOffset + this.patternCenterX) * cellSize - canvas.width / 2
    ) | 0;
    const trueYOffset = (
      (this.yOffset + this.patternCenterY) * cellSize - canvas.height / 2
    ) | 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the border
    let drawLeftX = Math.floor(trueXOffset / cellSize);
    let drawRightX = Math.ceil((trueXOffset + canvas.width) / cellSize);
    let drawTopY = Math.floor(trueYOffset / cellSize);
    let drawBottomY = Math.ceil((trueYOffset + canvas.height) / cellSize);
    const borderVisible = (
      drawLeftX < 0
      || drawRightX >= gridSize
      || drawTopY < 0
      || drawBottomY >= gridSize
    );
    if (canUseSymbols && borderVisible) {
      gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
      gridCtx.fillStyle = "#0A397F";
      gridCtx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);
      const originalX
        = Math.floor(trueXOffset / cellSize) * cellSize - trueXOffset;
      const originalY
        = Math.floor(trueYOffset / cellSize) * cellSize - trueYOffset;
      for (let y = originalY; y < gridCanvas.height; y += cellSize) {
        for (let x = originalX; x < gridCanvas.width; x += cellSize) {
          const leftX = x | 0;
          const rightX = (x + cellSize) | 0;
          const width = rightX - leftX;
          const topY = y | 0;
          const bottomY = (y + cellSize) | 0;
          const height = bottomY - topY;
          gridCtx.drawImage(images["cell-icon-8"], leftX, topY, width, height);
        }
      }
      const borderPattern = ctx.createPattern(gridCanvas, "repeat");
      ctx.fillStyle = borderPattern;
    } else {
      ctx.fillStyle = "#0A397F";
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    const editableLeftX = (-trueXOffset) | 0;
    const editableRightX = (-trueXOffset + gridSize * cellSize) | 0;
    const editableWidth = editableRightX - editableLeftX;
    const editableTopY = (-trueYOffset) | 0;
    const editableBottomY = (-trueYOffset + gridSize * cellSize) | 0;
    const editableHeight = editableBottomY - editableTopY;
    ctx.fillRect(editableLeftX, editableTopY, editableWidth, editableHeight);

    // Draw the cells
    drawLeftX = Math.max(0, drawLeftX);
    drawRightX = Math.min(gridSize, drawRightX);
    drawTopY = Math.max(0, drawTopY);
    drawBottomY = Math.min(gridSize, drawBottomY);
    const movingObjects = this.objects.filter((obj) => obj.moving);
    for (let i = drawTopY; i < drawBottomY; ++i) {
      for (let j = drawLeftX; j < drawRightX; ++j) {
        const cellPosition = i * gridSize + j;
        let cell = this.board[cellPosition];
        let cellType = this.cellTypes[cellPosition];
        for (const obj of movingObjects) {
          if (j >= obj.x && j < obj.x + obj.width
            && i >= obj.y && i < obj.y + obj.height) {
            const objectCell = obj.pattern[i - obj.y][j - obj.x];
            cell |= objectCell & 1;
            cellType = objectCell >> 1 || cellType;
          }
        }
        const cellTypeId = (cellType << 1) | cell;
        switch (cellTypeId) {
          case 0:
            // We don't need to be drawing empty cells
            continue;
          case 1:
            ctx.fillStyle = "#FFFFFF";
            break;
          case 2:
            ctx.fillStyle = "#76160A";
            break;
          case 3:
            ctx.fillStyle = "#FF978A";
            break;
          case 4:
            ctx.fillStyle = "#08631A";
            break;
          case 5:
            ctx.fillStyle = "#33FF5C";
            break;
          case 6:
            ctx.fillStyle = "#635B08";
            break;
          case 7:
            ctx.fillStyle = "#FFEE33";
            break;
          case 8:
            ctx.fillStyle = "#0A397F";
            break;
          case 9:
            ctx.fillStyle = "#8FC9FF";
            break;
          case 10:
          case 12:
          case 14:
          case 16:
          case 18:
          case 20:
          case 22:
          case 24:
            ctx.fillStyle = "#640A7F";
            break;
          case 11:
          case 13:
          case 15:
          case 17:
          case 19:
          case 21:
          case 23:
          case 25:
            ctx.fillStyle = "#E799FF";
            break;
        }
        const cellLeftX = (j * cellSize - trueXOffset) | 0;
        const cellRightX = ((j + 1) * cellSize - trueXOffset) | 0;
        const cellWidth = cellRightX - cellLeftX;
        const cellTopY = (i * cellSize - trueYOffset) | 0;
        const cellBottomY = ((i + 1) * cellSize - trueYOffset) | 0;
        const cellHeight = cellBottomY - cellTopY;
        ctx.fillRect(cellLeftX, cellTopY, cellWidth, cellHeight);
        if (canUseSymbols && cellType) {
          /*
           * Explanation of the bare cellType:
           * cellTypeId has to be >= 2 in order to use symbols.
           * This implies cellType >= 1, meaning cellType is truthy.
           */
          ctx.drawImage(
            images[`cell-icon-${cellTypeId}`],
            cellLeftX,
            cellTopY,
            cellWidth,
            cellHeight,
          );
        }
      }
    }

    // Draw the grid
    if (canUseGrid) {
      gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
      const gridColor = Math.round(180 - 2000 / (cellSize + 10));
      gridCtx.strokeStyle = `rgb(${gridColor}, ${gridColor}, ${gridColor})`;
      // Modulo doesn't work like this with negative numbers
      let lineX = Math.ceil(trueXOffset / cellSize) * cellSize - trueXOffset;
      while (lineX < gridCanvas.width) {
        gridCtx.beginPath();
        gridCtx.moveTo((lineX | 0) + 0.5, 0);
        gridCtx.lineTo((lineX | 0) + 0.5, gridCanvas.height);
        gridCtx.stroke();
        lineX += cellSize;
      }
      let lineY = Math.ceil(trueYOffset / cellSize) * cellSize - trueYOffset;
      while (lineY < gridCanvas.height) {
        gridCtx.beginPath();
        gridCtx.moveTo(0, (lineY | 0) + 0.5);
        gridCtx.lineTo(gridCanvas.width, (lineY | 0) + 0.5);
        gridCtx.stroke();
        lineY += cellSize;
      }
      // Put the grid on the main canvas
      const pattern = ctx.createPattern(gridCanvas, "repeat");
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw the selection
    const selectionPosition = this.getSelection();
    let selectionColor;
    if (selectionPosition.type === "object") {
      selectionColor = "#D080FF";
    } else if (selectionPosition.type === "selection") {
      selectionColor = "#FFF080";
    } else {
      selectionColor = "#00000000";
    }
    if (selectionPosition.visible) {
      const selectionLeftX
        = ((selectionPosition.left * cellSize - trueXOffset) | 0) + 0.5;
      const selectionRightX
        = ((selectionPosition.right * cellSize - trueXOffset) | 0) + 0.5;
      const selectionWidth = selectionRightX - selectionLeftX;
      const selectionTopY
        = ((selectionPosition.top * cellSize - trueYOffset) | 0) + 0.5;
      const selectionBottomY
        = ((selectionPosition.bottom * cellSize - trueYOffset) | 0) + 0.5;
      const selectionHeight = selectionBottomY - selectionTopY;
      ctx.fillStyle = "#40404040";
      ctx.fillRect(
        selectionLeftX, selectionTopY, selectionWidth, selectionHeight,
      );

      const IDEAL_DASH_WIDTH_PX = Math.max(1.7 * this.zoom ** 0.5, 1);
      const ROTATIONS_PER_SECOND = 1.5;
      const selectionPerimeter = 2 * (
        (selectionRightX - selectionLeftX) + (selectionBottomY - selectionTopY)
      );
      const dashesInSelection = Math.max(
        Math.round(selectionPerimeter / (2 * IDEAL_DASH_WIDTH_PX)), 1,
      );
      const dashWidthPx = selectionPerimeter / dashesInSelection / 2;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "black";
      ctx.strokeRect(
        selectionLeftX, selectionTopY, selectionWidth, selectionHeight,
      );
      ctx.strokeStyle = selectionColor;
      ctx.setLineDash([dashWidthPx, dashWidthPx]);
      ctx.lineDashOffset
        = (performance.now() / 1000 * ROTATIONS_PER_SECOND * dashWidthPx)
          % (2 * dashWidthPx);
      ctx.strokeRect(
        selectionLeftX, selectionTopY, selectionWidth, selectionHeight,
      );
      ctx.setLineDash([]);
      ctx.lineJoin = "miter";
    }

    /*
     * Draw a spinner (and a rectangle that covers the screen)
     * when the board is recalculating
     */
    if (this.#recalculating) {
      // Translucent rectangle
      const coverOpacity = 0.5;
      ctx.fillStyle = `rgba(0 0 0 / ${coverOpacity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Spinner
      const currentTime = performance.now() / 1000;
      const SPINS_PER_SECOND = 0.8;
      const SPINNER_ANGLE_FRACTION = 0.8;
      ctx.strokeStyle = "white";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        40,
        currentTime * SPINS_PER_SECOND * 2 * Math.PI,
        (currentTime * SPINS_PER_SECOND + SPINNER_ANGLE_FRACTION) * 2 * Math.PI,
        false,
      );
      ctx.stroke();
    }

    this.#cachedPicture = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
}

export {CGoL};
