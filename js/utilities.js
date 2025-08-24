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
    resize_root()
}

function resize_root() {
    var root = document.getElementById('conways-story-mode')
    var width = document.getElementsByClassName('body-wrapper')[0].clientWidth
    if (width >= 640) {
        var heading_width = 100
    } else if (width <= 400) {
        var heading_width = 75
    } else {
        var heading_width = 75 + 25 * (width-400)/240
    }
    var all_headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6')
    for (var heading of all_headings) {
        heading.style.setProperty('font-stretch', heading_width + '%')
        heading.style.setProperty('font-width', heading_width + '%')
    }
}

export {create_element, update_root, resize_root}
