import {create_level_select} from './level-select.js'
import {create_cgol_simulator} from './simulator.js'
import {create_element, update_root} from './utilities.js'

function create_main_menu() {
    var heading = create_element('h1', "Conway's Story Mode", {class: 'main-title'})
    var button_info = [
        {
            name: 'Play',
            icon: 'play_arrow',
            icon_type: 'icon',
            info: 'Play short 5-minute lessons',
        },
        {
            name: 'Sandbox',
            icon: '\u{F0710}', // The shovel icon is the best we have to a sandbox icon
            icon_type: 'icon-alt',
            info: "Mess around with Conway's Game of Life",
        },
        {
            name: 'Settings',
            icon: 'settings',
            icon_type: 'icon',
            info: 'Change and customize options',
        },
    ]
    var buttons = []
    for (var {name, icon, icon_type, info} of button_info) {
        var button_name = create_element('h2', name, {class: 'main-button-name'})
        var button_icon = create_element('div', icon, {class: 'main-button-icon ' + icon_type})
        var button_info = create_element('div', info, {class: 'main-button-info'})
        buttons.push(create_element(
            'button',
            [button_name, button_icon, button_info],
            {class: 'main-button'},
        ))
    }
    var button_wrapper = create_element('section', buttons, {class: 'main-button-wrapper'})
    var main_wrapper = create_element('div', [heading, button_wrapper], {class: 'main-wrapper'})
    update_root(main_wrapper)

    buttons[0].addEventListener('click', create_level_select) // Play
    buttons[1].addEventListener('click', () => {
        create_cgol_simulator(sandbox=true)
    }) // Sandbox
}

export {create_main_menu}
