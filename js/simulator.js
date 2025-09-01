import {create_element, update_root} from './utilities.js'

function create_cgol_simulator(sandbox, objective=null, library=null) {
  if (objective !== null) {
    var mission_icon = create_element('span', 'list_alt', {class: 'icon'})
    var mission_heading = create_element('h3', [mission_icon, 'MISSION'])
    var mission_text = []
    for (line of objective.split('\n')) {
      mission_text.push(create_element('p', line))
    }
    var mission_wrapper = create_element(
      'div', [mission_heading].concat(mission_text), {class: 'simulator-mission-wrapper'}
    )
  }
  var library_icon = create_element('span', 'menu_book', {class: 'icon'})
  var library_heading = create_element('h3', [library_icon, 'LIBRARY'])
  var library_items = []
  for (object of library ?? []) {
    library_items.push(create_element(`${object.count}\u00DF ${object.name['en-US']}`))
  }
  var library_list = create_element('ul', library_items, {class: 'simulator-library-list'})
  var library_wrapper = create_element(
    'div', [library_heading].concat(library_list), {class: 'simulator-library-wrapper'}
  )
  
  var sidebar_main = create_element(
    'div',
    objective === null ? [library_wrapper] : [mission_wrapper, library_wrapper],
    {class: 'simulator_sidebar_main'}
  )
  var sidebar_bottom = create_element('div', [ /* TODO: FINISH */ ], {class: 'simulator_sidebar_bottom'})
  var sidebar = create_element('section', [sidebar_main, sidebar_bottom], {class: 'simulator-sidebar'})
  
  var simulator = create_element('section', [ /* TODO: FINISH */ ], {class: 'simulator-main'})
  
  update_root(sidebar, simulator)
}

export {create_cgol_simulator}
