import {create_element, update_root, images} from './utilities.js'

function create_loading_screen() {
    var loading_progress = create_element(
        'span', '0%', {id: 'loading-progress', 'aria-busy': 'true'}
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
    const glider_canvas = document.getElementById('loading-canvas')
    if (!glider_canvas) {
        return undefined
    }
    var root = document.getElementById('conways-story-mode')
    var root_size = Math.min(root.clientWidth, root.clientHeight)
    var canvas_size = Math.round(root_size / 2)
    glider_canvas.setAttribute('width', canvas_size)
    glider_canvas.setAttribute('height', canvas_size)
    const ctx = glider_canvas.getContext('2d')
    
    var glider_phases = [
        [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
        [[0, 1], [2, 1], [1, 2], [2, 2], [1, 3]],
        [[2, 1], [0, 2], [2, 2], [1, 3], [2, 3]],
        [[1, 1], [2, 2], [3, 2], [1, 3], [2, 3]],
    ]
    var cell_size = 8
    var grid_buffer = 3
    var grid_size = Math.ceil(glider_canvas.width / cell_size)
    var current_frame = parseInt(glider_canvas.getAttribute('data-frame'))
    
    var glider_x = -grid_buffer
    var glider_y = -grid_buffer
    var glider_frame = current_frame
    ctx.clearRect(0, 0, glider_canvas.width, glider_canvas.height)
    ctx.fillStyle = window.getComputedStyle(glider_canvas).getPropertyValue('--text-color')
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

function update_progress(percentage) {
    var loading_progress = document.getElementById('loading-progress')
    var loading_container = document.getElementsByClassName('loading-container')[0]
    loading_progress.innerText = `${Math.round(percentage * 100)}%`
    loading_container.style.setProperty('--loading-percentage', percentage)
}

async function load_assets() {
    var tasks_done = 0
    const tasks_to_do = 24
    // Load the cell icons
    const id_to_name_table = {
        2: 'delete-off',
        3: 'delete-on',
        4: 'create-off',
        5: 'create-on',
        6: 'important-off',
        7: 'important-on',
        8: 'unchangeable-off',
        9: 'unchangeable-on',
        10: 'connect-n-off',
        11: 'connect-n-on',
        12: 'connect-ne-off',
        13: 'connect-ne-on',
        14: 'connect-e-off',
        15: 'connect-e-on',
        16: 'connect-se-off',
        17: 'connect-se-on',
        18: 'connect-s-off',
        19: 'connect-s-on',
        20: 'connect-sw-off',
        21: 'connect-sw-on',
        22: 'connect-w-off',
        23: 'connect-w-on',
        24: 'connect-nw-off',
        25: 'connect-nw-on',
    } // 0 and 1 don't get icons
    var promises = Object.values(id_to_name_table).map((name) => {
        return fetch(`https://cdn.jsdelivr.net/gh/squareroot12621/conways-story-mode@cd255ee/images/cell-icons/${name}.svg`)
    })
    var responses = await Promise.all(promises)
    var ids = Object.keys(id_to_name_table)
    for (var response of responses) {
        var blob = await response.blob()
        var url = URL.createObjectURL(blob)
        var image = create_element('img', [], {src: url, width: 50, height: 50})
        var id = ids.shift()
        images[`cell-icon-${id}`] = image
        ++tasks_done
        update_progress(tasks_done / tasks_to_do)
        await Promise((resolve) => setInterval(() => resolve(1), 200)) // DEBUG
    }
}

export {create_loading_screen, load_assets}
