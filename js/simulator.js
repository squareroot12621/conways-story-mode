import {createMainMenu} from "./main-menu.js";
import {CGoL} from "./cgol.js";
import {createElement, updateRoot, throttle, objectData} from "./utilities.js";

let cgolObject = null;

function createCgolSimulator(sandbox, objective = null, library = null) {
  // DEBUG
  library = [
    {
      "id": "blinker",
      "count": 1,
      "data": {
        "pattern": "A$A$A",
        "name": {
          "en-US": "Blinker",
        },
        "type": "oscillator",
        "period": 2,
        "discoverer": "John Conway",
        "discoverDate": [1969, null, null],
        "addToSandboxLibrary": [1, 3],
      },
    },
    {
      "id": "glider",
      "count": 2,
      "data": {
        "pattern": ".A$2.A$3A",
        "name": {
          "en-US": "Glider",
        },
        "type": "spaceship",
        "period": 4,
        "displacement": [1, 1],
        "discoverer": "Richard K. Guy",
        "discoverDate": [1969, 11, null],
        "addToSandboxLibrary": false,
      },
    },
  ];

  const sidebar = createSimulatorSidebar(sandbox, objective, library);
  const simulator = createSimulatorMain();

  const simulatorWrapper = createElement(
    "div", [sidebar, simulator], {"class": "simulator-wrapper"},
  );
  updateRoot(simulatorWrapper);

  resizeSimulator();

  createEventHandlers(sandbox, library);
}


function createSimulatorSidebar(sandbox, objective = null, library = null) {
  const backIcon = createElement(
    "span", "arrow_back", {"class": "icon", "aria-hidden": true},
  );
  const backButton = createElement(
    "button", [backIcon, " Back"], {"class": "back-button", "type": "button"},
  );
  const closeMenuIcon = createElement(
    "span", "arrow_left", {"class": "icon", "aria-hidden": true},
  );
  const closeMenuButton = createElement("button", closeMenuIcon, {
    "class": "invisible-button",
    "aria-label": "Close sidebar",
    "type": "button",
  });

  let missionWrapper;
  if (objective !== null) {
    const missionIcon = createElement(
      "span", "list_alt", {"class": "icon", "aria-hidden": true},
    );
    const missionHeading = createElement("h3", [missionIcon, " Mission"]);
    const missionText = [];
    for (const line of objective.split("\n")) {
      missionText.push(createElement("p", line));
    }
    missionWrapper = createElement(
      "div",
      [missionHeading].concat(missionText),
      {"class": "simulator-mission-wrapper"},
    );
  }
  if (sandbox) {
    // TODO: Change library to everything you've learned so far
  } else {
    library ??= [];
  }
  const libraryIcon = createElement(
    "span", "menu_book", {"class": "icon", "aria-hidden": true},
  );
  const libraryHeading = createElement("h3", [libraryIcon, " Library"]);
  let libraryList;
  if (library.length) {
    const libraryItems = [];
    for (const object of library) {
      // TODO: Add support for other languages
      const itemName = `${object.count}\u00D7 ${object.data.name["en-US"]} `;
      const addObjectButton = createElement("button", "add", {
        "class": "simulator-add-object simulator-toolbar-item",
        "data-object": object.id,
        "data-count": object.count,
      });
      libraryItems.push(createElement("li", [itemName, addObjectButton]));
    }
    libraryList = createElement(
      "ul", libraryItems, {"class": "simulator-library-list"},
    );
  } else {
    libraryList = createElement(
      "p", "No objects.", {"class": "simulator-library-empty"},
    );
  }
  const libraryWrapper = createElement(
    "div",
    [libraryHeading].concat(libraryList),
    {"class": "simulator-library-wrapper"},
  );

  const sidebarTop = createElement(
    "div", [backButton, closeMenuButton], {"class": "simulator-sidebar-top"},
  );

  const sidebarMain = createElement(
    "div",
    objective === null ? [libraryWrapper] : [missionWrapper, libraryWrapper],
    {"class": "simulator-sidebar-main"},
  );

  let hintWrapper;
  // Sandbox doesn't have any hints
  if (!sandbox) {
    const lightbulbIcon = createElement(
      "span", "lightbulb2", {"class": "icon", "aria-hidden": true},
    );
    const hintButton = createElement("button", lightbulbIcon, {
      "class": "invisible-button",
      "aria-label": "Show hint",
      "type": "button",
    });
    const hintTooltip = createElement(
      "div", "Need a hint?", {"class": "hint-tooltip"},
    );
    hintWrapper = createElement(
      "div", [hintButton, hintTooltip], {"class": "hint-button"},
    );
  }
  const resetIcon = createElement(
    "span", "replay", {"class": "icon", "aria-hidden": true},
  );
  const resetButton = createElement("button", resetIcon, {
    "class": "invisible-button",
    "aria-label": "Reset level",
    "type": "button",
  });
  const sidebarBottom = createElement(
    "div",
    sandbox ? [resetButton] : [hintWrapper, resetButton],
    {"class": "simulator-sidebar-bottom"},
  );
  const sidebar = createElement(
    "article",
    [sidebarTop, sidebarMain, sidebarBottom],
    {"class": "simulator-sidebar"},
  );

  return sidebar;
}


function createSimulatorMain() {
  // The button that opens the sidebar
  const sidebarOpen = createElement("button", "arrow_right", {
    "class": "simulator-toolbar-item",
    "id": "sidebar-open",
    "aria-label": "Open sidebar",
    "type": "button",
  });
  sidebarOpen.style.display = "none";
  /*
   * The tool selector. I can't just use <select>/<option>
   * because you can't put icons in <option> elements, unfortunately.
   */
  const tools = [
    {"icon": "edit", "name": "Draw"},
    {"icon": "vignette_2", "name": "Object"},
    {"icon": "select", "name": "Select"},
    {"icon": "pan_tool", "name": "Pan"},
  ];
  const toolArray = [];
  for (const {icon, name} of tools) {
    const toolIcon = createElement(
      "span", icon, {"class": "icon", "aria-hidden": true},
    );
    toolArray.push(createElement(
      "div",
      [toolIcon, " " + name],
      {"class": "simulator-option", "role": "option"},
    ));
  }
  const toolSelected = createElement("button", tools[0].icon, {
    "class": "simulator-toolbar-item",
    // Fix a bug on Safari
    "tabindex": 0,
    "type": "button",
  });
  const toolsInner = createElement(
    "div", toolArray, {"class": "simulator-option-wrapper"},
  );
  const toolsOuter
    = createElement("div", toolsInner, {"id": "simulator-options"});
  toolsOuter.style.display = "none";
  toolArray[0].toggleAttribute("data-selected");
  const toolSelector = createElement("div", [toolSelected, toolsOuter], {
    "id": "simulator-tool",
    "role": "listbox",
    "data-tool": "draw",
    "aria-label": "Currently using Draw. Change tool:",
  });
  const toolWrapper = createElement(
    "div", toolSelector, {"class": "simulator-toolbar-item"},
  );
  // Reset, step back, step forward, and play buttons
  const gen0Button = createElement("button", "skip_previous", {
    "class": "simulator-toolbar-item",
    "id": "simulator-reset",
    "aria-label": "Reset to generation 0",
    "type": "button",
  });
  /*
   * We can't just do scale: -1 because that'll make the GPU kick in,
   * and that kills the hinting and makes everything blurry.
   * So instead of letting the GPU do that, we do it ourselves with the SVG.
   */
  const backPath = createElement("path", [], {
    "d": "M 720 -240 v -480 h -80 v 480 h 80 Z "
      + "m -160 0 -400 -240 400 -240 v 480 Z",
  });
  const backSvg = createElement("svg", backPath, {
    "viewBox": "0 -960 960 960",
    "width": "1em",
    "height": "1em",
    "fill": "currentColor",
  });
  const backButton = createElement("button", backSvg, {
    "class": "simulator-toolbar-item",
    "id": "simulator-back",
    "aria-label": "Step back 1 generation",
    // We're at generation 0 right now so we can't step back
    "disabled": "",
    "type": "button",
  });
  const stepButton = createElement("button", "resume", {
    "class": "simulator-toolbar-item",
    "id": "simulator-step",
    "aria-label": "Step forward 1 generation",
    "type": "button",
  });
  const playButton = createElement("button", "play_arrow", {
    "class": "simulator-toolbar-item",
    "id": "simulator-play",
    "aria-label": "Play simulation",
    "type": "button",
  });
  // The speed slider
  const slider = createElement("input", [], {
    "type": "range",
    "min": 0,
    "max": 1,
    "step": "any",
    "class": "slider-true",
    "aria-label": "5 generations per second",
  });
  slider.value = Math.log(95 / 59) / Math.log(10);
  const sliderValue = createElement(
    "div", "5/s", {"class": "slider-value", "aria-hidden": true},
  );
  const sliderInner = createElement(
    "div", [slider, sliderValue], {"class": "slider-wrapper"},
  );
  const sliderOuter = createElement(
    "div", sliderInner, {"id": "simulator-speed-wrapper"},
  );
  sliderOuter.style.display = "none";
  const speedButton = createElement("button", "speed", {
    "aria-label": "Change simulation speed",
    "class": "simulator-toolbar-item",
    "id": "simulator-speed-button",
    // Fix a bug on Safari
    "tabindex": 0,
    "type": "button",
  });
  const speedWrapper = createElement(
    "div", [speedButton, sliderOuter], {"id": "simulator-speed"},
  );
  // The zoom slider
  const zoomSlider = createElement("input", [], {
    "type": "range",
    "min": 0,
    "max": 1,
    "step": "any",
    "class": "slider-true",
    "aria-labelledby": "zoom-slider-label",
  });
  zoomSlider.value = Math.log(20) / Math.log(50);
  const zoomSliderValue = createElement(
    "div", "Zoom 20", {"class": "slider-value", "id": "zoom-slider-label"},
  );
  const zoomSliderInner = createElement(
    "div", [zoomSlider, zoomSliderValue], {"class": "slider-wrapper"},
  );
  const zoomSliderOuter = createElement(
    "div", zoomSliderInner, {"id": "simulator-zoom-wrapper"},
  );
  zoomSliderOuter.style.display = "none";
  const zoomButton = createElement("button", "zoom_in", {
    "aria-label": "Change zoom level",
    "class": "simulator-toolbar-item",
    "id": "simulator-zoom-button",
    // Fix a bug on Safari
    "tabindex": 0,
    "type": "button",
  });
  const zoomWrapper = createElement(
    "div", [zoomButton, zoomSliderOuter], {"id": "simulator-zoom"},
  );
  // The top toolbar
  const toolbarTop = createElement("section", [
    sidebarOpen,
    toolWrapper,
    gen0Button,
    backButton,
    stepButton,
    playButton,
    speedWrapper,
    zoomWrapper,
  ], {"class": "simulator-toolbar-top"});

  // The canvas in the middle
  const canvas = createElement(
    "canvas",
    "Sorry, your browser doesn't support the <canvas> element.",
    {"id": "simulator-cgol"},
  );
  // Resize the canvas so it doesn't get stretched weirdly
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  // Selection buttons
  const rotateCcwSelectionButton = createElement("button", "rotate_left", {
    "aria-label": "Rotate selection counterclockwise",
    "class": "simulator-toolbar-item",
    "id": "simulator-selection-rotate-ccw",
    "type": "button",
  });
  const rotateCwSelectionButton = createElement("button", "rotate_right", {
    "aria-label": "Rotate selection clockwise",
    "class": "simulator-toolbar-item",
    "id": "simulator-selection-rotate-cw",
    "type": "button",
  });
  const flipHorizSelectionButton = createElement("button", "flip", {
    "aria-label": "Flip selection horizontally",
    "class": "simulator-toolbar-item",
    "id": "simulator-selection-flip-horiz",
    "type": "button",
  });
  const flipVertSelectionButton = createElement("button", "\u{F10E8}", {
    "aria-label": "Flip selection vertically",
    "class": "simulator-toolbar-item icon-alt",
    "id": "simulator-selection-flip-vert",
    "type": "button",
  });
  const cutSelectionButton = createElement("button", "cut", {
    "aria-label": "Cut selection",
    "class": "simulator-toolbar-item",
    "id": "simulator-selection-cut",
    "type": "button",
  });
  const copySelectionButton = createElement("button", "content_copy", {
    "aria-label": "Copy selection",
    "class": "simulator-toolbar-item",
    "id": "simulator-selection-copy",
    "type": "button",
  });
  const selectObjectsSelectionButton = createElement("button", "vignette_2", {
    "aria-label": "Select objects in selection",
    "class": "simulator-toolbar-item",
    "id": "simulator-selection-select-objects",
    "type": "button",
  });
  const deleteSelectionButton = createElement("button", "delete", {
    "aria-label": "Delete selection",
    "class": "simulator-toolbar-item",
    "id": "simulator-selection-delete",
    "type": "button",
  });
  const selectionGroup = createElement("span", [
    rotateCcwSelectionButton,
    rotateCwSelectionButton,
    flipHorizSelectionButton,
    flipVertSelectionButton,
    cutSelectionButton,
    copySelectionButton,
    selectObjectsSelectionButton,
    deleteSelectionButton,
  ], {
    "class": "simulator-selection-group",
    "data-visible": "",
  });

  // Paste selection button
  const pasteSelectionButton = createElement("button", "content_paste", {
    "aria-label": "Paste selection",
    "class": "simulator-toolbar-item",
    // We can't paste anything yet
    "disabled": "",
    "id": "simulator-selection-paste",
    "type": "button",
  });
  const pasteSelectionGroup = createElement(
    "span",
    [pasteSelectionButton],
    {"class": "simulator-paste-selection-group"},
  );

  // Paste confirmation buttons
  const abortPasteButton = createElement("button", "close", {
    "aria-label": "Abort paste",
    "class": "simulator-toolbar-item",
    "id": "simulator-paste-abort",
    "type": "button",
  });
  const confirmPasteButton = createElement("button", "check", {
    "aria-label": "Confirm paste",
    "class": "simulator-toolbar-item",
    "id": "simulator-paste-confirm",
    "type": "button",
  });
  const pasteConfirmationGroup = createElement("span", [
    abortPasteButton,
    confirmPasteButton,
  ], {"class": "simulator-paste-confirmation-group"});

  // Object buttons
  const rotateCcwObjectButton = createElement("button", "rotate_left", {
    "aria-label": "Rotate object counterclockwise",
    "class": "simulator-toolbar-item",
    "id": "simulator-object-rotate-ccw",
    "type": "button",
  });
  const rotateCwObjectButton = createElement("button", "rotate_right", {
    "aria-label": "Rotate object clockwise",
    "class": "simulator-toolbar-item",
    "id": "simulator-object-rotate-cw",
    "type": "button",
  });
  const flipHorizObjectButton = createElement("button", "flip", {
    "aria-label": "Flip object horizontally",
    "class": "simulator-toolbar-item",
    "id": "simulator-object-flip-horiz",
    "type": "button",
  });
  const flipVertObjectButton = createElement("button", "\u{F10E8}", {
    "aria-label": "Flip object vertically",
    "class": "simulator-toolbar-item icon-alt",
    "id": "simulator-object-flip-vert",
    "type": "button",
  });
  // Same trick as backSvg
  const backObjectPath = createElement("path", [], {
    "d": "M 720 -240 v -480 h -80 v 480 h 80 Z "
      + "m -160 0 -400 -240 400 -240 v 480 Z",
  });
  const backObjectSvg = createElement("svg", backObjectPath, {
    "viewBox": "0 -960 960 960",
    "width": "1em",
    "height": "1em",
    "fill": "currentColor",
  });
  const backObjectButton = createElement("button", backObjectSvg, {
    "aria-label": "Step object back 1 generation",
    "class": "simulator-toolbar-item",
    "id": "simulator-object-back",
    "type": "button",
  });
  const forwardObjectButton = createElement("button", "resume", {
    "aria-label": "Step object forward 1 generation",
    "class": "simulator-toolbar-item",
    "id": "simulator-object-forward",
    "type": "button",
  });
  const cutObjectButton = createElement("button", "cut", {
    "aria-label": "Cut object",
    "class": "simulator-toolbar-item",
    "id": "simulator-object-cut",
    "type": "button",
  });
  const copyObjectButton = createElement("button", "content_copy", {
    "aria-label": "Copy object",
    "class": "simulator-toolbar-item",
    "id": "simulator-object-copy",
    "type": "button",
  });
  const breakObjectButton = createElement("button", "grid_view", {
    "aria-label": "Break object into cells",
    "class": "simulator-toolbar-item",
    "id": "simulator-object-break",
    "type": "button",
  });
  const deleteObjectButton = createElement("button", "delete", {
    "aria-label": "Delete object",
    "class": "simulator-toolbar-item",
    "id": "simulator-object-delete",
    "type": "button",
  });
  const objectGroup = createElement("span", [
    rotateCcwObjectButton,
    rotateCwObjectButton,
    flipHorizObjectButton,
    flipVertObjectButton,
    backObjectButton,
    forwardObjectButton,
    cutObjectButton,
    copyObjectButton,
    breakObjectButton,
    deleteObjectButton,
  ], {"class": "simulator-object-group"});

  // Paste object button
  const pasteObjectButton = createElement("button", "content_paste", {
    "aria-label": "Paste object",
    "class": "simulator-toolbar-item",
    // We can't paste anything yet
    "disabled": "",
    "id": "simulator-object-paste",
    "type": "button",
  });
  const pasteObjectGroup = createElement(
    "span",
    [pasteObjectButton],
    {"class": "simulator-paste-object-group"},
  );

  // The floating toolbar when a selection is made
  const selectionToolbar = createElement("section", [
    selectionGroup,
    pasteSelectionGroup,
    pasteConfirmationGroup,
    objectGroup,
    pasteObjectGroup,
  ], {"class": "simulator-selection-toolbar"});
  selectionToolbar.style.display = "none";

  // The floating "move selection" button
  const selectionMove = createElement("button", "open_with", {
    "aria-label": "Move selection",
    "class": "simulator-toolbar-item",
    "id": "simulator-selection-move",
    "type": "button",
  });
  selectionMove.style.display = "none";

  // The "generations" statistic
  const generationsStat = createElement("div", "Gen. 0", {
    "id": "simulator-stat-generations",
    "aria-label": "Generation 0",
  });
  // The other statistics
  const populationStat = createElement(
    "div", "0 cells", {"id": "simulator-stat-population"},
  );
  const boundingBoxStat = createElement("div", "0\u00D70", {
    "id": "simulator-stat-bounding-box",
    "aria-label": "Bounding box: 0 by 0",
  });
  const extraStatsInner = createElement(
    "div", [populationStat, boundingBoxStat], {"class": "extra-stats-inner"},
  );
  const extraStatsOuter = createElement(
    "div", extraStatsInner, {"id": "extra-stats-wrapper"},
  );
  extraStatsOuter.style.display = "none";
  const extraStatsButton = createElement("button", "bar_chart", {
    "aria-label": "Toggle extra statistics",
    "class": "simulator-toolbar-item",
    "id": "extra-stats-button",
    // Fix a bug on Safari
    "tabindex": 0,
    "type": "button",
  });
  const extraStatsWrapper = createElement(
    "div", [extraStatsButton, extraStatsOuter], {"id": "simulator-extra-stats"},
  );
  // Undo and redo buttons
  const undoButton = createElement("button", "undo", {
    "class": "simulator-toolbar-item",
    "id": "simulator-undo",
    "aria-label": "Undo",
    // We haven't done anything yet so we can't undo
    "disabled": "",
    "type": "button",
  });
  const redoButton = createElement("button", "redo", {
    "class": "simulator-toolbar-item",
    "id": "simulator-redo",
    "aria-label": "Redo",
    // We haven't done anything yet so we can't redo
    "disabled": "",
    "type": "button",
  });
  // The settings button
  const allExtraOptions = [
    {"icon": "upload", "name": "Import RLE"},
    {"icon": "content_copy", "name": "Copy RLE"},
    {"icon": "settings", "name": "Settings"},
  ];
  const settingsButton = createElement("button", "more_vert", {
    "class": "simulator-toolbar-item",
    "id": "simulator-settings",
    "aria-label": "Toggle options",
    // Fix a bug on Safari
    "tabindex": 0,
    "type": "button",
  });
  const extraOptionArray = [];
  for (const {icon, name} of allExtraOptions) {
    const optionIcon = createElement(
      "span", icon, {"class": "icon", "aria-hidden": true},
    );
    extraOptionArray.push(createElement(
      "div", [optionIcon, " " + name], {"class": "simulator-option"},
    ));
  }
  const extraOptionWrapper = createElement(
    "div", extraOptionArray, {"class": "simulator-option-wrapper"},
  );
  const extraOptions = createElement(
    "div", extraOptionWrapper, {"id": "simulator-extra-options"},
  );
  extraOptions.style.display = "none";
  const settingsWrapper = createElement(
    "div", [settingsButton, extraOptions], {"id": "simulator-settings-wrapper"},
  );
  // The bottom toolbar
  const toolbarBottom = createElement(
    "section",
    [
      generationsStat,
      extraStatsWrapper,
      undoButton,
      redoButton,
      settingsWrapper,
    ],
    {"class": "simulator-toolbar-bottom"},
  );

  const simulator = createElement(
    "article",
    [toolbarTop, canvas, selectionToolbar, selectionMove, toolbarBottom],
    {"class": "simulator-main"},
  );

  return simulator;
}


function updateFloatingToolbars(forceVisible = false, updateVisibility = true) {
  const selection = cgolObject.getSelection();
  const simulatorSelectionToolbar
    = document.getElementsByClassName("simulator-selection-toolbar")[0];
  const simulatorSelectionMove
    = document.getElementById("simulator-selection-move");
  if (selection.visible
    || simulatorSelectionToolbar.style.display === "block"
    || simulatorSelectionMove.style.display === "block"
    || forceVisible) {
    const toolbarPosition = cgolObject.boardToCanvasCoordinates(
      (selection.left + selection.right) / 2, selection.top,
    );
    const movePosition = cgolObject.boardToCanvasCoordinates(
      selection.right, selection.top,
    );
    if (updateVisibility) {
      simulatorSelectionToolbar.style.display = "block";
      simulatorSelectionMove.style.display = "block";
    }
    simulatorSelectionToolbar.style.left = toolbarPosition.x + "px";
    simulatorSelectionToolbar.style.top = toolbarPosition.y + "px";
    simulatorSelectionMove.style.left = movePosition.x + "px";
    simulatorSelectionMove.style.top = movePosition.y + "px";
  }
}
function changeObjectCount(addObjectButton, newCount) {
  /*
   * Edit the text next to the button
   * TODO: Add support for other languages
   */
  const currentObject = addObjectButton.getAttribute("data-object");
  const currentObjectData = objectData[currentObject];
  const objectName = currentObjectData.name["en-US"];
  const objectInfo = `${newCount}\u00D7 ${objectName} `;
  addObjectButton.previousSibling.data = objectInfo;
  // Edit the button itself
  if (newCount <= 0) {
    addObjectButton.setAttribute("disabled", "");
  }
  addObjectButton.setAttribute("data-count", newCount);
}

function resizeCanvas() {
  // Resize the canvas so it doesn't get stretched weirdly
  const canvas = document.getElementById("simulator-cgol");
  canvas.width = Math.max(canvas.clientWidth, 1);
  canvas.height = Math.max(canvas.clientHeight, 1);
}
function resizeSimulator() {
  // Change direction of menu arrows
  const root = document.getElementById("conways-story-mode");
  const portrait = root.getAttribute("data-portrait") === "true";
  const sidebarTop
    = document.getElementsByClassName("simulator-sidebar-top")[0];
  const closeMenuIcon = sidebarTop.children[1].children[0];
  closeMenuIcon.replaceChildren(portrait ? "arrow_drop_up" : "arrow_left");
  const openMenuIcon
    = document.getElementById("sidebar-open");
  openMenuIcon.replaceChildren(portrait ? "arrow_drop_down" : "arrow_right");

  // Change --button-stretch of the top toolbar
  const toolbarTop
    = document.getElementsByClassName("simulator-toolbar-top")[0];
  const toolbarBottom
    = document.getElementsByClassName("simulator-toolbar-bottom")[0];
  const toolbarWidth = toolbarTop.clientWidth;
  const MINSTRETCH = 380;
  const MAXSTRETCH = 650;
  let buttonStretch;
  if (toolbarWidth < MINSTRETCH) {
    buttonStretch = 0;
  } else if (toolbarWidth > MAXSTRETCH) {
    buttonStretch = 1;
  } else {
    buttonStretch = (toolbarWidth - MINSTRETCH) / (MAXSTRETCH - MINSTRETCH);
  }
  toolbarTop.style.setProperty("--button-stretch", buttonStretch);
  toolbarBottom.style.setProperty("--button-stretch", buttonStretch);

  resizeCanvas();
  if (cgolObject) {
    updateFloatingToolbars(false, false);
  }
}


function createEventHandlers(sandbox, library) {
  // Make the CGoL object
  cgolObject = new CGoL({
    // TODO: Increase to 256 once it stops lagging
    "gridSize": 128,
    "pattern": "x = 3, y = 3, rule = B3/S23\n"
      + "3o$2bo$bo2$.ABCDEFGHIJKLMNOPQRSTUVWXY!",
    "canvas": document.getElementById("simulator-cgol"),
    "zoom": 20,
    "generationCounter": document.getElementById("simulator-stat-generations"),
    "populationCounter": document.getElementById("simulator-stat-population"),
    "boundingBoxCounter":
      document.getElementById("simulator-stat-bounding-box"),
    "stateHandler": (cgolObject) => {
      // Update the step back button
      const stepBackwardButton = document.getElementById("simulator-back");
      stepBackwardButton.disabled = cgolObject.generation === 0;
      // Update the undo and redo buttons
      const undoButton = document.getElementById("simulator-undo");
      undoButton.disabled = !cgolObject.canUndo();
      const redoButton = document.getElementById("simulator-redo");
      redoButton.disabled = !cgolObject.canRedo();

      // Update the number of objects in the sidebar
      const objectIds
        = cgolObject.objects.map((object) => object?.objectMetadata?.id);
      for (const libraryObject of library) {
        const objectId = libraryObject.id;
        const usedObjectCount
          = objectIds.filter((id) => id === objectId).length;
        const remainingObjectCount = libraryObject.count - usedObjectCount;
        const addObjectButton = document.querySelector(
          `.simulator-add-object[data-object="${CSS.escape(objectId)}"]`,
        );
        changeObjectCount(addObjectButton, remainingObjectCount);
      }
    },
    "tickHandler": (cgolObject) => {
      // Update the step back button
      const stepBackwardButton = document.getElementById("simulator-back");
      stepBackwardButton.disabled = cgolObject.generation === 0;
      /*
       * Update the "add object" buttons
       * because you can't add objects after generation 0
       */
      const addObjectButtons
        = document.getElementsByClassName("simulator-add-object");
      for (const addObjectButton of addObjectButtons) {
        if (cgolObject.generation > 0
          || addObjectButton.getAttribute("data-count") <= 0) {
          addObjectButton.setAttribute("disabled", "");
        } else {
          addObjectButton.removeAttribute("disabled");
        }
      }
      // Remove object toolbars after generation 0
      const simulatorSelectionToolbar
        = document.getElementsByClassName("simulator-selection-toolbar")[0];
      const simulatorSelectionMove
        = document.getElementById("simulator-selection-move");
      if (cgolObject.getSelection().type === "object") {
        const toolbarDisplay = cgolObject.generation === 0 ? "block" : "none";
        simulatorSelectionToolbar.style.display = toolbarDisplay;
        simulatorSelectionMove.style.display = toolbarDisplay;
      }
    },
  });

  // Sidebar event handlers
  const sidebarTop
    = document.getElementsByClassName("simulator-sidebar-top")[0];
  const [backButton, closeMenuButton] = sidebarTop.children;
  const addObjectButtons
    = document.getElementsByClassName("simulator-add-object");
  const sidebarBottom
    = document.getElementsByClassName("simulator-sidebar-bottom")[0];
  const hintButton
    = document.getElementsByClassName("hint-button")[0]?.children[0];
  const resetButton = sidebarBottom.children[sidebarBottom.children.length - 1];
  const openMenuButton = document.getElementById("sidebar-open");
  backButton.addEventListener("click", createMainMenu);
  for (const addObjectButton of addObjectButtons) {
    addObjectButton.addEventListener("click", () => {
      const dataObject = addObjectButton.getAttribute("data-object");
      let dataCount = addObjectButton.getAttribute("data-count");
      if (dataCount > 0) {
        const currentObjectData = objectData[dataObject];
        const objectPattern = currentObjectData.pattern;
        const parsedObject = CGoL.parseRle(objectPattern);

        const objectMetadata = {"id": dataObject};
        if (currentObjectData.type) {
          objectMetadata.type = currentObjectData.type;
        } else {
          throw new TypeError(`Missing type field for object ${dataObject}`);
        }
        if (currentObjectData.period) {
          objectMetadata.period = currentObjectData.period;
        }
        if (currentObjectData.displacement) {
          objectMetadata.displacement = currentObjectData.displacement;
        }

        cgolObject.objects.push({
          "pattern": parsedObject.pattern,
          "x": Math.floor((cgolObject.gridSize - parsedObject.width) / 2),
          "y": Math.floor((cgolObject.gridSize - parsedObject.height) / 2),
          "width": parsedObject.width,
          "height": parsedObject.height,
          "moving": false,
          "selected": false,
          "objectMetadata": objectMetadata,
        });
        cgolObject.compilePattern();
        cgolObject.setState("object", 1, 0, {"mergeable": false});
        --dataCount;
      }
      changeObjectCount(addObjectButton, dataCount);
    });
  }
  if (!sandbox) {
    hintButton.addEventListener("click", () => {
      // TODO: Make the hint button show a hint
    });
  }
  resetButton.addEventListener("click", () => {
    // TODO: Reset the level after a confirmation
  });

  // Event handlers for opening/closing the sidebar
  closeMenuButton.addEventListener("click", () => {
    const sidebar = document.getElementsByClassName("simulator-sidebar")[0];
    sidebar.style.display = "none";
    openMenuButton.style.display = "block";
    openMenuButton.setAttribute("data-visible", "");
    resizeCanvas();
  });
  openMenuButton.addEventListener("click", () => {
    const sidebar = document.getElementsByClassName("simulator-sidebar")[0];
    sidebar.style.display = "flex";
    openMenuButton.style.display = "none";
    openMenuButton.removeAttribute("data-visible");
    resizeCanvas();
  });

  /*
   * Event handlers for the tools and extra options
   * (they work in mostly the same way)
   */
  function toggleOptionVisibilityInner(
    requiredVariables,
    setTo = null,
    event = null,
  ) {
    const {
      currentButton,
      currentOptionWrapper,
      currentOptions,
      dropdownType,
    } = requiredVariables;
    const display = window.getComputedStyle(currentOptionWrapper).display;
    let newDisplay;
    if (setTo === null) {
      // Toggle display when not explicitly set
      newDisplay = display === "none" ? "block" : "none";
    } else {
      newDisplay = setTo ? "block" : "none";
    }
    currentOptionWrapper.style.display = newDisplay;
    if (newDisplay === "none") {
      if (dropdownType === "tools") {
        // Update the icon on the selector when we close it
        for (const option of currentOptions) {
          if (option.getAttribute("data-selected") !== null) {
            const iconName = option.children[0].innerText;
            currentButton.innerText = iconName;
            const toolName = option.lastChild.data.trim();
            const ariaLabel = `Currently using ${toolName}. Change tool:`;
            currentButton.parentElement.ariaLabel = ariaLabel;
            /*
             * The data-tool name shouldn't be translated,
             * so we're getting it ourselves based on the child index.
             */
            const childIndex = currentOptions.indexOf(option);
            const toolNameArray = ["draw", "object", "select", "pan"];
            const toolNameUntranslated = toolNameArray[childIndex];
            currentButton.parentElement.setAttribute(
              "data-tool", toolNameUntranslated,
            );
            // Also change the cursor type because the tool changed
            updateCursor();
            break;
          }
        }
      } else if (dropdownType === "extras") {
        currentOptions.forEach(
          (option) => option.removeAttribute("data-selected"),
        );
      }
      if (event) {
        currentButton.setPointerCapture(event.pointerId);
        currentButton.addEventListener("pointerup", (newEvent) => {
          currentButton.releasePointerCapture(newEvent.pointerId);
        }, {"once": true});
      }
    }
  }
  function selectOptionInner(requiredVariables, num, relative = false) {
    const currentOptions = requiredVariables.currentOptions;
    const selectedOld = currentOptions.map((option) => {
      return option.getAttribute("data-selected") !== null;
    }).indexOf(true);
    let selectedNew = relative ? selectedOld + num : num;
    if (selectedOld === -1 && relative) {
      selectedNew = 0;
    } else if (selectedNew < 0) {
      selectedNew = 0;
    } else if (selectedNew >= currentOptions.length) {
      selectedNew = currentOptions.length - 1;
    }
    currentOptions[selectedOld]?.toggleAttribute("data-selected");
    currentOptions[selectedNew].toggleAttribute("data-selected");
  }

  for (const dropdownType of ["tools", "extras"]) {
    let currentButton;
    let currentOptionWrapper;
    if (dropdownType === "tools") {
      currentButton = document.querySelector("#simulator-tool button");
      currentOptionWrapper = document.getElementById("simulator-options");
    } else {
      currentButton = document.getElementById("simulator-settings");
      currentOptionWrapper = document.getElementById("simulator-extra-options");
    }
    const currentOptions
      = [...currentOptionWrapper.getElementsByClassName("simulator-option")];
    const requiredVariables = {
      "currentButton": currentButton,
      "currentOptionWrapper": currentOptionWrapper,
      "currentOptions": currentOptions,
      "dropdownType": dropdownType,
    };
    const toggleOptionVisibility
      = (...args) => toggleOptionVisibilityInner(requiredVariables, ...args);
    const selectOption
      = (...args) => selectOptionInner(requiredVariables, ...args);
    currentButton.addEventListener("click", (event) => {
      toggleOptionVisibility(null, event);
    });
    currentButton.addEventListener("blur", () => {
      toggleOptionVisibility(false, null);
    });
    currentButton.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleOptionVisibility(null, null);
        const noOptionSelected = currentOptions.every(
          (option) => option.getAttribute("data-selected") === null,
        );
        if (noOptionSelected) {
          /*
           * If the Enter key is used to open the dialog
           * and no option is selected yet,
           * automatically select the first option
           */
          selectOption(0);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        toggleOptionVisibility(false, null);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        selectOption(-1, true);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        selectOption(1, true);
      } else if (event.key === "PageUp") {
        event.preventDefault();
        selectOption(-5, true);
      } else if (event.key === "PageDown") {
        event.preventDefault();
        selectOption(5, true);
      } else if (event.key === "Home") {
        event.preventDefault();
        selectOption(0);
      } else if (event.key === "End") {
        event.preventDefault();
        selectOption(currentOptions.length - 1);
      }
    });
    for (const [index, option] of currentOptions.entries()) {
      option.addEventListener("mouseenter", () => {
        selectOption(index);
      });
      option.addEventListener("click", (event) => {
        selectOption(index);
        toggleOptionVisibility(false, event);
      });
    }
  }

  // Reset, step back, step forward, play
  const resetGenerationButton = document.getElementById("simulator-reset");
  const stepBackwardButton = document.getElementById("simulator-back");
  const stepForwardButton = document.getElementById("simulator-step");
  const playButton = document.getElementById("simulator-play");

  function setPlaying(newPlaying, onlyButton = false) {
    if (newPlaying) {
      if (!onlyButton) {
        cgolObject.play();
      }
      playButton.replaceChildren("pause");
    } else {
      if (!onlyButton) {
        cgolObject.pause();
      }
      playButton.replaceChildren("play_arrow");
    }
  }

  resetGenerationButton.addEventListener("click", () => {
    cgolObject.resetToGeneration0();
    setPlaying(false, true);
  });
  stepBackwardButton.addEventListener("click", () => {
    cgolObject.stepBack();
    setPlaying(false, true);
  });
  stepForwardButton.addEventListener("click", () => {
    cgolObject.stepForward();
    setPlaying(false);
  });
  playButton.addEventListener("click", () => {
    setPlaying(!cgolObject.playing);
  });

  // Simulation speed event handlers
  const speedButton = document.getElementById("simulator-speed-button");
  const speedWrapper = document.getElementById("simulator-speed-wrapper");
  const speedOuter = document.getElementById("simulator-speed");
  const speedSlider = speedWrapper.getElementsByClassName("slider-true")[0];
  const speedLabel = speedWrapper.getElementsByClassName("slider-value")[0];
  speedButton.addEventListener("click", () => {
    const display = window.getComputedStyle(speedWrapper).display;
    const newDisplay = display === "none" ? "block" : "none";
    speedWrapper.style.display = newDisplay;
    if (newDisplay === "block") {
      speedSlider.focus();
    }
  });
  speedSlider.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      speedWrapper.style.display = "none";
      speedButton.focus();
      event.preventDefault();
    }
  });
  speedOuter.addEventListener("blur", (event) => {
    const focusedElement = event.relatedTarget;
    if (focusedElement !== speedButton && focusedElement !== speedSlider) {
      speedWrapper.style.display = "none";
    }
  }, true);
  // Lowering the number makes the curve become more of a line
  const EASE = 10;
  const MAX_SPEED = 60;
  speedSlider.addEventListener("input", () => {
    const trueSpeed
      = (MAX_SPEED - 1) / (EASE - 1) * (EASE ** speedSlider.value - 1) + 1;
    cgolObject.speed = trueSpeed;
    const shownSpeed = Math.round(trueSpeed);
    speedLabel.innerText = `${shownSpeed}/s`;
    if (shownSpeed === 1) {
      speedSlider.ariaLabel = "1 generation per second";
    } else {
      speedSlider.ariaLabel = `${shownSpeed} generations per second`;
    }
  });

  // Simulation zoom event handlers
  const zoomButton = document.getElementById("simulator-zoom-button");
  const zoomWrapper = document.getElementById("simulator-zoom-wrapper");
  const zoomOuter = document.getElementById("simulator-zoom");
  const zoomSlider = zoomWrapper.getElementsByClassName("slider-true")[0];
  const zoomLabel = zoomWrapper.getElementsByClassName("slider-value")[0];
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 50;

  function setZoom(newZoom, sliderValue = false) {
    let trueZoom;
    if (sliderValue) {
      trueZoom = (MAX_ZOOM / MIN_ZOOM) ** newZoom * MIN_ZOOM;
      sliderValue = newZoom;
    } else {
      trueZoom = newZoom;
      sliderValue
        = Math.log(newZoom / MIN_ZOOM) / Math.log(MAX_ZOOM / MIN_ZOOM);
    }
    const shownZoom = Math.round(trueZoom);
    zoomLabel.innerText = `Zoom ${shownZoom}`;
    zoomSlider.value = sliderValue;
    cgolObject.moveTo(cgolObject.xOffset, cgolObject.yOffset, trueZoom);
    updateFloatingToolbars(false, false);
  }

  zoomButton.addEventListener("click", () => {
    const display = window.getComputedStyle(zoomWrapper).display;
    const newDisplay = display === "none" ? "block" : "none";
    zoomWrapper.style.display = newDisplay;
    if (newDisplay === "block") {
      zoomSlider.focus();
    }
  });
  zoomSlider.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      zoomWrapper.style.display = "none";
      zoomButton.focus();
      event.preventDefault();
    }
  });
  zoomOuter.addEventListener("blur", () => {
    const focusedElement = event.relatedTarget;
    if (focusedElement !== zoomButton && focusedElement !== zoomSlider) {
      zoomWrapper.style.display = "none";
    }
  }, true);
  zoomSlider.addEventListener("input", () => setZoom(zoomSlider.value, true));

  // Simulation extra stat event handlers
  const extraStatsButton = document.getElementById("extra-stats-button");
  const extraStatsWrapper = document.getElementById("extra-stats-wrapper");
  extraStatsButton.addEventListener("click", () => {
    const display = window.getComputedStyle(extraStatsWrapper).display;
    const newDisplay = display === "none" ? "block" : "none";
    extraStatsWrapper.style.display = newDisplay;
  });
  extraStatsButton.addEventListener("blur", () => {
    extraStatsWrapper.style.display = "none";
  });

  // Undo and redo event handlers
  const undoButton = document.getElementById("simulator-undo");
  const redoButton = document.getElementById("simulator-redo");
  undoButton.addEventListener("click", () => {
    setPlaying(false);
    cgolObject.undo();
  });
  redoButton.addEventListener("click", () => {
    setPlaying(false);
    cgolObject.redo();
  });


  // All event handlers for canvas
  const canvas = document.getElementById("simulator-cgol");

  let firstX;
  let firstY;
  let lastX;
  let lastY;
  let mouseDown = false;
  let drawingCellType = 0;
  let temporarilyPaused = false;
  let selectionStart = {"x": null, "y": null};
  let clipboard;
  let clipboardIsObject;
  let pasteVisible = false;
  let currentlyPasting = false;
  let cursorMovedSignificantly = false;

  function updateFirstMousePosition(event) {
    firstX = event.pageX;
    firstY = event.pageY;
  }
  function updateLastMousePosition(event) {
    lastX = event.pageX;
    lastY = event.pageY;
  }
  function updateCursor(cursor = null) {
    if (cursor !== null) {
      canvas.style.cursor = cursor;
    }
    const tool
      = document.getElementById("simulator-tool").getAttribute("data-tool");
    let cursorType;
    switch (tool) {
      case "draw":
        cursorType = "default";
        break;
      case "object":
        cursorType = "default";
        break;
      case "select":
        cursorType = "cell";
        break;
      case "pan":
        cursorType = mouseDown ? "grabbing" : "grab";
        break;
    }
    canvas.style.cursor = cursorType;
  }
  function changeVisibleToolbarGroup(groupIndex) {
    const toolbar
      = document.getElementsByClassName("simulator-selection-toolbar")[0];
    for (let i = 0; i < toolbar.children.length; ++i) {
      const group = toolbar.children[i];
      if (i === groupIndex) {
        group.setAttribute("data-visible", "");
      } else {
        group.removeAttribute("data-visible");
      }
    }
  }

  function mouseDownEventHandler(event) {
    const touch
      = event.pointerEvent === "pen" || event.pointerEvent === "touch";
    const buttons = touch ? 1 : event.buttons;
    const tool
      = document.getElementById("simulator-tool").getAttribute("data-tool");

    // Quick panning
    if (buttons & 2) {
      updateCursor("grabbing");
    }
    // Drawing
    if (tool === "draw") {
      // Left click but not right click
      if ((buttons & 1) && !(buttons & 2)) {
        const {x, y}
          = cgolObject.pageToBoardCoordinates(event.pageX, event.pageY);
        temporarilyPaused = cgolObject.playing;
        cgolObject.pause();
        if (x >= 0 && x < cgolObject.gridSize
          && y >= 0 && y < cgolObject.gridSize) {
          drawingCellType
            = (cgolObject.board[y * cgolObject.gridSize + x] & 1) ^ 1;
          cgolObject.editCells([[x, y]], (c) => (c & ~1) | drawingCellType);
        } else {
          drawingCellType = 1;
        }
      }
    // Object
    } else if (tool === "object") {
      if ((buttons & 1) && !(buttons & 2)) {
        cgolObject.selection.visible = false;
        cgolObject.objects.forEach((object) => {
          object.selected = false;
        });
        const simulatorSelectionToolbar
          = document.getElementsByClassName("simulator-selection-toolbar")[0];
        const simulatorSelectionMove
          = document.getElementById("simulator-selection-move");
        if (simulatorSelectionToolbar.style.display === "block") {
          pasteVisible = false;
        }
        simulatorSelectionToolbar.style.display = "none";
        simulatorSelectionMove.style.display = "none";
        cgolObject.forceUpdate();
      }
    // Selecting
    } else if (tool === "select") {
      if (!currentlyPasting) {
        if ((buttons & 1) && !(buttons & 2)) {
          let {x, y}
            = cgolObject.pageToBoardCoordinates(event.pageX, event.pageY);
          x = Math.min(Math.max(x, 0), cgolObject.gridSize - 1);
          y = Math.min(Math.max(y, 0), cgolObject.gridSize - 1);
          selectionStart = {"x": x, "y": y};
          cgolObject.selection = {
            "left": x,
            "right": x,
            "top": y,
            "bottom": y,
            "visible": false,
          };
          cgolObject.objects.forEach((object) => {
            object.selected = false;
          });
          cgolObject.forceUpdate();
        }
        cursorMovedSignificantly = false;
        const simulatorSelectionToolbar
          = document.getElementsByClassName("simulator-selection-toolbar")[0];
        const simulatorSelectionMove
          = document.getElementById("simulator-selection-move");
        if (simulatorSelectionToolbar.style.display === "block") {
          pasteVisible = false;
        }
        simulatorSelectionToolbar.style.display = "none";
        simulatorSelectionMove.style.display = "none";
      }
    }

    canvas.setPointerCapture(event.pointerId);
    updateFirstMousePosition(event);
    updateLastMousePosition(event);
    mouseDown = true;
    // No quick panning
    if (!(buttons & 2)) {
      updateCursor();
    }
  }

  function mouseMoveEventHandler(event) {
    const touch
      = event.pointerEvent === "pen" || event.pointerEvent === "touch";
    const buttons = touch ? 1 : event.buttons;
    mouseDown &&= buttons > 0;
    const tool
      = document.getElementById("simulator-tool").getAttribute("data-tool");

    if ((tool === "pan" && (buttons & 1)) || (buttons & 2)) {
      /*
       * Panning: Left mouse button or touchscreen
       * Every other mode: Right mouse button
       */
      const newX = event.pageX;
      const newY = event.pageY;
      const changeX = newX - lastX;
      const changeY = newY - lastY;
      const zoomLevel = cgolObject.zoom;
      cgolObject.moveTo(
        cgolObject.xOffset - changeX / zoomLevel,
        cgolObject.yOffset - changeY / zoomLevel,
        zoomLevel,
      );
      updateFloatingToolbars();
    }
    // Drawing
    if (tool === "draw") {
      if (mouseDown) {
        const coords0 = cgolObject.pageToBoardCoordinates(lastX, lastY);
        let x0 = coords0.x;
        let y0 = coords0.y;
        const coords1
          = cgolObject.pageToBoardCoordinates(event.pageX, event.pageY);
        let x1 = coords1.x;
        let y1 = coords1.y;
        const cellsToChange = [];
        let swapped;
        let iterations;
        // Bresenham's line algorithm
        if (x0 !== x1 || y0 !== y1) {
          // Only follow the algorithm if the coordinates changed
          if (x1 - x0 < y0 - y1 || (x1 - x0 === y0 - y1 && x1 < x0)) {
            /*
             * Swap coordinates to try to go south and east.
             * If there's a tie, prefer NE over SW.
             */
            [x1, x0, y1, y0] = [x0, x1, y0, y1];
            swapped = true;
          } else {
            swapped = false;
          }
          const slope = (y1 - y0) / (x1 - x0);
          if (Math.abs(slope) <= 1) {
            // Horizontal line
            iterations = x1 - x0;
            if (!swapped) {
              ++x0;
              y0 += slope;
            }
            for (; iterations > 0; --iterations) {
              /*
               * We add the - 0.5 to the y0 check because of rounding.
               * If y0 is cgolObject.gridSize - 0.1,
               * it is less than cgolObject.gridSize, but gets rounded to it.
               * This causes an error when we index into cgolObject.pattern.
               */
              if (x0 >= 0 && x0 < cgolObject.gridSize
                && y0 >= 0 && y0 < cgolObject.gridSize - 0.5) {
                cellsToChange.push([x0, Math.round(y0)]);
              }
              ++x0;
              y0 += slope;
            }
          } else {
            // Vertical line
            iterations = y1 - y0;
            if (!swapped) {
              ++y0;
              x0 += 1 / slope;
            }
            for (; iterations > 0; --iterations) {
              /*
               * We add - 0.5 to the x0 check here for the same reason,
               * but now the error manifests itself
               * as an increase in the length of the array,
               * which is WAY more sneaky.
               */
              if (x0 >= 0 && x0 < cgolObject.gridSize - 0.5
                && y0 >= 0 && y0 < cgolObject.gridSize) {
                cellsToChange.push([Math.round(x0), y0]);
              }
              ++y0;
              x0 += 1 / slope;
            }
          }
          const cellChangeFunction
            = drawingCellType ? ((c) => c | 1) : ((c) => c & ~1);
          cgolObject.editCells(cellsToChange, cellChangeFunction);
        }
      }
    // Selecting
    } else if (tool === "select") {
      if (mouseDown && !currentlyPasting) {
        let {x, y}
          = cgolObject.pageToBoardCoordinates(event.pageX, event.pageY);
        x = Math.min(Math.max(x, 0), cgolObject.gridSize - 1);
        y = Math.min(Math.max(y, 0), cgolObject.gridSize - 1);
        const moveDistance
          = Math.hypot(firstX - event.pageX, firstY - event.pageY);
        cursorMovedSignificantly ||= moveDistance >= 3;
        /*
         * This whole cursorMovedSignificantly thing is here
         * because moving the cursor 2 pixels
         * shouldn't cause a selection to automatically appear,
         * especially if you're trying to remove one already.
         */
        if ((cursorMovedSignificantly || cgolObject.selection.visible)
          && (buttons & 1) && !(buttons & 2)) {
          cgolObject.selection = {
            "left": Math.min(x, selectionStart.x),
            "right": Math.max(x, selectionStart.x),
            "top": Math.min(y, selectionStart.y),
            "bottom": Math.max(y, selectionStart.y),
            "visible": true,
          };
          cgolObject.forceUpdate();
          changeVisibleToolbarGroup(0);
          updateFloatingToolbars();
          pasteVisible = false;
        }
      }
    }

    updateLastMousePosition(event);
  }

  function mouseUpEventHandler(event) {
    const tool
      = document.getElementById("simulator-tool").getAttribute("data-tool");

    // Drawing
    if (tool === "draw") {
      if (mouseDown) {
        // The last true parameter ends the 'cell' action merging
        cgolObject.setState("cell", 0, 0, {"endMerge": true});
        if (temporarilyPaused) {
          cgolObject.play();
          temporarilyPaused = false;
        }
      }
    // Object
    } else if (tool === "object") {
      const {x, y}
        = cgolObject.pageToBoardCoordinates(event.pageX, event.pageY);
      if (mouseDown && cgolObject.generation === 0) {
        // Check whether any objects are in range
        let objectSelected = false;
        cgolObject.objects.forEach((object) => {
          object.selected = false;
        });
        for (const object of cgolObject.objects.toReversed()) {
          if (object.moving) {
            continue;
          }
          if (x >= object.x && x < object.x + object.width
            && y >= object.y && y < object.y + object.height) {
            object.selected = true;
            objectSelected = true;
            break;
          }
        }
        if (objectSelected || !pasteVisible) {
          cgolObject.forceUpdate();
          changeVisibleToolbarGroup(3);
          updateFloatingToolbars();
          pasteVisible = true;
        } else {
          changeVisibleToolbarGroup(4);
          cgolObject.selection = ({
            "left": x,
            "right": x,
            "top": y,
            "bottom": y,
            "visible": false,
          });
          updateFloatingToolbars(true);
          const simulatorSelectionMove
            = document.getElementById("simulator-selection-move");
          simulatorSelectionMove.style.display = "none";
          pasteVisible = false;
        }
      }
    // Selecting
    } else if (tool === "select") {
      if (mouseDown && !currentlyPasting) {
        if (pasteVisible) {
          changeVisibleToolbarGroup(1);
          const {x, y}
            = cgolObject.pageToBoardCoordinates(event.pageX, event.pageY);
          cgolObject.selection = ({
            "left": x,
            "right": x,
            "top": y,
            "bottom": y,
            "visible": false,
          });
          updateFloatingToolbars(true);
          const simulatorSelectionMove
            = document.getElementById("simulator-selection-move");
          simulatorSelectionMove.style.display = "none";
          pasteVisible = false;
        } else if (!cursorMovedSignificantly) {
          changeVisibleToolbarGroup(0);
          updateFloatingToolbars();
          pasteVisible = true;
        }
      }
    }

    canvas.releasePointerCapture(event.pointerId);
    updateLastMousePosition(event);
    mouseDown = false;
    updateCursor();
  }

  function wheelEventHandler(event) {
    const deltaMultiplier
      = event.deltaMode === WheelEvent.DOMDELTALINE ? 18 : 1;
    const scrollY = event.deltaY * deltaMultiplier;

    // Zoom in and out, regardless of mode
    const zoomMultiplier = 2 ** (-scrollY / 400);
    const newZoom = Math.min(
      Math.max(cgolObject.zoom * zoomMultiplier, MIN_ZOOM),
      MAX_ZOOM,
    );
    setZoom(newZoom);
  }

  // Add the event listeners

  // 16 milliseconds, around 1 frame
  const THROTTLE_TIME = 16;
  canvas.addEventListener(
    "pointerdown", throttle(mouseDownEventHandler, THROTTLE_TIME),
  );
  canvas.addEventListener(
    "pointermove", throttle(mouseMoveEventHandler, THROTTLE_TIME),
  );
  canvas.addEventListener(
    "pointerup", throttle(mouseUpEventHandler, THROTTLE_TIME),
  );
  canvas.addEventListener(
    "wheel", throttle(wheelEventHandler, THROTTLE_TIME),
  );
  canvas.addEventListener(
    "contextmenu", (event) => { event.preventDefault(); },
  );

  // Event handlers for the floating toolbar

  function rotateOrFlip(rotation, flipX, objectIndex = null) {
    const isSelection = objectIndex === null;
    objectIndex ??= 0;

    if (isSelection) {
      cgolObject.extractSelectionToObject();
    }
    const currentObject = cgolObject.objects[objectIndex];
    const rotatedPattern = CGoL.rotate(currentObject.pattern, rotation, flipX);

    // Update object
    currentObject.pattern = rotatedPattern.pattern;
    currentObject.x += rotatedPattern.x;
    currentObject.y += rotatedPattern.y;
    currentObject.width = rotatedPattern.width;
    currentObject.height = rotatedPattern.height;
    // Update selection
    if (isSelection) {
      const selectionLeft = currentObject.x;
      const selectionTop = currentObject.y;
      const selectionRight = selectionLeft + currentObject.width - 1;
      const selectionBottom = selectionTop + currentObject.height - 1;
      cgolObject.selection = {
        "left": Math.max(selectionLeft, 0),
        "top": Math.max(selectionTop, 0),
        "right": Math.min(selectionRight, cgolObject.gridSize - 1),
        "bottom": Math.min(selectionBottom, cgolObject.gridSize - 1),
        "visible": true,
      };
    }

    // Update state
    if (isSelection) {
      cgolObject.bakeObject(objectIndex, true);
    } else {
      cgolObject.compilePattern();
    }
    cgolObject.setState("rotate", 1, 0, {"control1": (a) => Math.min(a, 1)});
    updateFloatingToolbars();
  }

  // Rotate counterclockwise button
  const rotateCcwSelectionButton
    = document.getElementById("simulator-selection-rotate-ccw");
  rotateCcwSelectionButton.addEventListener("click", () => {
    rotateOrFlip(3, false);
  });
  // Rotate clockwise button
  const rotateCwSelectionButton
    = document.getElementById("simulator-selection-rotate-cw");
  rotateCwSelectionButton.addEventListener("click", () => {
    rotateOrFlip(1, false);
  });
  // Flip horizontally button
  const flipHorizSelectionButton
    = document.getElementById("simulator-selection-flip-horiz");
  flipHorizSelectionButton.addEventListener("click", () => {
    rotateOrFlip(0, true);
  });
  // Flip vertically button
  const flipVertSelectionButton
    = document.getElementById("simulator-selection-flip-vert");
  flipVertSelectionButton.addEventListener("click", () => {
    rotateOrFlip(2, true);
  });
  // Cut button
  const cutSelectionButton = document.getElementById("simulator-selection-cut");
  cutSelectionButton.addEventListener("click", () => {
    cgolObject.selection.visible = false;
    cgolObject.extractSelectionToObject(true);
    clipboard = cgolObject.objects.shift();
    clipboardIsObject = false;
    cgolObject.setState("delete", 1, 0, {"mergeable": false});
    const simulatorSelectionToolbar
      = document.getElementsByClassName("simulator-selection-toolbar")[0];
    const simulatorSelectionMove
      = document.getElementById("simulator-selection-move");
    simulatorSelectionToolbar.style.display = "none";
    simulatorSelectionMove.style.display = "none";
    const pasteSelectionButton
      = document.getElementById("simulator-selection-paste");
    pasteSelectionButton.removeAttribute("disabled");
    const pasteObjectButton
      = document.getElementById("simulator-object-paste");
    pasteObjectButton.setAttribute("disabled", "");
  });
  // Copy button
  const copySelectionButton
    = document.getElementById("simulator-selection-copy");
  copySelectionButton.addEventListener("click", () => {
    cgolObject.extractSelectionToObject(false);
    clipboard = cgolObject.objects.shift();
    clipboardIsObject = false;
    const pasteSelectionButton
      = document.getElementById("simulator-selection-paste");
    pasteSelectionButton.removeAttribute("disabled");
    const pasteObjectButton
      = document.getElementById("simulator-object-paste");
    pasteObjectButton.setAttribute("disabled", "");
  });
  // Delete button
  const deleteSelectionButton
    = document.getElementById("simulator-selection-delete");
  deleteSelectionButton.addEventListener("click", () => {
    cgolObject.selection.visible = false;
    const cellsToRemove = [];
    for (let y = cgolObject.selection.top;
      y <= cgolObject.selection.bottom;
      ++y) {
      for (let x = cgolObject.selection.left;
        x <= cgolObject.selection.right;
        ++x) {
        cellsToRemove.push([x, y]);
      }
    }
    cgolObject.editCells(
      cellsToRemove, 0, ["delete", 1, 0, {"mergeable": false}],
    );
    const simulatorSelectionToolbar
      = document.getElementsByClassName("simulator-selection-toolbar")[0];
    const simulatorSelectionMove
      = document.getElementById("simulator-selection-move");
    simulatorSelectionToolbar.style.display = "none";
    simulatorSelectionMove.style.display = "none";
  });

  // Paste button
  const pasteSelectionButton
    = document.getElementById("simulator-selection-paste");
  pasteSelectionButton.addEventListener("click", () => {
    currentlyPasting = true;
    cgolObject.selection.left = Math.min(
      Math.max(cgolObject.selection.left, 0),
      cgolObject.gridSize - clipboard.width,
    );
    cgolObject.selection.top = Math.min(
      Math.max(cgolObject.selection.top, 0),
      cgolObject.gridSize - clipboard.height,
    );
    cgolObject.selection.right
      = cgolObject.selection.left + clipboard.width - 1;
    cgolObject.selection.bottom
      = cgolObject.selection.top + clipboard.height - 1;
    cgolObject.selection.visible = true;
    cgolObject.objects.unshift(structuredClone(clipboard));
    cgolObject.objects[0].moving = true;
    cgolObject.objects[0].x = cgolObject.selection.left;
    cgolObject.objects[0].y = cgolObject.selection.top;
    changeVisibleToolbarGroup(2);
    updateFloatingToolbars();

    // DEBUG
    console.log(cgolObject.objects);
  });

  // Abort paste button
  const abortPasteButton = document.getElementById("simulator-paste-abort");
  abortPasteButton.addEventListener("click", () => {
    currentlyPasting = false;
    cgolObject.selection.visible = false;
    if (clipboardIsObject) {
      cgolObject.objects.pop();
      cgolObject.compilePattern();
    } else {
      cgolObject.objects.shift();
      cgolObject.forceUpdate();
    }
    updateFloatingToolbars();
    const simulatorSelectionToolbar
      = document.getElementsByClassName("simulator-selection-toolbar")[0];
    const simulatorSelectionMove
      = document.getElementById("simulator-selection-move");
    simulatorSelectionToolbar.style.display = "none";
    simulatorSelectionMove.style.display = "none";
  });
  // Confirm paste button
  const confirmPasteButton = document.getElementById("simulator-paste-confirm");
  confirmPasteButton.addEventListener("click", () => {
    currentlyPasting = false;
    if (clipboardIsObject) {
      cgolObject.objects[cgolObject.objects.length - 1].moving = false;
      cgolObject.objects[cgolObject.objects.length - 1].selected = false;
      cgolObject.compilePattern();
    } else {
      cgolObject.bakeObject(0, true);
      cgolObject.selection.visible = false;
    }
    cgolObject.setState("paste", 1, 0, {"mergeable": false});
    cgolObject.forceUpdate();
    updateFloatingToolbars();
    const simulatorSelectionToolbar
      = document.getElementsByClassName("simulator-selection-toolbar")[0];
    const simulatorSelectionMove
      = document.getElementById("simulator-selection-move");
    simulatorSelectionToolbar.style.display = "none";
    simulatorSelectionMove.style.display = "none";
  });

  // Event handlers for the "move selection" button
  const moveSelectionButton
    = document.getElementById("simulator-selection-move");
  let dragOriginalX;
  let dragOriginalY;
  let originalSelectionX;
  let originalSelectionY;
  let movingObjectIndex;
  function moveSelectionMouseDown(event) {
    const selection = cgolObject.getSelection();
    dragOriginalX = event.pageX;
    dragOriginalY = event.pageY;
    originalSelectionX = selection.left;
    originalSelectionY = selection.top;
    moveSelectionButton.setPointerCapture(event.pointerId);
    if (!currentlyPasting) {
      if (selection.type === "selection") {
        cgolObject.extractSelectionToObject();
        cgolObject.objects[0].moving = true;
        movingObjectIndex = 0;
      } else {
        movingObjectIndex
          = cgolObject.objects.findIndex((object) => object.selected);
      }
    } else {
      if (clipboardIsObject) {
        movingObjectIndex = cgolObject.objects.length - 1;
      } else {
        movingObjectIndex = 0;
      }
    }
  }
  function moveSelectionMouseMove(event) {
    const touch = event.pointerType === "pen" || event.pointerType === "touch";
    if (event.buttons || touch) {
      // Update cgolObject
      const selection = cgolObject.getSelection();
      const cellSize = cgolObject.zoom;
      const selectionWidth = selection.right - selection.left;
      const selectionHeight = selection.bottom - selection.top;
      const deltaX = Math.round((event.pageX - dragOriginalX) / cellSize);
      const deltaY = Math.round((event.pageY - dragOriginalY) / cellSize);
      const newX = Math.min(
        Math.max(originalSelectionX + deltaX, 0),
        cgolObject.gridSize - selectionWidth,
      );
      const newY = Math.min(
        Math.max(originalSelectionY + deltaY, 0),
        cgolObject.gridSize - selectionHeight,
      );
      cgolObject.objects[movingObjectIndex].x = newX;
      cgolObject.objects[movingObjectIndex].y = newY;
      if (selection.type === "selection") {
        cgolObject.selection.left = newX;
        cgolObject.selection.right = newX + selectionWidth - 1;
        cgolObject.selection.top = newY;
        cgolObject.selection.bottom = newY + selectionHeight - 1;
      }
      if (selection.type !== "selection"
        || (currentlyPasting && clipboardIsObject)) {
        cgolObject.compilePattern();
      }
      updateFloatingToolbars();
    }
  }
  function moveSelectionMouseUp(event) {
    moveSelectionButton.releasePointerCapture(event.pointerId);
    if (!currentlyPasting) {
      const selection = cgolObject.getSelection();
      if (selection.type === "selection") {
        cgolObject.bakeObject(0, true);
        cgolObject.setState("cell", 1, 0, {
          "control1": (a) => Math.min(a, 1),
          "mergeable": false,
        });
      } else {
        const deltaX = selection.left - originalSelectionX;
        const deltaY = selection.top - originalSelectionY;
        cgolObject.setState("move", deltaX, deltaY);
      }
    }
  }
  moveSelectionButton.addEventListener("pointerdown", moveSelectionMouseDown);
  moveSelectionButton.addEventListener("pointermove", moveSelectionMouseMove);
  moveSelectionButton.addEventListener("pointerup", moveSelectionMouseUp);

  // Object group event handlers

  // Rotate counterclockwise button
  const rotateCcwObjectButton
    = document.getElementById("simulator-object-rotate-ccw");
  rotateCcwObjectButton.addEventListener("click", () => {
    const selectedObject
      = cgolObject.objects.findIndex((object) => object.selected);
    rotateOrFlip(3, false, selectedObject);
  });
  // Rotate clockwise button
  const rotateCwObjectButton
    = document.getElementById("simulator-object-rotate-cw");
  rotateCwObjectButton.addEventListener("click", () => {
    const selectedObject
      = cgolObject.objects.findIndex((object) => object.selected);
    rotateOrFlip(1, false, selectedObject);
  });
  // Flip horizontally button
  const flipHorizObjectButton
    = document.getElementById("simulator-object-flip-horiz");
  flipHorizObjectButton.addEventListener("click", () => {
    const selectedObject
      = cgolObject.objects.findIndex((object) => object.selected);
    rotateOrFlip(0, true, selectedObject);
  });
  // Flip vertically button
  const flipVertObjectButton
    = document.getElementById("simulator-object-flip-vert");
  flipVertObjectButton.addEventListener("click", () => {
    const selectedObject
      = cgolObject.objects.findIndex((object) => object.selected);
    rotateOrFlip(2, true, selectedObject);
  });
  // Cut button
  const cutObjectButton = document.getElementById("simulator-object-cut");
  cutObjectButton.addEventListener("click", () => {
    const selectedObject
      = cgolObject.objects.findIndex((object) => object.selected);
    clipboard = cgolObject.objects.splice(selectedObject, 1)[0];
    clipboardIsObject = true;
    cgolObject.compilePattern();
    cgolObject.setState("delete", 1, 0, {"mergeable": false});
    const simulatorSelectionToolbar
      = document.getElementsByClassName("simulator-selection-toolbar")[0];
    const simulatorSelectionMove
      = document.getElementById("simulator-selection-move");
    simulatorSelectionToolbar.style.display = "none";
    simulatorSelectionMove.style.display = "none";
    const pasteSelectionButton
      = document.getElementById("simulator-selection-paste");
    pasteSelectionButton.setAttribute("disabled", "");
    const pasteObjectButton = document.getElementById("simulator-object-paste");
    pasteObjectButton.removeAttribute("disabled");
  });
  // Copy button
  const copyObjectButton = document.getElementById("simulator-object-copy");
  copyObjectButton.addEventListener("click", () => {
    const selectedObject
      = cgolObject.objects.findIndex((object) => object.selected);
    clipboard = structuredClone(cgolObject.objects[selectedObject]);
    clipboardIsObject = true;
    const pasteSelectionButton
      = document.getElementById("simulator-selection-paste");
    pasteSelectionButton.setAttribute("disabled", "");
    const pasteObjectButton
      = document.getElementById("simulator-object-paste");
    pasteObjectButton.removeAttribute("disabled");
  });

  // Delete object button
  const deleteObjectButton = document.getElementById("simulator-object-delete");
  deleteObjectButton.addEventListener("click", () => {
    const selectedObjectIndex
      = cgolObject.objects.findIndex((object) => object.selected);
    // Increase the corresponding object's count in the sidebar
    const objectId = cgolObject.objects[selectedObjectIndex].objectMetadata.id;
    const currentAddObjectButton = document.querySelector(
      `.simulator-add-object[data-object="${CSS.escape(objectId)}"]`,
    );
    let objectCount
      = parseInt(currentAddObjectButton.getAttribute("data-count"));
    ++objectCount;
    changeObjectCount(currentAddObjectButton, objectCount);
    // Delete the object
    cgolObject.objects.splice(selectedObjectIndex, 1);
    cgolObject.compilePattern();
    const simulatorSelectionToolbar
      = document.getElementsByClassName("simulator-selection-toolbar")[0];
    const simulatorSelectionMove
      = document.getElementById("simulator-selection-move");
    simulatorSelectionToolbar.style.display = "none";
    simulatorSelectionMove.style.display = "none";
  });

  // Paste object button
  const pasteObjectButton = document.getElementById("simulator-object-paste");
  pasteObjectButton.addEventListener("click", () => {
    currentlyPasting = true;
    clipboard.moving = false;
    clipboard.selected = true;
    /*
     * selection.left and selection.top define the cell
     * where the "paste object" button popped up
     */
    clipboard.x = Math.min(
      Math.max(cgolObject.selection.left, 0),
      cgolObject.gridSize - clipboard.width,
    );
    clipboard.y = Math.min(
      Math.max(cgolObject.selection.top, 0),
      cgolObject.gridSize - clipboard.height,
    );
    cgolObject.objects.push(structuredClone(clipboard));
    changeVisibleToolbarGroup(2);
    updateFloatingToolbars();

    // DEBUG
    console.log(cgolObject.objects);
  });

  // Draw the CGoL simulation
  const now = document.timeline.currentTime;
  cgolObject.draw({}, now);
}

export {createCgolSimulator, resizeSimulator};
