mod commands;
mod shortcuts;
mod store;
mod tray;
mod window_actions;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = window_actions::show_calendar_window(app);
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();

            // System tray
            tray::create_tray(&handle)?;

            let saved_shortcuts = shortcuts::load_shortcuts(&handle);
            if let Err(error) = shortcuts::apply_shortcuts(&handle, saved_shortcuts) {
                eprintln!("Warning: failed to register saved shortcuts: {}", error);
                if let Err(fallback_error) =
                    shortcuts::apply_shortcuts(&handle, shortcuts::ShortcutSettings::default())
                {
                    eprintln!(
                        "Warning: failed to register fallback shortcuts: {}",
                        fallback_error
                    );
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_store,
            commands::save_store,
            commands::write_daily_journal_file,
            commands::sync_idea_tray_menu,
            commands::create_window,
            commands::close_window,
            commands::update_shortcuts,
            commands::list_system_fonts,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { code, api, .. } = event {
                // Keep the process alive when all windows are closed so the
                // system tray icon remains active and windows can be reopened.
                if code.is_none() {
                    api.prevent_exit();
                }
            }
        });
}
