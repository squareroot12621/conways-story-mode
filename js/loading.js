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
    var canvas_size = Math.round(root_size / 2)
    var glider_canvas = create_element('canvas', [], {
        id: 'loading-canvas',
        width: canvas_size,
        height: canvas_size,
        'data-frame': 0,
    })

    update_root(loading_container, glider_canvas)
    update_glider_canvas()
    setInterval(update_glider_canvas, 55) // 18 FPS = 55 ms
}

function update_glider_canvas() {
    var glider_phases = [
        [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
        [[0, 1], [2, 1], [1, 2], [2, 2], [1, 3]],
        [[2, 1], [0, 2], [2, 2], [1, 3], [2, 3]],
        [[1, 1], [2, 2], [3, 2], [1, 3], [2, 3]],
    ]
    var cell_size = 6
    var grid_buffer = 3
    const glider_canvas = document.getElementById('loading-canvas')
    const ctx = glider_canvas.getContext('2d')
    var grid_size = Math.ceil(glider_canvas.clientWidth / cell_size)
    var current_frame = parseInt(glider_canvas.getAttribute('data-frame'))
    
    var glider_x = -grid_buffer
    var glider_y = -grid_buffer
    var glider_frame = current_frame
    ctx.clearRect(0, 0, glider_canvas.clientWidth, glider_canvas.clientHeight)
    ctx.fillStyle = '#E3E5E5'
    while (glider_x < grid_size + grid_buffer && glider_y < grid_size + grid_buffer) {
        glider_x = Math.floor(glider_frame / 4) // - grid_buffer + grid_buffer cancels out
        glider_y = Math.floor(glider_frame / 4) - grid_buffer
        for (var cell of glider_phases[glider_frame % 4]) {
            var cell_x = cell[0] + glider_x
            var cell_y = cell[1] + glider_y
            ctx.fillRect(cell_x * cell_size, cell_y * cell_size, cell_size, cell_size)
        }
        glider_frame += 30
    }

    glider_canvas.setAttribute('data-frame', (current_frame + 1) % 30)
}

async function load_assets() {
    // CONTINUE
}

export {create_loading_screen, load_assets}
