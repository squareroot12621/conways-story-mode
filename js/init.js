import {create_loading_screen, load_assets} from './loading.js'
import {create_main_menu} from './main-menu.js'
import {create_error_screen} from './error.js'
import {resize_root, throttle} from './utilities.js'

async function initialize_csm() {
    create_loading_screen()
    await load_assets()
    create_main_menu()
}

window.addEventListener('load', initialize_csm)
window.addEventListener('error', create_error_screen)
window.addEventListener('unhandledrejection', create_error_screen)
// window.addEventListener('resize') is too unreliable
var resize_root_throttled = throttle(resize_root, 100)
const resize_observer = new ResizeObserver(resize_root_throttled)
resize_observer.observe(document.getElementById('conways-story-mode'))
