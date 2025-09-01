import {create_element, update_root} from './utilities.js'

function create_cgol_simulator(sandbox, objective=null, library=null) {
  if (objective !== null) {
    var mission_icon = create_element('span', 'list_alt', {class: 'icon', alt: ''})
    var mission_heading = create_element('h3', [mission_icon, ' Mission'])
    var mission_text = []
    for (line of objective.split('\n')) {
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
    for (object of library) {
      var item_name = `${object.count}\u00DF ${object.id}`
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
  var close_menu_icon = create_element('span', 'arrow_menu_close', {class: 'icon', alt: 'Close menu'})
  var close_menu_button = create_element('button', close_menu_icon, {class: 'back-button'})
  var sidebar_top = create_element('div', [back_button, close_menu_button], {class: 'simulator-sidebar-top'})
  var sidebar_main = create_element(
    'div',
    objective === null ? [library_wrapper] : [mission_wrapper, library_wrapper],
    {class: 'simulator-sidebar-main'}
  )
  var sidebar_bottom = create_element('div', [ /* TODO: FINISH */ ], {class: 'simulator-sidebar-bottom'})
  var sidebar = create_element(
    'section', [sidebar_top, sidebar_main, sidebar_bottom], {class: 'simulator-sidebar'}
  )
  
  var simulator = create_element('section', [ /* TODO: FINISH */ ], {class: 'simulator-main'})

  var simulator_wrapper = create_element('div', [sidebar, simulator], {class: 'simulator-wrapper'})
  update_root(simulator_wrapper)
}

export {create_cgol_simulator}
