import {create_element, update_root} from './utilities.js'

function create_loading_screen() {
    var heading = create_element('h1', 'This is a test')
    update_root(heading)
}

async function load_assets() {
    // CONTINUE
}

export {create_loading_screen, load_assets}
