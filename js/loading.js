import {create_element, update_root} from './utilities.js'

function create_loading_screen() {
    var loading_title = create_element('p', 'Loading\u2026')
    var loading_progress = create_element(
        'p', '(0%)', {id: 'loading-progress', 'aria-busy': 'true'}
    )
    var loading_container = create_element('div', [loading_title, loading_progress])
    update_root(loading_container)
}

async function load_assets() {
    // CONTINUE
}

export {create_loading_screen, load_assets}
