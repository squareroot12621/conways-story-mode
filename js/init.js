import {create_loading_screen, load_assets} from './loading.js'
import {create_main_menu} from './main-menu.js'
import {create_error_screen} from './error.js'

async function initialize_csm() {
    create_loading_screen()
    await load_assets()
    create_main_menu()
}

window.addEventListener('load', initialize_csm)
window.addEventListener('error', create_error_screen)
window.addEventListener('unhandledrejection', create_error_screen)
