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

function update_root(...elements) {
    var root = document.getElementById('conways-story-mode')
    root.replaceChildren(...elements)
    var heading_width = '75' // TODO: Change to something more dynamic
    var all_headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6')
    console.log(all_headings)
    for (var heading of all_headings) {
        heading.style.setProperty('font-stretch', heading_width + '%')
        heading.style.setProperty('font-width', heading_width + '%')
    }
}

export {create_element, update_root}
