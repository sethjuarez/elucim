use tauri::{Emitter, Manager};

const OPEN_FILE_EVENT: &str = "elucim://open-file";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init());

    if std::env::var_os("ELUCIM_ENABLE_UPDATER").is_some() {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            emit_elucim_file_args(app, args);
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![initial_open_files])
        .setup(|app| {
            let handle = app.handle().clone();
            emit_elucim_file_args(&handle, std::env::args().collect());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Elucim App");
}

fn emit_elucim_file_args(app: &tauri::AppHandle, args: Vec<String>) {
    for path in collect_elucim_file_args(args) {
        let _ = app.emit(OPEN_FILE_EVENT, path);
    }
}

#[tauri::command]
fn initial_open_files() -> Vec<String> {
    collect_elucim_file_args(std::env::args().collect())
}

fn collect_elucim_file_args(args: Vec<String>) -> Vec<String> {
    args.into_iter()
        .filter(|arg| arg.to_ascii_lowercase().ends_with(".elc"))
        .collect()
}
