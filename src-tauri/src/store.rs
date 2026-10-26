use serde::Deserialize;
use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;
use tauri::Runtime;

fn data_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data dir: {}", e))?;
    fs::create_dir_all(&dir).map_err(|e| format!("failed to create app data dir: {}", e))?;
    Ok(dir)
}

pub fn read_json<R: Runtime, T: for<'de> Deserialize<'de> + Default>(
    app: &AppHandle<R>,
    filename: &str,
) -> Result<T, String> {
    let path = data_dir(app)?.join(filename);
    let s = match fs::read_to_string(&path) {
        Ok(s) => s,
        Err(_) => return Ok(T::default()), // file does not exist yet
    };
    match serde_json::from_str::<T>(&s) {
        Ok(v) => Ok(v),
        Err(_) => {
            // File exists but is corrupted — back it up
            let backup = path.with_extension("json.bak");
            let _ = fs::copy(&path, &backup);
            Ok(T::default())
        }
    }
}

pub fn write_json<R: Runtime, T: Serialize>(
    app: &AppHandle<R>,
    filename: &str,
    data: &T,
) -> Result<(), String> {
    let dir = data_dir(app)?;
    let path = dir.join(filename);
    let tmp_path = dir.join(format!("{}.tmp", filename));

    let json = serde_json::to_string_pretty(data).map_err(|e| format!("serialize error: {}", e))?;

    let mut tmp = fs::File::create(&tmp_path).map_err(|e| format!("create tmp error: {}", e))?;
    tmp.write_all(json.as_bytes())
        .map_err(|e| format!("write error: {}", e))?;
    tmp.flush().map_err(|e| format!("flush error: {}", e))?;
    drop(tmp);

    fs::rename(&tmp_path, &path).map_err(|e| format!("rename error: {}", e))?;

    Ok(())
}
