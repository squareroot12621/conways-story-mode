import {updateTooltipLocations} from "./level-select.js";
import {resizeSimulator} from "./simulator.js";

const images = {};
const ruleAliases = {};
const lessonData = {};
const objectData = {};

function createElement(tag, content = [], attributes = {}) {
  /*
   * 'a', 'script', and 'title' are omitted
   * since they're also used outside of SVG
   */
  /* eslint-disable @stylistic/array-element-newline */
  const SVG_ELEMENT_LIST = [
    "animate", "animateMotion", "animateTransform", "circle", "clipPath",
    "defs", "desc", "ellipse", "feBlend", "feColorMatrix",
    "feComponentTransfer", "feComposite", "feConvolveMatrix",
    "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow",
    "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur",
    "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset",
    "fePointLight", "feSpecularLighting", "feSpotLight", "feTile",
    "feTurbulence", "filter", "foreignObject", "g", "image", "line",
    "linearGradient", "marker", "mask", "metadata", "mpath", "path", "pattern",
    "polygon", "polyline", "radialGradient", "rect", "set", "stop", "style",
    "svg", "switch", "symbol", "text", "textPath", "tspan", "use", "view",
  ];
  /* eslint-enable @stylistic/array-element-newline */

  let element;
  if (SVG_ELEMENT_LIST.includes(tag)) {
    element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  } else if (Object.hasOwn(attributes, "xmlns")) {
    element = document.createElementNS(attributes["xmlns"], tag);
  } else {
    element = document.createElement(tag);
  }
  if (content instanceof Array) {
    element.append(...content);
  } else {
    element.append(content);
  }
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}

function updateRoot(...elements) {
  const root = document.getElementById("conways-story-mode");
  root.replaceChildren(...elements);
  resizeRoot();
}

function resizeRoot() {
  // Add a data-portrait attribute to #conways-story-mode
  const root = document.getElementById("conways-story-mode");
  root.setAttribute(
    "data-portrait", (root.clientWidth <= root.clientHeight).toString(),
  );

  // Squish headings on small screens
  const width = document.getElementsByClassName("body-wrapper")[0].clientWidth;
  let headingWidth;
  if (width >= 640) {
    headingWidth = 100;
  } else if (width <= 400) {
    headingWidth = 75;
  } else {
    headingWidth = 75 + 25 * (width - 400) / 240;
  }
  const allHeadings = root.querySelectorAll("h1, h2, h3, h4, h5, h6");
  for (const heading of allHeadings) {
    const headingType = parseInt(heading.tagName[1]);
    // Smaller headings don't need to be squished as much
    const currentHeadingWidth
      = 100 - (100 - headingWidth) / (1.6 ** (headingType - 1));
    heading.style.setProperty("font-stretch", currentHeadingWidth + "%");
    heading.style.setProperty("font-width", currentHeadingWidth + "%");
  }

  // Update the tooltips (if they exist)
  if (document.getElementsByClassName("levels-units").length) {
    updateTooltipLocations();
  }

  // Resize the simulator (if it exists)
  if (document.getElementsByClassName("simulator-wrapper").length) {
    resizeSimulator();
  }
}

/*
 * Adapted from https://stackoverflow.com/a/27078401
 * Simplified to always fire on the leading and trailing edges
 */
function throttle(func, wait) {
  let context, args, result;
  let timeout = null;
  let previous = 0;
  const later = function () {
    previous = Date.now();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) {
      context = args = null;
    }
  };
  return function () {
    const now = Date.now();
    const remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      if (!timeout) {
        context = args = null;
      }
    } else if (!timeout) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
}

export {
  images,
  ruleAliases,
  lessonData,
  objectData,
  createElement,
  updateRoot,
  resizeRoot,
  throttle,
};
