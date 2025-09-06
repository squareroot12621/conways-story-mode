import {create_main_menu} from './main-menu.js'
import {create_element, update_root} from './utilities.js'

function create_cgol_simulator(sandbox, objective=null, library=null) {
  var sidebar = create_simulator_sidebar(sandbox, objective, library)
  var simulator = create_simulator_main(sandbox)
  
  var simulator_wrapper = create_element('div', [sidebar, simulator], {class: 'simulator-wrapper'})
  update_root(simulator_wrapper)

  resize_simulator()

  /* Sidebar event handlers */
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

  /* Event handlers for opening/closing the sidebar */
  close_menu_button.addEventListener('click', () => {
    document.getElementsByClassName('simulator-sidebar')[0].style.display = 'none'
    open_menu_button.style.display = 'block'
  })
  open_menu_button.addEventListener('click', () => {
    document.getElementsByClassName('simulator-sidebar')[0].style.display = 'block'
    open_menu_button.style.display = 'none'
  })
  
  /* Simulator event handlers */
  var simulator_speed = document.getElementById('simulator-speed')
  var simulator_speed_button = document.getElementById('simulator-speed-button')
  simulator_speed_button.addEventListener('click', () => {
    simulator_speed.toggleAttribute('open')
  })
}


function create_simulator_sidebar(sandbox, objective=null, library=null) {
  if (objective !== null) {
    var mission_icon = create_element('span', 'list_alt', {class: 'icon', alt: ''})
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
  var library_icon = create_element('span', 'menu_book', {class: 'icon', alt: ''})
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

  var back_icon = create_element('span', 'arrow_back', {class: 'icon', alt: ''})
  var back_button = create_element('button', [back_icon, ' Back'], {class: 'back-button'})
  var close_menu_icon = create_element('span', 'arrow_left', {class: 'icon', alt: 'Close menu'})
  var close_menu_button = create_element('button', close_menu_icon, {class: 'invisible-button'})
  var sidebar_top = create_element('div', [back_button, close_menu_button], {class: 'simulator-sidebar-top'})
  
  var sidebar_main = create_element(
    'div',
    objective === null ? [library_wrapper] : [mission_wrapper, library_wrapper],
    {class: 'simulator-sidebar-main'}
  )

  if (!sandbox) { // Sandbox doesn't have any hints
    var lightbulb_icon = create_element('span', 'lightbulb_2', {class: 'icon', alt: 'Show hint'})
    var hint_button = create_element('button', lightbulb_icon, {class: 'invisible-button'})
    var hint_tooltip = create_element('div', 'Need a hint?', {class: 'hint-tooltip'})
    var hint_wrapper = create_element('div', [hint_button, hint_tooltip], {class: 'hint-button'})
  }
  var reset_icon = create_element('span', 'replay', {class: 'icon', alt: 'Reset level'})
  var reset_button = create_element('button', reset_icon, {class: 'invisible-button'})
  var sidebar_bottom = create_element(
    'div', sandbox ? [reset_button] : [hint_wrapper, reset_button], {class: 'simulator-sidebar-bottom'}
  )
  var sidebar = create_element(
    'section', [sidebar_top, sidebar_main, sidebar_bottom], {class: 'simulator-sidebar'}
  )
  
  return sidebar
}


function create_simulator_main(sandbox) {
  var sidebar_open = create_element('button', 'arrow_right', {class: 'simulator-toolbar-item', id: 'sidebar-open'})
  sidebar_open.style.display = 'none'
  var tools = [
    {icon: 'edit', name: 'Draw'},
    {icon: 'vignette_2', name: 'Object'},
    {icon: 'select', name: 'Select'},
    {icon: 'pan_tool', name: 'Pan'},
  ]
  var tool_array = []
  for (var {icon, name} of tools) {
    var tool_icon = create_element('span', icon, {class: 'icon'})
    tool_array.push(create_element('option', [tool_icon, ' ' + name]))
  }
  var tool_selector = create_element('select', tool_array, {id: 'simulator-tool'})
  var tool_wrapper = create_element('div', tool_selector, {class: 'simulator-toolbar-item'})
  var gen_0_button = create_element('button', 'skip_previous', {class: 'simulator-toolbar-item', id: 'simulator-reset'})
  var step_button = create_element('button', 'resume', {class: 'simulator-toolbar-item', id: 'simulator-step'})
  var play_button = create_element('button', 'play_arrow', {class: 'simulator-toolbar-item', id: 'simulator-play'})
  var slider = create_element('input', [], {
    type: 'range',
    min: 0,
    max: 1,
    value: Math.log(5) / Math.log(60), // log_60(5)
    step: 'any',
    class: 'slider-true'
  })
  var slider_value = create_element('div', '5/s', {class: 'slider-value'})
  var slider_wrapper = create_element(
    'div', [slider, slider_value], {class: 'slider-wrapper'}
  )
  var speed_button = create_element('button', 'Speed', {class: 'simulator-toolbar-item', id: 'simulator-speed-button'})
  var speed_summary = create_element('summary', speed_button, {class: 'simulator-summary'})
  var speed_wrapper = create_element('details', [speed_summary, slider_wrapper], {id: 'simulator-speed'})
  var undo_button = create_element('button', 'Undo', {class: 'simulator-toolbar-item', id: 'simulator-undo'})
  var redo_button = create_element('button', 'Redo', {class: 'simulator-toolbar-item', id: 'simulator-redo'})
  var toolbar_top = create_element(
    'section',
    [sidebar_open, tool_wrapper, gen_0_button, step_button, play_button, speed_wrapper,
     undo_button, redo_button],
    {class: 'simulator-toolbar-top'},
  )
  var simulator = create_element('section', [toolbar_top, /* TODO: FINISH */ ], {class: 'simulator-main'})

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
  var toolbar_width = toolbar_top.clientWidth
  if (toolbar_width < 400) {
    var button_stretch = 0
  } else if (toolbar_width > 600) {
    var button_stretch = 1
  } else {
    var button_stretch = (toolbar_width - 400) / 200
  }
  toolbar_top.style.setProperty('--button-stretch', button_stretch)
}

export {create_cgol_simulator, resize_simulator}
