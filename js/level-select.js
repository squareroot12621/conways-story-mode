import {create_main_menu} from './main-menu.js'
import {create_element, update_root} from './utilities.js'

function create_level_select() {
    var back_icon = create_element('span', 'arrow_back', {class: 'icon', alt: ''})
    var back_button = create_element('button', [back_icon, ' Back'], {class: 'back-button'})

    var units_heading = create_element('h3', 'Units', {class: 'levels-heading'})
    var unit_array = []
    for (var i = 1; i <= 10; ++i) {
        var button = create_element('button', i.toString(), {class: 'level'})
        var tooltip = create_element('div', `Unit ${i.toString()}`, {class: 'level-tooltip'})
        unit_array.push(create_element('li', [button, tooltip]))
    }
    var units = create_element('ol', unit_array, {class: 'levels-units'})
    var units_wrapper = create_element('div', units, {class: 'levels-units-wrapper'})
    
    var lessons_heading = create_element('h3', 'Lessons', {class: 'levels-heading'})
    var lesson_array = []
    for (var i = 1; i <= 10; ++i) {
        var button = create_element('button', i.toString(), {class: 'level'})
        var tooltip = create_element('div', `Lesson ${i.toString()}`, {class: 'level-tooltip'})
        lesson_array.push(create_element('li', [button, tooltip]))
    }
    var lessons = create_element('ol', lesson_array, {class: 'levels-lessons'})
    var lessons_wrapper = create_element('div', lessons, {class: 'levels-lessons-wrapper'})

    update_root(back_button,
                units_heading, units_wrapper,
                lessons_heading, lessons_wrapper)

    update_tooltip_locations()
    
    back_button.addEventListener('click', create_main_menu)
}

function update_tooltip_locations() {
    /* Add padding-right to .levels-units-wrapper to keep it at 100% width.
       This ensures that the last tooltip won't break out of the wrapper,
       putting a scroll bar where it definitely shouldn't be. */
    var root_width = document.getElementById('conways-story-mode').getBoundingClientRect().width
    var units_wrapper = document.getElementsByClassName('levels-units-wrapper')[0]
    units_wrapper.style.paddingRight = '0px' // Reset padding temporarily
    var units_wrapper_width = units_wrapper.getBoundingClientRect().width
                              - units_wrapper.style.paddingRight
    units_wrapper.style.paddingRight = (root_width - units_wrapper_width) + 'px'

    console.log(`Changed padding to ${root_width - units_wrapper_width}px`) //DEBUG
    
    // If needed, move the tooltips so they don't go off the screen
    var rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    var edge_buffer = 0.5 * rem
    for (var tooltip of document.getElementsByClassName('level-tooltip')) {
        tooltip.style.display = 'block' // getBoundingClientRect doesn't work with display: none;
        var tooltip_rect = tooltip.getBoundingClientRect()
        tooltip.style.removeProperty('display')
        if (tooltip.closest('.levels-units-wrapper')) {
            var units_wrapper = tooltip.closest('.levels-units-wrapper').getBoundingClientRect()
            var units = tooltip.closest('.levels-units').getBoundingClientRect()
            var container_rect = units_wrapper.width > units.width ? units_wrapper : units
        } else {
            var container = tooltip.closest('.levels-lessons-wrapper')
            var container_rect = container.getBoundingClientRect()
        }

        var left_distance = tooltip_rect.left - container_rect.left
        var right_distance = container_rect.right - tooltip_rect.right
        if (left_distance < edge_buffer) {
            tooltip.style.setProperty('--tooltip-offset', edge_buffer - left_distance)
        }
        if (right_distance < edge_buffer) {
            tooltip.style.setProperty('--tooltip-offset', right_distance - edge_buffer)
        }
    }

    console.log('Moved tooltips') //DEBUG
}

export {create_level_select, update_tooltip_locations}
