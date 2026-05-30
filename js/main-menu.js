import {createLevelSelect} from "./level-select.js";
import {createCgolSimulator} from "./simulator.js";
import {createElement, updateRoot} from "./utilities.js";

function createMainMenu() {
  const heading
    = createElement("h1", "Conway's Story Mode", {"class": "main-title"});
  const BUTTON_INFO = [
    {
      "name": "Play",
      "icon": "play_arrow",
      "iconType": "icon",
      "description": "Play short 5-minute lessons",
    },
    {
      "name": "Sandbox",
      // The shovel icon is the closest we have to a sandbox icon
      "icon": "\u{F0710}",
      "iconType": "icon-alt",
      "description": "Mess around with Conway's Game of Life",
    },
    {
      "name": "Settings",
      "icon": "settings",
      "iconType": "icon",
      "description": "Change and customize options",
    },
  ];
  const buttons = [];
  for (const {name, icon, iconType, description} of BUTTON_INFO) {
    const buttonName = createElement("h2", name, {"class": "main-button-name"});
    const buttonIcon = createElement("div", icon, {
      "class": "main-button-icon " + iconType,
      "aria-hidden": true,
    });
    const buttonDescription
      = createElement("div", description, {"class": "main-button-info"});
    buttons.push(createElement(
      "button",
      [buttonName, buttonIcon, buttonDescription],
      {"class": "main-button", "type": "button"},
    ));
  }
  const buttonWrapper
    = createElement("section", buttons, {"class": "main-button-wrapper"});
  const mainWrapper
    = createElement("div", [heading, buttonWrapper], {"class": "main-wrapper"});
  updateRoot(mainWrapper);

  // Play button
  buttons[0].addEventListener("click", createLevelSelect);
  // Sandbox button
  buttons[1].addEventListener("click", () => {
    createCgolSimulator(true);
  });
  // TODO: Wire up the Settings button
}

export {createMainMenu};
