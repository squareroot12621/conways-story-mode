import {create_main_menu} from './main-menu.js'
import {CGoL} from './cgol.js'
import {create_element, update_root} from './utilities.js'

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
  var tool_selected = create_element('button', tools[0].icon, {class: 'simulator-toolbar-item'})
  var tools_inner = create_element('div', tool_array, {class: 'simulator-option-wrapper'})
  var tools_outer = create_element('div', tools_inner, {id: 'simulator-options'})
  tools_outer.style.display = 'none'
  tool_array[0].toggleAttribute('data-selected')
  var tool_selector = create_element('div', [tool_selected, tools_outer], {id: 'simulator-tool', role: 'listbox'})
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
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 -960 960 960',
    width: '1em',
    height: '1em',
    fill: 'currentColor',
  })
  var back_button = create_element(
    'button', back_svg, {class: 'simulator-toolbar-item', id: 'simulator-back', 'aria-label': 'Step back 1 generation'}
  )
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
  
  // The "generations" statistic
  var generations_stat = create_element(
    'div', 'Gen. 4,444', {id: 'simulator-stat-generations', 'aria-label': 'Generation 4,444'}
  )
  // The other statistics
  var population_stat = create_element('div', '4,444 cells', {id: 'simulator-stat-population'})
  var bounding_box_stat = create_element(
    'div', '444\u00D7444', {id: 'simulator-stat-bounding-box', 'aria-label': 'Bounding box: 444 by 444'}
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
  var undo_button = create_element(
    'button', 'undo', {class: 'simulator-toolbar-item', id: 'simulator-undo', 'aria-label': 'Undo'}
  )
  var redo_button = create_element(
    'button', 'redo', {class: 'simulator-toolbar-item', id: 'simulator-redo', 'aria-label': 'Redo'}
  )
  // The settings button
  var all_extra_options = [
    {icon: 'replay', name: 'Restart'},
    {icon: 'upload', name: 'Import RLE'},
    {icon: 'content_copy', name: 'Copy RLE'},
    {icon: 'settings', name: 'Settings'},
  ]
  var settings_button = create_element(
    'button', 'more_vert', {class: 'simulator-toolbar-item', id: 'simulator-settings', 'aria-label': 'Toggle options'}
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
  
  var simulator = create_element('article', [toolbar_top, canvas, toolbar_bottom], {class: 'simulator-main'})

  return simulator
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
  
  // Resize the canvas so it doesn't get stretched weirdly
  var canvas = document.getElementById('simulator-cgol')
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
}


function create_event_handlers(sandbox) {
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
  })
  open_menu_button.addEventListener('click', () => {
    document.getElementsByClassName('simulator-sidebar')[0].style.display = 'flex'
    open_menu_button.style.display = 'none'
    open_menu_button.removeAttribute('data-visible')
  })

  /* Event handlers for the tools and extra options
     (they work in mostly the same way) */
  function toggle_option_visibility_inner(required_variables, set_to=null) {
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
            current_button.innerText = option.children[0].innerText // Get the icon name
            break
          }
        }
      } else if (dropdown_type === 'extras') {
        current_options.forEach((option) => option.removeAttribute('data-selected'))
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
    current_button.addEventListener('click', () => {
      toggle_option_visibility()
    })
    current_button.addEventListener('blur', () => {
      toggle_option_visibility(false)
    })
    current_button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        toggle_option_visibility()
        if (current_options.every((option) => option.getAttribute('data-selected') === null)) {
          /* If the Enter key is used to open the dialog
             and no option is selected yet,
             automatically select the first option */
          select_option(0)
        }
        event.preventDefault()
      } else if (event.key === 'Escape') {
        toggle_option_visibility(false)
        event.preventDefault()
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
      option.addEventListener('click', () => {
        select_option(index)
        toggle_option_visibility(false)
      })
    }
  }
  
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
  var MIN_ZOOM = 1
  var MAX_ZOOM = 50
  zoom_slider.addEventListener('input', () => {
    var true_zoom = (MAX_ZOOM/MIN_ZOOM)**zoom_slider.value * MIN_ZOOM
    var shown_zoom = Math.round(true_zoom)
    zoom_label.innerText = 'Zoom ' + shown_zoom
  })

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
  
  // CGoL class
  var cgol_object = new CGoL({
    grid_size: 128, // TODO: Increase to 256 once it stops lagging
    pattern: 'x = 3, y = 3, rule = B3/S23\n3o$2bo$bo!',
    canvas: document.getElementById('simulator-cgol'),
    zoom: 20,
  })
  var now = document.timeline.currentTime
  cgol_object.draw({}, now) // Using now instead of null is a TEST for requestAnimationFrame
}
export {create_cgol_simulator, resize_simulator}
