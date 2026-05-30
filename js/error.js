import {createElement, updateRoot} from "./utilities.js";

function getErrorInfo(thrownError) {
  /*
   * If we don't have an Error,
   * try to turn it into something that is an Error
   */
  let processedError = thrownError;
  if (!(thrownError instanceof Error)) {
    if (thrownError?.error) {
      processedError = thrownError.error;
    } else if (thrownError?.reason) {
      processedError = thrownError.reason;
    }
  }
  const errorName = processedError?.name ?? "No name available";
  const errorString
    = thrownError?.message ?? processedError?.message ?? "No message available";
  const errorStack = processedError?.stack ?? "No stack available";
  const errorInfoText = [errorName, errorString, errorStack].join("\n");
  return {"info": errorInfoText, "error": processedError};
}

function createErrorScreen(thrownError) {
  const STOP_SENTINEL = "STOP JAVASCRIPT";

  const errorInfoObject = getErrorInfo(thrownError);
  const errorInfoText = errorInfoObject.info;
  const processedError = errorInfoObject.error;

  // Don't cause an infinite loop with create_error_screen throwing
  if (processedError.message === STOP_SENTINEL) {
    return undefined;
  }

  // Create the HTML
  const headingText = " JavaScript crashed";
  const headingIcon
    = createElement("span", "error", {"class": "icon", "alt": ""});
  const heading = createElement(
    "h1", [headingIcon, headingText], {"class": "script-error-header"},
  );

  const descriptionTextBefore
    = "Uh oh! Something happened in Conway\u2019s Story Mode, "
      + "and it crashed. If you can, ";
  const descriptionLinkText
    = "create a GitHub issue about it.";
  const descriptionTextAfter
    = " Don't forget to include information "
      + "like what happened before it crashed, "
      + "as well as this error text:";
  const descriptionLinkReference = (
    "https://github.com/squareroot12621/conways-story-mode/issues/new/choose");
  const descriptionLink = createElement(
    "a", descriptionLinkText, {"href": descriptionLinkReference},
  );
  const description = createElement(
    "p", [descriptionTextBefore, descriptionLink, descriptionTextAfter],
  );
  const errorInfo = createElement("pre", errorInfoText);
  const scriptErrorContainer = createElement(
    "div", [heading, description, errorInfo],
    {"class": "script-error"},
  );
  updateRoot(scriptErrorContainer);

  // Exit immediately
  throw new Error(STOP_SENTINEL);
}

export {createErrorScreen};
