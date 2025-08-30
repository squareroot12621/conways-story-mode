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

    // If needed, move the tooltips so they don't go off the screen
    var rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    var edge_buffer = 0.5 * rem
    for (var tooltip of document.getElementsByClassName('level-tooltip')) {
        tooltip.style.display = 'block' // getBoundingClientRect doesn't work with display: none;
        var tooltip_rect = tooltip.getBoundingClientRect()
        tooltip.style.removeProperty('display')
        var ol_rect = tooltip.closest('ol').getBoundingClientRect()
        var root_rect = document.getElementById('conways-story-mode').getBoundingClientRect()
        var container_rect = ol_rect.width > root_rect.width ? ol_rect : root_rect

        var left_distance = tooltip_rect.left - container_rect.left
        var right_distance = container_rect.right - tooltip_rect.right
        if (left_distance < edge_buffer) {
            tooltip.style.setProperty('--tooltip-offset', edge_buffer - left_distance)
        }
        console.log((right_distance < edge_buffer ? '! ' : '  ') + right_distance) //DEBUG
        if (right_distance < edge_buffer) {
            tooltip.style.setProperty('--tooltip-offset', right_distance - edge_buffer)
        }
    }
    
    back_button.addEventListener('click', create_main_menu)
}

export {create_level_select}
