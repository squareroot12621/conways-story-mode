import {create_element, update_root} from './utilities.js'

function create_loading_screen() {
    var loading_progress = create_element(
        'span', '0%', {id: 'loading-progress', 'aria-busy': 'true'}
    )
    var loading_text = create_element(
        'p', ['Loading\u2026', loading_progress], {class: 'loading-text'}
    )
    var progress_bar = create_element('div', [], {class: 'loading-bar'})
    var loading_container = create_element('div', [loading_text, progress_bar])
    update_root(loading_container)
}

async function load_assets() {
    // CONTINUE
}

export {create_loading_screen, load_assets}
