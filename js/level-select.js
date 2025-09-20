import {create_main_menu} from './main-menu.js'
import {create_element, update_root} from './utilities.js'

function create_level_select() {
    var back_icon = create_element('span', 'arrow_back', {class: 'icon', 'aria-hidden': true})
    var back_button = create_element('button', [back_icon, ' Back'], {class: 'back-button', type: 'button'})

    var units_heading = create_element('h3', 'Units', {class: 'levels-heading'})
    var unit_array = []
    for (var i = 1; i <= 10; ++i) {
        var button = create_element('button', i.toString(), {class: 'level', type: 'button'})
        var tooltip = create_element('div', `Unit ${i.toString()}`, {class: 'level-tooltip'})
        unit_array.push(create_element('li', [button, tooltip]))
    }
    var units = create_element('ol', unit_array, {class: 'levels-units'})
    var units_wrapper = create_element('div', units, {class: 'levels-units-wrapper'})
    
    var lessons_heading = create_element('h3', 'Lessons', {class: 'levels-heading'})
    var lesson_array = []
    for (var i = 1; i <= 10; ++i) {
        var button = create_element('button', i.toString(), {class: 'level', type: 'button'})
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
    for (var timeline_class of ['levels-units-wrapper', 'levels-lessons-wrapper']) {
        var wrapper = document.getElementsByClassName(timeline_class)[0]
        wrapper.style.paddingRight = '0px' // Reset padding temporarily
        var wrapper_width = wrapper.getBoundingClientRect().width
        wrapper.style.paddingRight = (root_width - wrapper_width) + 'px'
    }
    
    // If needed, move the tooltips so they don't go off the screen
    var rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    var edge_buffer = 0.5 * rem
    for (var tooltip of document.getElementsByClassName('level-tooltip')) {
        tooltip.style.display = 'block' // getBoundingClientRect doesn't work with display: none;
        tooltip.style.setProperty('--tooltip-offset', 0) // We also need to reset this
        var tooltip_rect = tooltip.getBoundingClientRect()
        tooltip.style.removeProperty('display')
        if (tooltip.closest('.levels-units-wrapper')) {
            var wrapper_class = '.levels-units-wrapper'
            var inner_class = '.levels-units'
        } else {
            var wrapper_class = '.levels-lessons-wrapper'
            var inner_class = '.levels-lessons'
        }
        var wrapper = tooltip.closest(wrapper_class).getBoundingClientRect()
        var inner = tooltip.closest(inner_class).getBoundingClientRect()
        var container_rect = wrapper.width > inner.width ? wrapper : inner

        var left_distance = tooltip_rect.left - container_rect.left
        var right_distance = container_rect.right - tooltip_rect.right
        if (left_distance < edge_buffer) {
            tooltip.style.setProperty('--tooltip-offset', edge_buffer - left_distance)
        }
        if (right_distance < edge_buffer) {
            tooltip.style.setProperty('--tooltip-offset', right_distance - edge_buffer)
        }
    }
}

export {create_level_select, update_tooltip_locations}
