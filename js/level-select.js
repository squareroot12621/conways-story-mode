import {create_main_menu} from './main-menu.js'
import {create_element, update_root} from './utilities.js'

function create_level_select() {
    var back_icon = create_element('span', 'arrow_back', {class: 'icon', alt: ''})
    var back_button = create_element('button', [back_icon, ' Back'], {class: 'back-button'})

    var units_heading = create_element('h3', 'Units', {class: 'levels-heading'})
    var unit_array = []
    for (var i = 1; i <= 10; ++i) {
        var button = create_element('button', i.toString(), {class: 'level'})
        unit_array.push(create_element('li', button))
    }
    var units = create_element('ol', unit_array, {class: 'levels-units'})
    var units_wrapper = create_element('div', units, {class: 'levels-units-wrapper'})
    
    var lessons_heading = create_element('h3', 'Lessons', {class: 'levels-heading'})
    var lesson_array = []
    for (var i = 1; i <= 10; ++i) {
        var button = create_element('button', i.toString(), {class: 'level'})
        lesson_array.push(create_element('li', button))
    }
    var lessons = create_element('ol', lesson_array, {class: 'levels-lessons'})
    var lessons_wrapper = create_element('div', lessons, {class: 'levels-lessons-wrapper'})

    update_root(back_button,
                units_heading, units_wrapper,
                lessons_heading, lessons_wrapper)

    back_button.addEventListener('click', create_main_menu)
}

export {create_level_select}
