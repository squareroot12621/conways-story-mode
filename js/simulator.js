import {create_main_menu} from './main-menu.js'
import {CGoL} from './cgol.js'
import {create_element, update_root, throttle} from './utilities.js'

var cgol_object = null

function create_cgol_simulator(sandbox, objective=null, library=null) {
  var sidebar = create_simulator_sidebar(sandbox, objective, library)
  var simulator = create_simulator_main(sandbox)
  
  var simulator_wrapper = create_element('div', [sidebar, simulator], {class: 'simulator-wrapper'})
  update_root(simulator_wrapper)

  resize_simulator()

  create_event_handlers(sandbox)
}


function create_simulator_sidebar(sandbox, objective=null, library=null) {
  var back_icon = create_element('span', 'arrow_back', {class: 'icon', 'aria-hidden': true})
  var back_button = create_element('button', [back_icon, ' Back'], {class: 'back-button'})
  var close_menu_icon = create_element('span', 'arrow_left', {class: 'icon', 'aria-hidden': true})
  var close_menu_button = create_element(
    'button', close_menu_icon, {class: 'invisible-button', 'aria-label': 'Close sidebar'}
  )
  
  if (objective !== null) {
    var mission_icon = create_element('span', 'list_alt', {class: 'icon', 'aria-hidden': true})
    var mission_heading = create_element('h3', [mission_icon, ' Mission'])
    var mission_text = []
    for (var line of objective.split('\n')) {
      mission_text.push(create_element('p', line))
    }
    var mission_wrapper = create_element(
      'div', [mission_heading].concat(mission_text), {class: 'simulator-mission-wrapper'}
    )
  }
  library ??= [] // TODO: Change to everything you've learned so far
  var library_icon = create_element('span', 'menu_book', {class: 'icon', 'aria-hidden': true})
  var library_heading = create_element('h3', [library_icon, ' Library'])
  if (library.length) {
    var library_items = []
    for (var object of library) {
      var item_name = `${object.count}\u00D7 ${object.id}`
      library_items.push(create_element('li', item_name))
    }
    var library_list = create_element('ul', library_items, {class: 'simulator-library-list'})
  } else {
    var library_list = create_element('p', 'No objects.', {class: 'simulator-library-empty'})
  }
  var library_wrapper = create_element(
    'div', [library_heading].concat(library_list), {class: 'simulator-library-wrapper'}
  )

  var sidebar_top = create_element('div', [back_button, close_menu_button], {class: 'simulator-sidebar-top'})
  
  var sidebar_main = create_element(
    'div',
    objective === null ? [library_wrapper] : [mission_wrapper, library_wrapper],
    {class: 'simulator-sidebar-main'}
  )

  if (!sandbox) { // Sandbox doesn't have any hints
    var lightbulb_icon = create_element('span', 'lightbulb_2', {class: 'icon', 'aria-hidden': true})
    var hint_button = create_element('button', lightbulb_icon, {class: 'invisible-button', 'aria-label': 'Show hint'})
    var hint_tooltip = create_element('div', 'Need a hint?', {class: 'hint-tooltip'})
    var hint_wrapper = create_element('div', [hint_button, hint_tooltip], {class: 'hint-button'})
  }
  var reset_icon = create_element('span', 'replay', {class: 'icon', 'aria-hidden': true})
  var reset_button = create_element('button', reset_icon, {class: 'invisible-button', 'aria-label': 'Reset level'})
  var sidebar_bottom = create_element(
    'div', sandbox ? [reset_button] : [hint_wrapper, reset_button], {class: 'simulator-sidebar-bottom'}
  )
  var sidebar = create_element(
    'article', [sidebar_top, sidebar_main, sidebar_bottom], {class: 'simulator-sidebar'}
  )
  
  return sidebar
}


function create_simulator_main(sandbox) {  
  // The button that opens the sidebar
  var sidebar_open = create_element(
    'button', 'arrow_right', {class: 'simulator-toolbar-item', id: 'sidebar-open', 'aria-label': 'Open sidebar'}
  )
  sidebar_open.style.display = 'none'
  /* The tool selector. I can't just use <select>/<option>
     because you can't put icons in <option> elements, unfortunately. */
  var tools = [
    {icon: 'edit', name: 'Draw'},
    {icon: 'vignette_2', name: 'Object'},
    {icon: 'select', name: 'Select'},
    {icon: 'pan_tool', name: 'Pan'},
  ]
  var tool_array = []
  for (var {icon, name} of tools) {
    var tool_icon = create_element('span', icon, {class: 'icon', 'aria-hidden': true})
    tool_array.push(create_element('div', [tool_icon, ' ' + name], {class: 'simulator-option', role: 'option'}))
  }
  var tool_selected = create_element('button', tools[0].icon, {
    class: 'simulator-toolbar-item',
    tabindex: 0, // Fix a bug on Safari
  })
  var tools_inner = create_element('div', tool_array, {class: 'simulator-option-wrapper'})
  var tools_outer = create_element('div', tools_inner, {id: 'simulator-options'})
  tools_outer.style.display = 'none'
  tool_array[0].toggleAttribute('data-selected')
  var tool_selector = create_element('div', [tool_selected, tools_outer], {
    id: 'simulator-tool',
    role: 'listbox',
    'data-tool': 'draw',
    'aria-label': 'Currently using Draw. Change tool:'
  })
  var tool_wrapper = create_element('div', tool_selector, {class: 'simulator-toolbar-item'})
  // Reset, step back, step forward, and play buttons
  var gen_0_button = create_element(
    'button', 'skip_previous', {class: 'simulator-toolbar-item', id: 'simulator-reset', 'aria-label': 'Reset to generation 0'}
  )
  /* We can't just do scale: -1 because that'll make the GPU kick in,
     and that kills the hinting and makes everything blurry.
     So instead of letting the GPU do that, we do it ourselves with the SVG. */
  var back_path = create_element(
    'path', [], {d: 'M 720 -240 v -480 h -80 v 480 h 80 Z m -160 0 -400 -240 400 -240 v 480 Z'}
  )
  var back_svg = create_element('svg', back_path, {
    viewBox: '0 -960 960 960',
    width: '1em',
    height: '1em',
    fill: 'currentColor',
  })
  var back_button = create_element('button', back_svg, {
    class: 'simulator-toolbar-item',
    id: 'simulator-back',
    'aria-label': 'Step back 1 generation',
    disabled: '', // We're at generation 0 right now so we can't step back
  })
  var step_button = create_element(
    'button', 'resume', {class: 'simulator-toolbar-item', id: 'simulator-step', 'aria-label': 'Step forward 1 generation'}
  )
  var play_button = create_element(
    'button', 'play_arrow', {class: 'simulator-toolbar-item', id: 'simulator-play', 'aria-label': 'Play simulation'}
  )
  // The speed slider
  var slider = create_element('input', [], {
    type: 'range',
    min: 0,
    max: 1,
    step: 'any',
    class: 'slider-true',
    'aria-label': '5 generations per second',
  })
  slider.value = Math.log(95/59) / Math.log(10) // Found with WolframAlpha
  var slider_value = create_element('div', '5/s', {class: 'slider-value', 'aria-hidden': true})
  var slider_inner = create_element(
    'div', [slider, slider_value], {class: 'slider-wrapper'}
  )
  var slider_outer = create_element(
    'div', slider_inner, {id: 'simulator-speed-wrapper'}
  )
  slider_outer.style.display = 'none'
  var speed_button = create_element(
    'button', 'speed', {
      'aria-label': 'Change simulation speed',
      class: 'simulator-toolbar-item',
      id: 'simulator-speed-button',
      tabindex: 0, // Fix a bug on Safari
      type: 'button',
    }
  )
  var speed_wrapper = create_element(
    'div', [speed_button, slider_outer], {id: 'simulator-speed'}
  )
  // The zoom slider
  var zoom_slider = create_element('input', [], {
    type: 'range',
    min: 0,
    max: 1,
    step: 'any',
    class: 'slider-true',
    'aria-labelledby': 'zoom-slider-label',
  })
  zoom_slider.value = Math.log(20) / Math.log(50)
  var zoom_slider_value = create_element('div', 'Zoom 20', {class: 'slider-value', id: 'zoom-slider-label'})
  var zoom_slider_inner = create_element(
    'div', [zoom_slider, zoom_slider_value], {class: 'slider-wrapper'}
  )
  var zoom_slider_outer = create_element(
    'div', zoom_slider_inner, {id: 'simulator-zoom-wrapper'}
  )
  zoom_slider_outer.style.display = 'none'
  var zoom_button = create_element(
    'button', 'zoom_in', {
      'aria-label': 'Change zoom level',
      class: 'simulator-toolbar-item',
      id: 'simulator-zoom-button',
      tabindex: 0, // Fix a bug on Safari
      type: 'button',
    }
  )
  var zoom_wrapper = create_element(
    'div', [zoom_button, zoom_slider_outer], {id: 'simulator-zoom'}
  )
  // The top toolbar
  var toolbar_top = create_element(
    'section',
    [sidebar_open, tool_wrapper,
     gen_0_button, back_button, step_button, play_button,
     speed_wrapper, zoom_wrapper],
    {class: 'simulator-toolbar-top'},
  )

  // The canvas in the middle
  var canvas = create_element('canvas', "Sorry, your browser doesn't support the <canvas> element.", {id: 'simulator-cgol'})
  // Resize the canvas so it doesn't get stretched weirdly
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight

  // Buttons in the floating toolbar
  var rotate_ccw_selection_button = create_element(
    'button', 'rotate_left', {
      'aria-label': 'Rotate selection counterclockwise',
      class: 'simulator-toolbar-item',
      id: 'simulator-selection-rotate-ccw',
      type: 'button',
    }
  )
  var rotate_cw_selection_button = create_element(
    'button', 'rotate_right', {
      'aria-label': 'Rotate selection clockwise',
      class: 'simulator-toolbar-item',
      id: 'simulator-selection-rotate-cw',
      type: 'button',
    }
  )
  var flip_horiz_selection_button = create_element(
    'button', 'flip', {
      'aria-label': 'Flip selection horizontally',
      class: 'simulator-toolbar-item',
      id: 'simulator-selection-flip-horiz',
      type: 'button',
    }
  )
  var flip_vert_selection_button = create_element(
    'button', '\u{F10E8}', {
      'aria-label': 'Flip selection vertically',
      class: 'simulator-toolbar-item icon-alt',
      id: 'simulator-selection-flip-vert',
      type: 'button',
    }
  )
  var cut_selection_button = create_element(
    'button', 'cut', {
      'aria-label': 'Cut selection',
      class: 'simulator-toolbar-item',
      id: 'simulator-selection-cut',
      type: 'button',
    }
  )
  var copy_selection_button = create_element(
    'button', 'content_copy', {
      'aria-label': 'Copy selection',
      class: 'simulator-toolbar-item',
      id: 'simulator-selection-copy',
      type: 'button',
    }
  )
  var select_objects_selection_button = create_element(
    'button', 'vignette_2', {
      'aria-label': 'Select objects in selection',
      class: 'simulator-toolbar-item',
      id: 'simulator-selection-select-objects',
      type: 'button',
    }
  )
  var delete_selection_button = create_element(
    'button', 'delete', {
      'aria-label': 'Delete selection',
      class: 'simulator-toolbar-item',
      id: 'simulator-selection-delete',
      type: 'button',
    }
  )
  // The floating toolbar when a selection is made
  var selection_toolbar = create_element(
    'section',
    [
      rotate_ccw_selection_button,
      rotate_cw_selection_button,
      flip_horiz_selection_button,
      flip_vert_selection_button,
      cut_selection_button,
      copy_selection_button,
      select_objects_selection_button,
      delete_selection_button,
    ],
    {class: 'simulator-selection-toolbar'},
  )
  selection_toolbar.style.display = 'none'

  // The floating "move selection" button
  var selection_move = create_element(
    'button', 'open_with', {
      'aria-label': 'Move selection',
      class: 'simulator-toolbar-item',
      id: 'simulator-selection-move',
      type: 'button',
    }
  )
  selection_move.style.display = 'none'
  
  // The "generations" statistic
  var generations_stat = create_element(
    'div', 'Gen. 0', {id: 'simulator-stat-generations', 'aria-label': 'Generation 0'}
  )
  // The other statistics
  var population_stat = create_element('div', '0 cells', {id: 'simulator-stat-population'})
  var bounding_box_stat = create_element(
    'div', '0\u00D70', {id: 'simulator-stat-bounding-box', 'aria-label': 'Bounding box: 0 by 0'}
  )
  var extra_stats_inner = create_element(
    'div', [population_stat, bounding_box_stat], {class: 'extra-stats-inner'}
  )
  var extra_stats_outer = create_element(
    'div', extra_stats_inner, {id: 'extra-stats-wrapper'}
  )
  extra_stats_outer.style.display = 'none'
  var extra_stats_button = create_element(
    'button', 'bar_chart', {
      'aria-label': 'Toggle extra statistics',
      class: 'simulator-toolbar-item',
      id: 'extra-stats-button',
      tabindex: 0, // Fix a bug on Safari
      type: 'button',
    }
  )
  var extra_stats_wrapper = create_element(
    'div', [extra_stats_button, extra_stats_outer], {id: 'simulator-extra-stats'}
  )
  // Undo and redo buttons
  var undo_button = create_element('button', 'undo', {
    class: 'simulator-toolbar-item',
    id: 'simulator-undo',
    'aria-label': 'Undo',
    disabled: '', // We haven't done anything yet so we can't undo
  })
  var redo_button = create_element('button', 'redo', {
    class: 'simulator-toolbar-item',
    id: 'simulator-redo',
    'aria-label': 'Redo',
    disabled: '', // We haven't done anything yet so we can't redo
  })
  // The settings button
  var all_extra_options = [
    {icon: 'replay', name: 'Restart'},
    {icon: 'upload', name: 'Import RLE'},
    {icon: 'content_copy', name: 'Copy RLE'},
    {icon: 'settings', name: 'Settings'},
  ]
  var settings_button = create_element(
    'button', 'more_vert', {
      class: 'simulator-toolbar-item',
      id: 'simulator-settings',
      'aria-label': 'Toggle options',
      tabindex: 0, // Fix a bug on Safari
    }
  )
  var extra_option_array = []
  for (var {icon, name} of all_extra_options) {
    var option_icon = create_element('span', icon, {class: 'icon', 'aria-hidden': true})
    extra_option_array.push(create_element('div', [option_icon, ' ' + name], {class: 'simulator-option'}))
  }
  var extra_option_wrapper = create_element('div', extra_option_array, {class: 'simulator-option-wrapper'})
  var extra_options = create_element('div', extra_option_wrapper, {id: 'simulator-extra-options'})
  extra_options.style.display = 'none'
  var settings_wrapper = create_element(
    'div', [settings_button, extra_options], {id: 'simulator-settings-wrapper'}
  )
  // The bottom toolbar
  var toolbar_bottom = create_element(
    'section',
    [generations_stat, extra_stats_wrapper, undo_button, redo_button, settings_wrapper],
    {class: 'simulator-toolbar-bottom'}
  )
  
  var simulator = create_element(
    'article',
    [toolbar_top, canvas, selection_toolbar, selection_move, toolbar_bottom],
    {class: 'simulator-main'},
  )

  return simulator
}


function resize_canvas() {
  // Resize the canvas so it doesn't get stretched weirdly
  var canvas = document.getElementById('simulator-cgol')
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
}
function update_floating_toolbars() {
  var simulator_selection_toolbar = document.getElementsByClassName('simulator-selection-toolbar')[0]
  var simulator_selection_move = document.getElementById('simulator-selection-move')
  if (cgol_object.selection.visible) {
    var toolbar_position = cgol_object.board_to_canvas_coordinates(
      (cgol_object.selection.left + cgol_object.selection.right + 1) / 2,
      cgol_object.selection.top,
    )
    var move_position = cgol_object.board_to_canvas_coordinates(
      cgol_object.selection.right + 1,
      cgol_object.selection.top,
    )
    simulator_selection_toolbar.style.display = 'block'
    simulator_selection_toolbar.style.left = toolbar_position.x + 'px'
    simulator_selection_toolbar.style.top = toolbar_position.y + 'px'
    simulator_selection_move.style.display = 'block'
    simulator_selection_move.style.left = move_position.x + 'px'
    simulator_selection_move.style.top = move_position.y + 'px'
  }
}

function resize_simulator() {
  // Change direction of menu arrows
  var root = document.getElementById('conways-story-mode')
  var portrait = root.getAttribute('data-portrait') === 'true'
  var sidebar_top = document.getElementsByClassName('simulator-sidebar-top')[0]
  var close_menu_icon = sidebar_top.children[1].children[0]
  close_menu_icon.replaceChildren(portrait ? 'arrow_drop_up' : 'arrow_left')
  var open_menu_icon = document.getElementById('sidebar-open')
  open_menu_icon.replaceChildren(portrait ? 'arrow_drop_down' : 'arrow_right')

  // Change --button-stretch of the top toolbar
  var toolbar_top = document.getElementsByClassName('simulator-toolbar-top')[0]
  var toolbar_bottom = document.getElementsByClassName('simulator-toolbar-bottom')[0]
  var toolbar_width = toolbar_top.clientWidth
  var MIN_STRETCH = 380
  var MAX_STRETCH = 650
  if (toolbar_width < MIN_STRETCH) {
    var button_stretch = 0
  } else if (toolbar_width > MAX_STRETCH) {
    var button_stretch = 1
  } else {
    var button_stretch = (toolbar_width - MIN_STRETCH) / (MAX_STRETCH - MIN_STRETCH)
  }
  toolbar_top.style.setProperty('--button-stretch', button_stretch)
  toolbar_bottom.style.setProperty('--button-stretch', button_stretch)
  
  resize_canvas()
  if (cgol_object) {
    update_floating_toolbars()
  }
}


function create_event_handlers(sandbox) {
  // Make the CGoL object
  cgol_object = new CGoL({
    grid_size: 128, // TODO: Increase to 256 once it stops lagging
    pattern: 'x = 3, y = 3, rule = B3/S23\n3o$2bo$bo2$.ABCDEFGHIJKLMNOPQRSTUVWXY!',
    canvas: document.getElementById('simulator-cgol'),
    zoom: 20,
    generation_counter: document.getElementById('simulator-stat-generations'),
    population_counter: document.getElementById('simulator-stat-population'),
    bounding_box_counter: document.getElementById('simulator-stat-bounding-box'),
    tick_handler: (cgol_object) => {
      // Update the step back button
      var step_backward_button = document.getElementById('simulator-back')
      step_backward_button.disabled = cgol_object.generation === 0
      // Update the undo and redo buttons
      var undo_button = document.getElementById('simulator-undo')
      undo_button.disabled = !cgol_object.can_undo()
      var redo_button = document.getElementById('simulator-redo')
      redo_button.disabled = !cgol_object.can_redo()
    },
  })
  
  // Sidebar event handlers
  var sidebar_top = document.getElementsByClassName('simulator-sidebar-top')[0]
  var [back_button, close_menu_button] = sidebar_top.children
  var sidebar_bottom = document.getElementsByClassName('simulator-sidebar-bottom')[0]
  var hint_button = document.getElementsByClassName('hint-button')[0]?.children[0]
  var reset_button = sidebar_bottom.children[sidebar_bottom.children.length - 1]
  var open_menu_button = document.getElementById('sidebar-open')
  back_button.addEventListener('click', create_main_menu)
  if (!sandbox) {
    hint_button.addEventListener('click', () => {
      // TODO: Make the hint button show a hint
    })
  }
  reset_button.addEventListener('click', () => {
    // TODO: Reset the level after a confirmation
  })

  // Event handlers for opening/closing the sidebar
  close_menu_button.addEventListener('click', () => {
    document.getElementsByClassName('simulator-sidebar')[0].style.display = 'none'
    open_menu_button.style.display = 'block'
    open_menu_button.setAttribute('data-visible', '')
    resize_canvas()
  })
  open_menu_button.addEventListener('click', () => {
    document.getElementsByClassName('simulator-sidebar')[0].style.display = 'flex'
    open_menu_button.style.display = 'none'
    open_menu_button.removeAttribute('data-visible')
    resize_canvas()
  })
  
  /* Event handlers for the tools and extra options
     (they work in mostly the same way) */
  function toggle_option_visibility_inner(required_variables, set_to=null, event=null) {
    let {current_button, current_option_wrapper, current_options, dropdown_type} = required_variables
    var display = window.getComputedStyle(current_option_wrapper).display
    if (set_to !== null) {
      var new_display = set_to ? 'block' : 'none'
    } else {
      var new_display = display === 'none' ? 'block' : 'none' // Toggle display
    }
    current_option_wrapper.style.display = new_display
    if (new_display === 'none') {
      if (dropdown_type === 'tools') {
        // Update the icon on the selector when we close it
        for (var option of current_options) {
          if (option.getAttribute('data-selected') !== null) {
            var icon_name = option.children[0].innerText
            current_button.innerText = icon_name
            var tool_name = option.lastChild.data.trim()
            var aria_label = `Currently using ${tool_name}. Change tool:`
            current_button.parentElement.ariaLabel = aria_label
            /* The data-tool name shouldn't be translated,
               so we're getting it ourselves based on the child index. */
            var child_index = current_options.indexOf(option)
            var tool_name_untranslated = ['draw', 'object', 'select', 'pan'][child_index]
            current_button.parentElement.setAttribute('data-tool', tool_name_untranslated)
            // Also change the cursor type because the tool changed
            update_cursor()
            break
          }
        }
      } else if (dropdown_type === 'extras') {
        current_options.forEach((option) => option.removeAttribute('data-selected'))
      }
      if (event) {
        current_button.setPointerCapture(event.pointerId)
        current_button.addEventListener('pointerup', (new_event) => {
          current_button.releasePointerCapture(new_event.pointerId)
        }, {once: true})
      }
    }
  }
  function select_option_inner(required_variables, num, relative=false) {
    let {current_button, current_option_wrapper, current_options, dropdown_type} = required_variables
    var selected_old = current_options.map((option) => {
      return option.getAttribute('data-selected') !== null
    }).indexOf(true)
    var selected_new = relative ? selected_old + num : num
    if (selected_old === -1 && relative) {
      selected_new = 0
    }
    if (selected_new >= 0 && selected_new < current_options.length) { // We can't move out of the array
      current_options[selected_old]?.toggleAttribute('data-selected')
      current_options[selected_new].toggleAttribute('data-selected')
    }
  }
  
  for (let dropdown_type of ['tools', 'extras']) {
    let current_button, current_option_wrapper
    if (dropdown_type === 'tools') {
      current_button = document.querySelector('#simulator-tool button')
      current_option_wrapper = document.getElementById('simulator-options')
    } else {
      current_button = document.getElementById('simulator-settings')
      current_option_wrapper = document.getElementById('simulator-extra-options')
    }
    let current_options = [...current_option_wrapper.getElementsByClassName('simulator-option')]
    let required_variables = {
      current_button: current_button,
      current_option_wrapper: current_option_wrapper,
      current_options: current_options,
      dropdown_type: dropdown_type,
    }
    let toggle_option_visibility = (...args) => toggle_option_visibility_inner(required_variables, ...args)
    let select_option = (...args) => select_option_inner(required_variables, ...args)
    current_button.addEventListener('click', (event) => {
      toggle_option_visibility(null, event)
    })
    current_button.addEventListener('blur', (event) => {
      toggle_option_visibility(false, null)
    })
    current_button.addEventListener('keydown', (event) => {
      event.preventDefault()
      if (event.key === 'Enter' || event.key === ' ') {
        toggle_option_visibility(null, null)
        if (current_options.every((option) => option.getAttribute('data-selected') === null)) {
          /* If the Enter key is used to open the dialog
             and no option is selected yet,
             automatically select the first option */
          select_option(0)
        }
      } else if (event.key === 'Escape') {
        toggle_option_visibility(false, null)
      } else if (event.key === 'ArrowUp') {
        select_option(-1, true)
      } else if (event.key === 'ArrowDown') {
        select_option(1, true)
      } else if (event.key === 'PageUp') {
        select_option(-5, true)
      } else if (event.key === 'PageDown') {
        select_option(5, true)
      } else if (event.key === 'Home') {
        select_option(0)
      } else if (event.key === 'End') {
        select_option(current_options.length - 1)
      }
    })
    for (let [index, option] of current_options.entries()) {
      option.addEventListener('mouseenter', () => {
        select_option(index)
      })
      option.addEventListener('click', (event) => {
        select_option(index)
        toggle_option_visibility(false, event)
      })
    }
  }

  // Reset, step back, step forward, play
  function set_playing(new_playing, only_button=false) {
    if (new_playing) {
      if (!only_button) {
        cgol_object.play()
      }
      play_button.replaceChildren('pause')
    } else {
      if (!only_button) {
        cgol_object.pause()
      }
      play_button.replaceChildren('play_arrow')
    }
  }
  
  var reset_generation_button = document.getElementById('simulator-reset')
  var step_backward_button = document.getElementById('simulator-back')
  var step_forward_button = document.getElementById('simulator-step')
  var play_button = document.getElementById('simulator-play')
  reset_generation_button.addEventListener('click', () => {
    cgol_object.reset_to_generation_0()
    set_playing(false, true)
  })
  step_backward_button.addEventListener('click', () => {
    cgol_object.step_back()
    set_playing(false, true)
  })
  step_forward_button.addEventListener('click', () => {
    cgol_object.step_forward()
    set_playing(false)
  })
  play_button.addEventListener('click', () => {
    set_playing(!cgol_object.playing)
  })
  
  // Simulation speed event handlers
  var speed_button = document.getElementById('simulator-speed-button')
  var speed_wrapper = document.getElementById('simulator-speed-wrapper')
  var speed_outer = document.getElementById('simulator-speed')
  var speed_slider = speed_wrapper.getElementsByClassName('slider-true')[0]
  var speed_label = speed_wrapper.getElementsByClassName('slider-value')[0]
  speed_button.addEventListener('click', () => {
    var display = window.getComputedStyle(speed_wrapper).display
    var new_display = display === 'none' ? 'block' : 'none'
    speed_wrapper.style.display = new_display
    if (new_display === 'block') {
      speed_slider.focus()
    }
  })
  speed_slider.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      speed_wrapper.style.display = 'none'
      speed_button.focus()
      event.preventDefault()
    }
  })
  speed_outer.addEventListener('blur', (event) => {
    var focused_element = event.relatedTarget
    if (focused_element !== speed_button && focused_element !== speed_slider) {
      speed_wrapper.style.display = 'none'
    }
  }, true)
  var EASE = 10 // Lower number = curve becomes more of a line
  var MAX_SPEED = 60
  speed_slider.addEventListener('input', () => {
    var true_speed = (MAX_SPEED-1)/(EASE-1) * (EASE**speed_slider.value - 1) + 1
    cgol_object.speed = true_speed
    var shown_speed = Math.round(true_speed)
    speed_label.innerText = shown_speed + '/s'
    if (shown_speed === 1) {
      speed_slider.ariaLabel = '1 generation per second'
    } else {
      speed_slider.ariaLabel = shown_speed + ' generations per second'
    }
  })

  // Simulation zoom event handlers
  var zoom_button = document.getElementById('simulator-zoom-button')
  var zoom_wrapper = document.getElementById('simulator-zoom-wrapper')
  var zoom_outer = document.getElementById('simulator-zoom')
  var zoom_slider = zoom_wrapper.getElementsByClassName('slider-true')[0]
  var zoom_label = zoom_wrapper.getElementsByClassName('slider-value')[0]
  const MIN_ZOOM = 1
  const MAX_ZOOM = 50
  
  function set_zoom(new_zoom, slider_value=false) {
    if (slider_value) {
      var true_zoom = (MAX_ZOOM/MIN_ZOOM)**new_zoom * MIN_ZOOM
      var slider_value = new_zoom
    } else {
      var true_zoom = new_zoom
      var slider_value = Math.log(new_zoom/MIN_ZOOM) / Math.log(MAX_ZOOM/MIN_ZOOM)
    }
    var shown_zoom = Math.round(true_zoom)
    zoom_label.innerText = 'Zoom ' + shown_zoom
    zoom_slider.value = slider_value
    cgol_object.move_to(cgol_object.x_offset, cgol_object.y_offset, true_zoom)
    update_floating_toolbars()
  }
  
  zoom_button.addEventListener('click', () => {
    var display = window.getComputedStyle(zoom_wrapper).display
    var new_display = display === 'none' ? 'block' : 'none'
    zoom_wrapper.style.display = new_display
    if (new_display === 'block') {
      zoom_slider.focus()
    }
  })
  zoom_slider.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      zoom_wrapper.style.display = 'none'
      zoom_button.focus()
      event.preventDefault()
    }
  })
  zoom_outer.addEventListener('blur', () => {
    var focused_element = event.relatedTarget
    if (focused_element !== zoom_button && focused_element !== zoom_slider) {
      zoom_wrapper.style.display = 'none'
    }
  }, true)
  zoom_slider.addEventListener('input', () => set_zoom(zoom_slider.value, true))

  // Simulation extra stat event handlers
  var extra_stats_button = document.getElementById('extra-stats-button')
  var extra_stats_wrapper = document.getElementById('extra-stats-wrapper')
  extra_stats_button.addEventListener('click', () => {
    var display = window.getComputedStyle(extra_stats_wrapper).display
    var new_display = display === 'none' ? 'block' : 'none'
    extra_stats_wrapper.style.display = new_display
  })
  extra_stats_button.addEventListener('blur', () => {
    extra_stats_wrapper.style.display = 'none'
  })

  // Undo and redo event handlers
  var undo_button = document.getElementById('simulator-undo')
  var redo_button = document.getElementById('simulator-redo')
  undo_button.addEventListener('click', () => {
    set_playing(false)
    cgol_object.undo()
  })
  redo_button.addEventListener('click', () => {
    set_playing(false)
    cgol_object.redo()
  })

  
  // All event handlers for canvas
  var canvas = document.getElementById('simulator-cgol')

  var first_x, first_y
  var last_x, last_y
  var mouse_down = false
  var drawing_cell_type = 0
  var temporarily_paused = false
  var selection_start = {x: null, y: null}

  function update_first_mouse_position(event) {
    first_x = event.pageX
    first_y = event.pageY
  }
  function update_last_mouse_position(event) {
    last_x = event.pageX
    last_y = event.pageY
  }
  function update_cursor() {
    var tool = document.getElementById('simulator-tool').getAttribute('data-tool')
    var cursor_type
    switch (tool) {
      case 'draw':
        cursor_type = 'default'
        break
      case 'object':
        cursor_type = 'default'
        break
      case 'select':
        cursor_type = 'cell'
        break
      case 'pan':
        cursor_type = mouse_down ? 'grabbing' : 'grab'
        break
    }
    canvas.style.cursor = cursor_type
  }

  function mouse_down_event_handler(event) {
    var touch = event.pointerEvent === 'pen' || event.pointerEvent === 'touch'
    var tool = document.getElementById('simulator-tool').getAttribute('data-tool')
    if (tool === 'draw') { // Drawing
      var {x, y} = cgol_object.page_to_board_coordinates(event.pageX, event.pageY)
      temporarily_paused = cgol_object.playing
      cgol_object.pause()
      if (x >= 0 && x < cgol_object.grid_size && y >= 0 && y < cgol_object.grid_size) {
        drawing_cell_type = cgol_object.board[y*cgol_object.grid_size + x] & 1 ^ 1
        cgol_object.edit_cells([[x, y]], (c) => c & ~1 | drawing_cell_type)
      } else {
        drawing_cell_type = 1
      }
    } else if (tool === 'select') { // Selecting
      var {x, y} = cgol_object.page_to_board_coordinates(event.pageX, event.pageY)
      x = Math.min(Math.max(x, 0), cgol_object.grid_size - 1)
      y = Math.min(Math.max(y, 0), cgol_object.grid_size - 1)
      selection_start = {x: x, y: y}
      cgol_object.update_selection({
        left: x,
        right: x,
        top: y,
        bottom: y,
        visible: false,
      })
      var simulator_selection_toolbar = document.getElementsByClassName('simulator-selection-toolbar')[0]
      var simulator_selection_move = document.getElementById('simulator-selection-move')
      simulator_selection_toolbar.style.display = 'none'
      simulator_selection_move.style.display = 'none'
    }

    update_first_mouse_position(event)
    update_last_mouse_position(event)
    mouse_down = true
    update_cursor()
  }

  function mouse_move_event_handler(event) {
    var touch = event.pointerEvent === 'pen' || event.pointerEvent === 'touch'
    var buttons = touch ? 1 : event.buttons
    mouse_down = buttons > 0
    var tool = document.getElementById('simulator-tool').getAttribute('data-tool')
    
    if (tool === 'draw') { // Drawing
      if (mouse_down) {
        var coords0 = cgol_object.page_to_board_coordinates(last_x, last_y)
        var x0 = coords0.x
        var y0 = coords0.y
        var coords1 = cgol_object.page_to_board_coordinates(event.pageX, event.pageY)
        var x1 = coords1.x
        var y1 = coords1.y
        var cells_to_change = []
        // Bresenham's line algorithm
        if (x0 !== x1 || y0 !== y1) {
          // Only follow the algorithm if the coordinates changed
          if (x1 - x0 < y0 - y1 || (x1 - x0 === y0 - y1 && x1 < x0)) {
            /* Swap coordinates to try to go south and east.
               If there's a tie, prefer NE over SW. */
            [x1, x0, y1, y0] = [x0, x1, y0, y1]
            var swapped = true
          } else {
            var swapped = false
          }
          var slope = (y1 - y0) / (x1 - x0)
          if (Math.abs(slope) <= 1) {
            // Horizontal line
            var iterations = x1 - x0
            if (!swapped) {
              ++x0
              y0 += slope
            }
            for (; iterations > 0; --iterations) {
              /* We add the - 0.5 to the y0 check because of rounding.
                 If y0 is cgol_object.grid_size - 0.1,
                 it is less than cgol_object.grid_size, but gets rounded to it.
                 This causes an error when we index into cgol_object.pattern. */
              if (x0 >= 0 && x0 < cgol_object.grid_size && y0 >= 0 && y0 < cgol_object.grid_size - 0.5) {
                cells_to_change.push([x0, Math.round(y0)])
              }
              ++x0
              y0 += slope
            }
          } else {
            // Vertical line
            var iterations = y1 - y0
            if (!swapped) {
              ++y0
              x0 += 1/slope
            }
            for (; iterations > 0; --iterations) {
              /* We add - 0.5 to the x0 check here for the same reason,
                 but now the error manifests itself
                 as an increase in the length of the array,
                 which is WAY more sneaky. */
              if (x0 >= 0 && x0 < cgol_object.grid_size - 0.5 && y0 >= 0 && y0 < cgol_object.grid_size) {
                cells_to_change.push([Math.round(x0), y0])
              }
              ++y0
              x0 += 1/slope
            }
          }
          var cell_change_function = drawing_cell_type ? (c) => c|1 : (c) => c&~1
          cgol_object.edit_cells(cells_to_change, cell_change_function)
        }
      }
    } else if (tool === 'select') { // Selecting
      if (mouse_down) {
        var {x, y} = cgol_object.page_to_board_coordinates(event.pageX, event.pageY)
        x = Math.min(Math.max(x, 0), cgol_object.grid_size - 1)
        y = Math.min(Math.max(y, 0), cgol_object.grid_size - 1)
        var move_distance = Math.hypot(first_x - event.pageX, first_y - event.pageY)
        var moved_significantly = move_distance >= 3
        /* This whole moved_significantly thing is here
           because moving the cursor 2 pixels
           shouldn't cause a selection to automatically appear,
           especially if you're trying to remove one already. */
        if (moved_significantly || cgol_object.selection.visible) {
          cgol_object.update_selection({
            left: Math.min(x, selection_start.x),
            right: Math.max(x, selection_start.x),
            top: Math.min(y, selection_start.y),
            bottom: Math.max(y, selection_start.y),
            visible: true,
          })
        }
      }
    } else if (tool === 'pan') { // Panning
      // Left mouse button or touchscreen
      if (buttons & 1) {
        var new_x = event.pageX
        var new_y = event.pageY
        var change_x = new_x - last_x
        var change_y = new_y - last_y
        var zoom_level = cgol_object.zoom
        cgol_object.move_to(
          cgol_object.x_offset - change_x/zoom_level,
          cgol_object.y_offset - change_y/zoom_level,
          zoom_level,
        )
        update_floating_toolbars()
      }
    }
    
    update_last_mouse_position(event)
  }

  function mouse_up_event_handler(event) {
    var touch = event.pointerEvent === 'pen' || event.pointerEvent === 'touch'
    var tool = document.getElementById('simulator-tool').getAttribute('data-tool')
    
    if (tool === 'draw') { // Drawing
      if (temporarily_paused) {
        cgol_object.play()
        temporarily_paused = false
      }
    } else if (tool === 'select') { // Selecting
      update_floating_toolbars()
    }
    
    update_last_mouse_position(event)
    mouse_down = false
    update_cursor()
  }

  function wheel_event_handler(event) {
    var delta_multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18 : 1
    var scroll_y = event.deltaY * delta_multiplier
    
    // Zoom in and out, regardless of mode
    var zoom_multiplier = 2 ** (-scroll_y / 400)
    var new_zoom = Math.min(Math.max(cgol_object.zoom * zoom_multiplier, MIN_ZOOM), MAX_ZOOM)
    set_zoom(new_zoom)
  }

  // Add the event listeners
  const THROTTLE_MILLISECONDS = 16
  canvas.addEventListener('pointerdown', throttle(mouse_down_event_handler, THROTTLE_MILLISECONDS))
  canvas.addEventListener('pointermove', throttle(mouse_move_event_handler, THROTTLE_MILLISECONDS))
  canvas.addEventListener('pointerup', throttle(mouse_up_event_handler, THROTTLE_MILLISECONDS))
  canvas.addEventListener('wheel', throttle(wheel_event_handler, THROTTLE_MILLISECONDS))

  // Event handlers for the floating toolbar

  // Rotate counterclockwise button
  var rotate_ccw_selection_button = document.getElementById('simulator-selection-rotate-ccw')
  rotate_ccw_selection_button.addEventListener('click', () => {
    var cells_to_edit = []
    var cell_ids = []
    var pivot_x = (cgol_object.selection.left + cgol_object.selection.right) >> 1
    var pivot_y = (cgol_object.selection.top + cgol_object.selection.bottom) >> 1
    for (var y = cgol_object.selection.top; y <= cgol_object.selection.bottom; ++y) {
      for (var x = cgol_object.selection.left; x <= cgol_object.selection.right; ++x) {
        /* Push the old cell.
           indexOf doesn't work here because arrays
           with different references aren't equal. */
        var cell_index = cells_to_edit.findIndex((coords) => coords[0] === x && coords[1] === y)
        if (cell_index === -1) {
          cells_to_edit.push([x, y])
          cell_ids.push(0)
        }
        /* Push the new cell.
           indexOf doesn't work here because arrays
           with different references aren't equal. */
        var new_x = (pivot_y - y) + pivot_x
        var new_y = (x - pivot_x) + pivot_y
        cell_index = cells_to_edit.findIndex((coords) => coords[0] === new_x && coords[1] === new_y)
        if (cell_index === -1) {
          cell_index = cells_to_edit.length
        }
        cells_to_edit[cell_index] = [new_x, new_y]
        var old_coordinate = y*cgol_object.grid_size + x
        cell_ids[cell_index] = (cgol_object.cell_types[new_coordinate] << 1
                                | cgol_object.board[new_coordinate])
      }
    }
    cgol_object.edit_cells(cells_to_edit, cell_ids)
  })
  // Flip horizontally button
  var flip_horiz_selection_button = document.getElementById('simulator-selection-flip-horiz')
  flip_horiz_selection_button.addEventListener('click', () => {
    var cells_to_edit = []
    var cell_ids = []
    for (var y = cgol_object.selection.top; y <= cgol_object.selection.bottom; ++y) {
      for (var x = cgol_object.selection.left; x <= cgol_object.selection.right; ++x) {
        cells_to_edit.push([x, y])
        var new_x = cgol_object.selection.right + cgol_object.selection.left - x
        var new_coordinate = y*cgol_object.grid_size + new_x
        cell_ids.push(cgol_object.cell_types[new_coordinate] << 1
                      | cgol_object.board[new_coordinate])
      }
    }
    cgol_object.edit_cells(cells_to_edit, cell_ids)
  })
  // Flip vertically button
  var flip_vert_selection_button = document.getElementById('simulator-selection-flip-vert')
  flip_vert_selection_button.addEventListener('click', () => {
    var cells_to_edit = []
    var cell_ids = []
    for (var y = cgol_object.selection.top; y <= cgol_object.selection.bottom; ++y) {
      for (var x = cgol_object.selection.left; x <= cgol_object.selection.right; ++x) {
        cells_to_edit.push([x, y])
        var new_y = cgol_object.selection.bottom + cgol_object.selection.top - y
        var new_coordinate = new_y*cgol_object.grid_size + x
        cell_ids.push(cgol_object.cell_types[new_coordinate] << 1
                      | cgol_object.board[new_coordinate])
      }
    }
    cgol_object.edit_cells(cells_to_edit, cell_ids)
  })
  // Delete button
  var delete_selection_button = document.getElementById('simulator-selection-delete')
  delete_selection_button.addEventListener('click', () => {
    cgol_object.selection.visible = false
    var cells_to_remove = []
    for (var y = cgol_object.selection.top; y <= cgol_object.selection.bottom; ++y) {
      for (var x = cgol_object.selection.left; x <= cgol_object.selection.right; ++x) {
        cells_to_remove.push([x, y])
      }
    }
    cgol_object.edit_cells(cells_to_remove, 0)
    var simulator_selection_toolbar = document.getElementsByClassName('simulator-selection-toolbar')[0]
    var simulator_selection_move = document.getElementById('simulator-selection-move')
    simulator_selection_toolbar.style.display = 'none'
    simulator_selection_move.style.display = 'none'
  })
  
  // Event handlers for the "move selection" button
  var move_selection_button = document.getElementById('simulator-selection-move')
  var drag_offset_x, drag_offset_y
  var drag_original_x, drag_original_y
  var original_selection_x, original_selection_y
  function move_selection_mouse_down(event) {
    drag_original_x = event.pageX
    drag_original_y = event.pageY
    drag_offset_x = event.pageX - move_selection_button.offsetLeft
    drag_offset_y = event.pageY - move_selection_button.offsetTop
    original_selection_x = cgol_object.selection.left
    original_selection_y = cgol_object.selection.top
    move_selection_button.setPointerCapture(event.pointerId)
    cgol_object.extract_selection_to_object()
    cgol_object.objects[0].moving = true
  }
  function move_selection_mouse_move(event) {
    var touch = event.pointerType === 'pen' || event.pointerType === 'touch'
    if (event.buttons || touch) {
      // Update cgol_object
      var cell_size = cgol_object.zoom
      var selection_width = cgol_object.selection.right - cgol_object.selection.left
      var selection_height = cgol_object.selection.bottom - cgol_object.selection.top
      var delta_x = Math.round((event.pageX - drag_original_x) / cell_size)
      var delta_y = Math.round((event.pageY - drag_original_y) / cell_size)
      var new_x = Math.min(Math.max(original_selection_x+delta_x, 0), cgol_object.grid_size-selection_width-1)
      var new_y = Math.min(Math.max(original_selection_y+delta_y, 0), cgol_object.grid_size-selection_height-1)
      cgol_object.objects[0].x = new_x
      cgol_object.objects[0].y = new_y
      cgol_object.selection.left = new_x
      cgol_object.selection.right = new_x + selection_width
      cgol_object.selection.top = new_y
      cgol_object.selection.bottom = new_y + selection_height
      update_floating_toolbars()
    }
  }
  function move_selection_mouse_up(event) {
    move_selection_button.releasePointerCapture(event.pointerId)
    cgol_object.bake_object(0, true)
  }
  move_selection_button.addEventListener('pointerdown', move_selection_mouse_down)
  move_selection_button.addEventListener('pointermove', move_selection_mouse_move)
  move_selection_button.addEventListener('pointerup', move_selection_mouse_up)
  
  // Draw the CGoL simulation
  var now = document.timeline.currentTime
  cgol_object.draw({}, now)
}
export {create_cgol_simulator, resize_simulator}
