async function initialize_csm() {
    create_loading_screen()
    await load_assets()
    create_main_menu()
}

window.addEventListener('load', initialize_csm)
