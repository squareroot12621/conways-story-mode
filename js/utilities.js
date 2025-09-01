import {update_tooltip_locations} from './level-select.js'

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
    // Add a data-portrait attribute to #conways-story-mode
    var root = document.getElementById('conways-story-mode')
    root.setAttribute('data-portrait', (root.clientWidth <= root.clientHeight).toString())
    
    // Squish headings on small screens
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
        var heading_type = parseInt(heading.tagName[1])
        // Smaller headings don't need to be squished as much
        var current_heading_width = 100 - (100 - heading_width) / (1.6 ** (heading_type - 1))
        heading.style.setProperty('font-stretch', current_heading_width + '%')
        heading.style.setProperty('font-width', current_heading_width + '%')
    }

    // Update the tooltips (if they exist)
    if (document.getElementsByClassName('levels-units').length) {
        update_tooltip_locations()
    }
}

export {create_element, update_root, resize_root}
