import {create_element, update_root} from './utilities.js'

function create_loading_screen() {
    var loading_progress = create_element(
        'span', '42%', {id: 'loading-progress', 'aria-busy': 'true'}
    )
    var loading_text = create_element(
        'p', ['Loading\u2026 ', loading_progress], {class: 'loading-text'}
    )
    var progress_bar = create_element('div', [], {class: 'loading-bar'})
    var loading_container = create_element(
        'div', [loading_text, progress_bar], {class: 'loading-container'}
    )
    loading_container.style.setProperty('--loading-percentage', 0)

    var root = document.getElementById('conways-story-mode')
    var root_size = Math.min(root.clientWidth, root.clientHeight)
    var canvas_size = Math.round(root_size / 2) + 'px'
    var glider_canvas = create_element('canvas', [], {
        id: 'loading-canvas',
        width: canvas_size,
        height: canvas_size,
    })
    update_root(loading_container, glider_canvas)
}

async function load_assets() {
    // CONTINUE
}

export {create_loading_screen, load_assets}
