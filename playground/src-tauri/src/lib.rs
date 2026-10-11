// The desktop shell of the game. The game itself is the web page in `../dist` (see `tauri.conf.json`); this side only
// opens the window around it. Saves live in the web view's own storage (IndexedDB), in the app's data folder.

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        // Starting the game a second time would open a second window on the same saved game, and the two would overwrite
        // each other's progress. The second start brings the first window to the front instead.
        .plugin(tauri_plugin_single_instance::init(|app, _arguments, _directory| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .run(tauri::generate_context!())
        .expect("the TQQ TCG window could not be opened");
}
