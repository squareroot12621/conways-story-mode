import {update_tooltip_locations} from './level-select.js'
import {resize_simulator} from './simulator.js'

var images = {}

function create_element(tag, content=[], attributes={}) {
    var svg_element_list = [
        'animate', 'animateMotion', 'animateTransform',
        'circle', 'clipPath', 'defs', 'desc', 'ellipse',
        'feBlend', 'feColorMatrix', 'feComponentTransfer',
        'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
        'feDisplacementMap', 'feDistantLight', 'feDropShadow',
        'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
        'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
        'feMorphology', 'feOffset', 'fePointLight',
        'feSpecularLighting', 'feSpotLight', 'feTile',
        'feTurbulence', 'filter', 'foreignObject', 'g',
        'image', 'line', 'linearGradient', 'marker', 'mask',
        'metadata', 'mpath', 'path', 'pattern', 'polygon',
        'polyline', 'radialGradient', 'rect', 'set', 'stop',
        'style', 'svg', 'switch', 'symbol', 'text', 'textPath',
        'tspan', 'use', 'view',
        /* 'a', 'script', and 'title' are omitted
           since they're also used outside of SVG */
    ]
    if (svg_element_list.includes(tag)) {
        var element = document.createElementNS('http://www.w3.org/2000/svg', tag)
    } else if (Object.hasOwn(attributes, 'xmlns')) {
        var element = document.createElementNS(attributes['xmlns'], tag)
    } else {
        var element = document.createElement(tag)
    }
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
    /* Set the height of the body-wrapper
       (fixes a bug on Chrome where 100vh is too tall) */
    var body_wrapper = document.getElementsByClassName('body-wrapper')[0]
    body_wrapper.style.height = window.innerHeight + 'px'
    
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

    // Resize the simulator (if it exists)
    if (document.getElementsByClassName('simulator-wrapper').length) {
        resize_simulator()
    }
}

// Adapted from https://stackoverflow.com/a/27078401
// Simplified to always fire on the leading and trailing edges
function throttle(func, wait) {
  var context, args, result
  var timeout = null
  var previous = 0
  var later = function() {
    previous = Date.now()
    timeout = null
    result = func.apply(context, args)
    if (!timeout) {
      context = args = null
    }
  }
  return function() {
    var now = Date.now()
    var remaining = wait - (now - previous)
    context = this
    args = arguments
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      result = func.apply(context, args)
      if (!timeout) {
        context = args = null
      }
    } else if (!timeout) {
      timeout = setTimeout(later, remaining)
    }
    return result
  }
}

export {images, create_element, update_root, resize_root, throttle}
