import {create_element, update_root} from './utilities.js'

function get_error_info(error) {
    /* If we don't have an Error,
       try to turn it into something that is an Error */
    var error_new = error
    if (!(error instanceof Error)) {
        if (error?.error) {
            error_new = error.error
        } else if (error?.reason) {
            error_new = error.reason
        }
    }
    var error_name = error_new?.name ?? 'No name available'
    var error_string = error?.message ?? error_new?.message ?? 'No message available'
    var error_stack = error_new?.stack ?? 'No stack available'
    var error_info_text = [error_name, error_string, error_stack].join('\n')
    return {info: error_info_text, error: error_new}
}

function create_error_screen(error) {
    const STOP_SENTINEL = 'STOP JAVASCRIPT'

    var error_info_object = get_error_info(error)
    var error_info_text = error_info_object.info
    error = error_info_object.error

    // Don't cause an infinite loop with create_error_screen throwing
    if (error.message === STOP_SENTINEL) {
        return undefined
    }

    // Create the HTML
    var heading_text = ' JavaScript crashed'
    var heading_icon = create_element('span', 'error', {class: 'icon', alt: ''})
    var heading = create_element('h1', [heading_icon, heading_text], {class: 'script-error-header'})
    var description_text_before = "Uh oh! Something happened in Conway's Story Mode, "
                                  + 'and it crashed. If you can, '
    var description_link_text = 'create a GitHub issue about it.'
    var description_text_after = " Don't forget to include information "
                                 + 'like what happened before it crashed, '
                                 + 'as well as this error text:'
    var description_link_reference = (
        'https://github.com/squareroot12621/conways-story-mode/issues/new/choose')
    var description_link = create_element(
        'a', description_link_text, {'href': description_link_reference}
    )
    var description = create_element(
        'p', [description_text_before, description_link, description_text_after]
    )
    var error_info = create_element('pre', error_info_text)
    var script_error_container = create_element(
        'div', [heading, description, error_info],
        {'class': 'script-error'}
    )
    update_root(script_error_container)

    // Exit immediately
    throw new Error(STOP_SENTINEL)
}

export {create_error_screen}
