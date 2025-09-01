import {create_main_menu} from './main-menu.js'
import {create_element, update_root} from './utilities.js'

function create_cgol_simulator(sandbox, objective=null, library=null) {
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
  var lightbulb_icon = create_element('span', 'lightbulb_2', {class: 'icon', alt: 'Show hint'})
  var hint_button = create_element('button', lightbulb_icon, {class: 'invisible-button'})
  var reset_icon = create_element('span', 'replay', {class: 'icon', alt: 'Reset level'})
  var reset_button = create_element('button', reset_icon, {class: 'invisible-button'})
  var sidebar_bottom = create_element('div', [hint_button, reset_button], {class: 'simulator-sidebar-bottom'})
  var sidebar = create_element(
    'section', [sidebar_top, sidebar_main, sidebar_bottom], {class: 'simulator-sidebar'}
  )
  
  var simulator = create_element('section', [ /* TODO: FINISH */ ], {class: 'simulator-main'})

  var simulator_wrapper = create_element('div', [sidebar, simulator], {class: 'simulator-wrapper'})
  update_root(simulator_wrapper)

  directionalize_menu_arrows()
  
  back_button.addEventListener('click', create_main_menu)
  close_menu_button.addEventListener('click', () => {
    document.getElementsByClassName('simulator-sidebar')[0].style.display = 'none'
    // TODO: Make open_menu_button.style.display = 'block'
  })
}

function directionalize_menu_arrows() {
  var root = document.getElementById('conways-story-mode')
  var portrait = root.getAttribute('data-portrait') === 'true'
  var sidebar_top = document.getElementsByClassName('simulator-sidebar-top')[0]
  var close_menu_icon = sidebar_top.children[1].children[0]
  close_menu_icon.replaceChildren(portrait ? 'arrow_drop_up' : 'arrow_left')
}

export {create_cgol_simulator, directionalize_menu_arrows}
