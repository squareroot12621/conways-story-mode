function create_element(tag, content=[], attributes={}) {
  var element = document.createElement(tag)
  if (content instanceof Array) {
    element.append(...content)
  } else {
    element.append(content)
  }
  for (var [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value)
  }

  return element
}

export {create_element}
