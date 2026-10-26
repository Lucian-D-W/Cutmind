use crate::shortcuts::{self, ShortcutSettings};
use crate::store;
use crate::tray;
use font_kit::source::SystemSource;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_decorum::WebviewWindowExt;

#[tauri::command]
pub fn load_store(app: AppHandle, filename: String) -> Result<Value, String> {
    store::read_json::<_, Value>(&app, &filename)
}

#[tauri::command]
pub fn save_store(app: AppHandle, filename: String, data: Value) -> Result<(), String> {
    store::write_json(&app, &filename, &data)?;
    if filename == "settings.json" || filename == "ideas.json" {
        let _ = tray::sync_tray_menu_from_store(&app);
    }
    let _ = app.emit("store-updated", &filename);
    Ok(())
}

#[tauri::command]
pub fn write_daily_journal_file(
    folder_path: String,
    file_name: String,
    content: String,
) -> Result<String, String> {
    if folder_path.trim().is_empty() {
        return Err("journal folder path is empty".to_string());
    }

    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return Err(format!("invalid journal file name: {}", file_name));
    }

    let folder = PathBuf::from(folder_path);
    fs::create_dir_all(&folder).map_err(|e| format!("failed to create journal folder: {}", e))?;

    let file_path = folder.join(&file_name);
    fs::write(&file_path, content).map_err(|e| format!("failed to write journal file: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn sync_idea_tray_menu(app: AppHandle, ideas: Vec<tray::IdeaTrayEntry>) -> Result<(), String> {
    tray::sync_idea_tray_menu(&app, &ideas).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_shortcuts(
    app: AppHandle,
    shortcuts: ShortcutSettings,
    previous: ShortcutSettings,
) -> Result<(), String> {
    match shortcuts::apply_shortcuts(&app, shortcuts) {
        Ok(_) => Ok(()),
        Err(error) => {
            let _ = shortcuts::apply_shortcuts(&app, previous);
            Err(error)
        }
    }
}

#[tauri::command]
pub fn create_window(
    app: AppHandle,
    label: String,
    title: String,
    url: String,
    width: f64,
    height: f64,
    x: f64,
    y: f64,
    decorations: bool,
    transparent: bool,
    always_on_top: bool,
    skip_taskbar: bool,
    resizable: Option<bool>,
    maximizable: Option<bool>,
    use_decorum: Option<bool>,
) -> Result<(), String> {
    use tauri::WebviewUrl;
    use tauri::WebviewWindowBuilder;

    // Check if window already exists
    if app.get_webview_window(&label).is_some() {
        if let Some(win) = app.get_webview_window(&label) {
            win.show().map_err(|e| e.to_string())?;
            win.set_focus().map_err(|e| e.to_string())?;
        }
        return Ok(());
    }

    // WebviewUrl::App treats the string as a filesystem path, which breaks
    // on Windows when the url contains query params (? is illegal in paths).
    // Use WebviewUrl::External with the dev-server or custom-protocol URL.
    let base = if cfg!(debug_assertions) {
        "http://localhost:1420"
    } else {
        "tauri://localhost"
    };
    let full = format!("{}/{}", base, url);
    let webview_url = WebviewUrl::External(
        full.parse()
            .map_err(|e| format!("Invalid URL '{}': {}", full, e))?,
    );

    let window = WebviewWindowBuilder::new(&app, &label, webview_url)
        .title(&title)
        .inner_size(width, height)
        .position(x, y)
        .decorations(decorations)
        .transparent(transparent)
        .always_on_top(always_on_top)
        .skip_taskbar(skip_taskbar)
        .resizable(resizable.unwrap_or(true))
        .maximizable(maximizable.unwrap_or(true))
        .build()
        .map_err(|e| e.to_string())?;

    if use_decorum.unwrap_or(false) {
        window
            .create_overlay_titlebar()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn close_window(app: AppHandle, label: String) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(&label) {
        win.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn list_system_fonts() -> Vec<String> {
    let source = SystemSource::new();
    let Ok(mut fonts) = source.all_families() else {
        return vec![];
    };

    fonts.sort();
    fonts.dedup();
    fonts
}

#[cfg(test)]
mod tests {
    use super::write_daily_journal_file;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn write_daily_journal_file_creates_the_file() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before unix epoch")
            .as_nanos();
        let folder = std::env::temp_dir().join(format!("cutbrain-journal-test-{}", unique));
        let folder_string = folder.to_string_lossy().to_string();

        let written = write_daily_journal_file(
            folder_string.clone(),
            "2026-04-14.md".to_string(),
            "# probe".to_string(),
        )
        .expect("journal file should be written");

        let written_path = std::path::PathBuf::from(&written);
        assert!(written_path.exists(), "written file should exist");
        assert_eq!(
            fs::read_to_string(&written_path).expect("read written file"),
            "# probe"
        );

        let _ = fs::remove_file(&written_path);
        let _ = fs::remove_dir_all(folder);
    }
}
