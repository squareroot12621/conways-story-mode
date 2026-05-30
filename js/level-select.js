import {createMainMenu} from "./main-menu.js";
import {createElement, updateRoot} from "./utilities.js";

function createLevelSelect() {
  const backIcon = createElement(
    "span", "arrow_back", {"class": "icon", "aria-hidden": true},
  );
  const backButton = createElement(
    "button", [backIcon, " Back"], {"class": "back-button", "type": "button"},
  );

  const unitsHeading = createElement(
    "h3", "Units", {"class": "levels-heading"},
  );
  const unitArray = [];
  for (let i = 1; i <= 10; ++i) {
    const button = createElement(
      "button", i.toString(), {"class": "level", "type": "button"},
    );
    const tooltip = createElement(
      "div", `Unit ${i.toString()}`, {"class": "level-tooltip"},
    );
    unitArray.push(createElement("li", [button, tooltip]));
  }
  const units = createElement("ol", unitArray, {"class": "levels-units"});
  const unitsWrapper = createElement(
    "div", units, {"class": "levels-units-wrapper"},
  );

  const lessonsHeading = createElement(
    "h3", "Lessons", {"class": "levels-heading"},
  );
  const lessonArray = [];
  for (let i = 1; i <= 10; ++i) {
    const button = createElement(
      "button", i.toString(), {"class": "level", "type": "button"},
    );
    const tooltip = createElement(
      "div", `Lesson ${i.toString()}`, {"class": "level-tooltip"},
    );
    lessonArray.push(createElement("li", [button, tooltip]));
  }
  const lessons = createElement("ol", lessonArray, {"class": "levels-lessons"});
  const lessonsWrapper = createElement(
    "div", lessons, {"class": "levels-lessons-wrapper"},
  );

  updateRoot(
    backButton,
    unitsHeading,
    unitsWrapper,
    lessonsHeading,
    lessonsWrapper,
  );

  updateTooltipLocations();

  backButton.addEventListener("click", createMainMenu);
}

function updateTooltipLocations() {
  const TIMELINE_CLASSES = ["levels-units-wrapper", "levels-lessons-wrapper"];

  /*
   * Add padding-right to .levels-units-wrapper to keep it at 100% width.
   * This ensures that the last tooltip won't break out of the wrapper,
   * putting a scroll bar where it definitely shouldn't be.
   */
  const rootWidth = document
    .getElementById("conways-story-mode")
    .getBoundingClientRect()
    .width;
  for (const timelineClass of TIMELINE_CLASSES) {
    const wrapper = document.getElementsByClassName(timelineClass)[0];
    // Reset padding temporarily
    wrapper.style.paddingRight = "0px";
    const wrapperWidth = wrapper.getBoundingClientRect().width;
    wrapper.style.paddingRight = (rootWidth - wrapperWidth) + "px";
  }

  // If needed, move the tooltips so they don't go off the screen
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const edgeBuffer = 0.5 * rem;
  for (const tooltip of document.getElementsByClassName("level-tooltip")) {
    /*
     * getBoundingClientRect doesn't work with display: none;
     * or a nonzero --tooltip-offset
     */
    tooltip.style.display = "block";
    tooltip.style.setProperty("--tooltip-offset", 0);
    const tooltipRect = tooltip.getBoundingClientRect();
    tooltip.style.removeProperty("display");
    let wrapperClass;
    let innerClass;
    if (tooltip.closest(".levels-units-wrapper")) {
      wrapperClass = ".levels-units-wrapper";
      innerClass = ".levels-units";
    } else {
      wrapperClass = ".levels-lessons-wrapper";
      innerClass = ".levels-lessons";
    }
    const wrapper = tooltip.closest(wrapperClass).getBoundingClientRect();
    const inner = tooltip.closest(innerClass).getBoundingClientRect();
    const containerRect = wrapper.width > inner.width ? wrapper : inner;

    const leftDistance = tooltipRect.left - containerRect.left;
    const rightDistance = containerRect.right - tooltipRect.right;
    if (leftDistance < edgeBuffer) {
      tooltip.style.setProperty("--tooltip-offset", edgeBuffer - leftDistance);
    }
    if (rightDistance < edgeBuffer) {
      tooltip.style.setProperty("--tooltip-offset", rightDistance - edgeBuffer);
    }
  }
}

export {createLevelSelect, updateTooltipLocations};
