import {create_element, update_root} from './utilities.js'

function create_cgol_simulator(sandbox=false) {
  var heading = create_element('h2', 'CGoL Simulator Test')
  update_root(heading)
}

export {create_cgol_simulator}
