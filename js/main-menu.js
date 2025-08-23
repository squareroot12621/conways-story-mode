import {create_element, update_root} from './utilities.js'

function create_main_menu() {
    var heading = create_element('h2', "Conway's Story Mode")

    update_root(heading)
}

export {create_main_menu}
