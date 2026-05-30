import {
  createElement,
  updateRoot,
  images,
  ruleAliases,
  objectData,
} from "./utilities.js";

function createLoadingScreen() {
  const loadingProgress = createElement(
    "span", "0%", {"id": "loading-progress", "aria-busy": "true"},
  );
  const loadingText = createElement(
    "p", ["Loading\u2026 ", loadingProgress], {"class": "loading-text"},
  );
  const progressBar = createElement("div", [], {"class": "loading-bar"});
  const loadingContainer = createElement(
    "div", [loadingText, progressBar], {"class": "loading-container"},
  );
  loadingContainer.style.setProperty("--loading-percentage", 0);

  const root = document.getElementById("conways-story-mode");
  const rootSize = Math.min(root.clientWidth, root.clientHeight);
  const canvasSize = Math.round(rootSize / 2);
  const gliderCanvas = createElement("canvas", [], {
    "id": "loading-canvas",
    "width": canvasSize,
    "height": canvasSize,
    "data-frame": 0,
  });

  updateRoot(loadingContainer, gliderCanvas);
  updateGliderCanvas();
  // 18 FPS = 55 ms
  setInterval(updateGliderCanvas, 55);
}

function updateGliderCanvas() {
  const gliderCanvas = document.getElementById("loading-canvas");
  if (!gliderCanvas) {
    return undefined;
  }
  const root = document.getElementById("conways-story-mode");
  const rootSize = Math.min(root.clientWidth, root.clientHeight);
  const canvasSize = Math.round(rootSize / 2);
  gliderCanvas.setAttribute("width", canvasSize);
  gliderCanvas.setAttribute("height", canvasSize);
  const ctx = gliderCanvas.getContext("2d");

  const GLIDER_PHASES = [
    [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
    [[0, 1], [2, 1], [1, 2], [2, 2], [1, 3]],
    [[2, 1], [0, 2], [2, 2], [1, 3], [2, 3]],
    [[1, 1], [2, 2], [3, 2], [1, 3], [2, 3]],
  ];
  const CELL_SIZE = 8;
  const GRID_BUFFER = 3;
  const gridSize = Math.ceil(gliderCanvas.width / CELL_SIZE);
  const currentFrame = parseInt(gliderCanvas.getAttribute("data-frame"));

  let gliderX = -GRID_BUFFER;
  let gliderY = -GRID_BUFFER;
  let gliderFrame = currentFrame;
  ctx.clearRect(0, 0, gliderCanvas.width, gliderCanvas.height);
  ctx.fillStyle
    = window.getComputedStyle(gliderCanvas).getPropertyValue("--text-color");
  while (gliderX < gridSize + GRID_BUFFER && gliderY < gridSize + GRID_BUFFER) {
    // - GRID_BUFFER + GRID_BUFFER cancels out
    gliderX = Math.floor(gliderFrame / 4);
    gliderY = Math.floor(gliderFrame / 4) - GRID_BUFFER;
    for (const cell of GLIDER_PHASES[gliderFrame % 4]) {
      const cellX = cell[0] + gliderX;
      const cellY = cell[1] + gliderY;
      ctx.fillRect(cellX * CELL_SIZE, cellY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
    gliderFrame += 30;
  }

  gliderCanvas.setAttribute("data-frame", (currentFrame + 1) % 30);
}

function updateProgress(percentage) {
  const loadingProgress = document.getElementById("loading-progress");
  const loadingContainer
    = document.getElementsByClassName("loading-container")[0];
  loadingProgress.innerText = `${Math.round(percentage * 100)}%`;
  loadingContainer.style.setProperty("--loading-percentage", percentage);
}

async function loadAssets() {
  let tasksDone = 0;
  const tasksToDo = 26;

  // Load the cell icons
  const idToNameTable = {
    // 0 and 1 don't get icons
    "2": "delete-off",
    "3": "delete-on",
    "4": "create-off",
    "5": "create-on",
    "6": "important-off",
    "7": "important-on",
    "8": "unchangeable-off",
    "9": "unchangeable-on",
    "10": "connect-n-off",
    "11": "connect-n-on",
    "12": "connect-ne-off",
    "13": "connect-ne-on",
    "14": "connect-e-off",
    "15": "connect-e-on",
    "16": "connect-se-off",
    "17": "connect-se-on",
    "18": "connect-s-off",
    "19": "connect-s-on",
    "20": "connect-sw-off",
    "21": "connect-sw-on",
    "22": "connect-w-off",
    "23": "connect-w-on",
    "24": "connect-nw-off",
    "25": "connect-nw-on",
  };
  const promises = Object.values(idToNameTable).map((name) => {
    return fetch(
      `https://cdn.jsdelivr.net/gh/squareroot12621/conways-story-mode@a3132b3/`
      + `images/cell-icons/${name}.svg`,
    );
  });
  const responses = await Promise.all(promises);
  const ids = Object.keys(idToNameTable);
  for (const response of responses) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const image
      = createElement("img", [], {"src": url, "width": 50, "height": 50});
    const id = ids.shift();
    images[`cell-icon-${id}`] = image;
    ++tasksDone;
    updateProgress(tasksDone / tasksToDo);
  }

  // Load the rule aliases
  const aliasObjectResponse = await fetch(
    "https://cdn.jsdelivr.net/gh/squareroot12621/conways-story-mode/"
    + "data/rule-aliases.json",
  );
  const aliasObjectJson = await aliasObjectResponse.json();
  // JavaScript gets mad when trying to assign ruleAliases directly
  for (const [key, value] of Object.entries(aliasObjectJson)) {
    ruleAliases[key] = value;
  }

  // Load the library object JSON
  const libraryObjectResponse = await fetch(
    "https://cdn.jsdelivr.net/gh/squareroot12621/conways-story-mode@a3132b3/"
    + "data/library-objects.json",
  );
  const libraryObjectJson = await libraryObjectResponse.json();
  // JavaScript gets mad when trying to assign objectData directly
  for (const [key, value] of Object.entries(libraryObjectJson)) {
    objectData[key] = value;
  }
  ++tasksDone;
  updateProgress(tasksDone / tasksToDo);
}

export {createLoadingScreen, loadAssets};
