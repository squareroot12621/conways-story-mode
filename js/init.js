import {createLoadingScreen, loadAssets} from "./loading.js";
import {createMainMenu} from "./main-menu.js";
import {createErrorScreen} from "./error.js";
import {resizeRoot, throttle} from "./utilities.js";

async function initializeCsm() {
  createLoadingScreen();
  await loadAssets();
  createMainMenu();
}

window.addEventListener("load", initializeCsm);
window.addEventListener("error", createErrorScreen);
window.addEventListener("unhandledrejection", createErrorScreen);
/*
 * window.addEventListener('resize') is too unreliable,
 * so we have to use a ResizeObserver instead
 */
const resizeRootThrottled = throttle(resizeRoot, 100);
const resizeObserver = new ResizeObserver(resizeRootThrottled);
resizeObserver.observe(document.getElementById("conways-story-mode"));
