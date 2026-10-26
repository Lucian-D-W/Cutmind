use crate::{store, tray};
use serde_json::{Map, Value};
use tauri::{
    AppHandle, Emitter, Manager, Runtime, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};

const CALENDAR_LABEL: &str = "calendar";
const CALENDAR_TITLE: &str = "Cutmind";
const CALENDAR_WIDTH: f64 = 1100.0;
const CALENDAR_HEIGHT: f64 = 700.0;
const IDEAS_STORE_FILE: &str = "ideas.json";
const IDEA_WIDTH: f64 = 442.0;
const IDEA_HEIGHT: f64 = 374.0;

fn create_calendar_window<R: Runtime>(app: &AppHandle<R>) -> Result<WebviewWindow<R>, String> {
    WebviewWindowBuilder::new(app, CALENDAR_LABEL, WebviewUrl::default())
        .title(CALENDAR_TITLE)
        .inner_size(CALENDAR_WIDTH, CALENDAR_HEIGHT)
        .center()
        .decorations(true)
        .resizable(true)
        .build()
        .map_err(|error| error.to_string())
}

fn get_calendar_window<R: Runtime>(app: &AppHandle<R>) -> Result<WebviewWindow<R>, String> {
    if let Some(window) = app.get_webview_window(CALENDAR_LABEL) {
        return Ok(window);
    }

    create_calendar_window(app)
}

pub fn show_calendar_window<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let window = get_calendar_window(app)?;
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.maximize();
    let _ = window.set_focus();
    Ok(())
}

pub fn toggle_calendar_window<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let window = get_calendar_window(app)?;
    let is_minimized = window.is_minimized().map_err(|error| error.to_string())?;
    let is_visible = window.is_visible().map_err(|error| error.to_string())?;

    if is_visible && !is_minimized {
        window.minimize().map_err(|error| error.to_string())?;
    } else {
        show_calendar_window(app)?;
    }

    Ok(())
}

fn idea_window_label(idea_id: &str) -> String {
    format!("idea-{}", idea_id)
}

fn ideas_from_store<R: Runtime>(app: &AppHandle<R>) -> Result<Map<String, Value>, String> {
    store::read_json::<R, Map<String, Value>>(app, IDEAS_STORE_FILE)
}

fn idea_string(idea: &Value, key: &str) -> Option<String> {
    idea.get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn idea_bool(idea: &Value, key: &str, fallback: bool) -> bool {
    idea.get(key).and_then(Value::as_bool).unwrap_or(fallback)
}

fn idea_window_position_number(idea: &Value, key: &str, fallback: f64) -> f64 {
    idea.get("windowState")
        .and_then(Value::as_object)
        .and_then(|state| state.get(key))
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite())
        .unwrap_or(fallback)
}

fn idea_window_placement(
    idea: &Value,
    scale: f64,
    work_area: (f64, f64, f64, f64),
) -> (f64, f64, f64, f64) {
    let scale = if scale.is_finite() && scale > 0.0 { scale } else { 1.0 };
    let state = idea.get("windowState").and_then(Value::as_object);
    let logical = state.and_then(|value| value.get("sizeUnit")).and_then(Value::as_str)
        == Some("logical");
    let dimension = |key: &str, fallback: f64| {
        state.and_then(|value| value.get(key)).and_then(Value::as_f64)
            .filter(|value| value.is_finite() && *value > 0.0)
            .map(|value| if logical { value } else { value / scale })
            .unwrap_or(fallback)
    };
    let (left, top, work_width, work_height) = work_area;
    let width = dimension("width", IDEA_WIDTH).min((work_width / scale - 24.0).max(1.0));
    let height = dimension("height", IDEA_HEIGHT).min((work_height / scale - 24.0).max(1.0));
    // Match the frontend's 24 logical-pixel margin for the native resize frame.
    let max_x = left + (work_width - (width + 24.0) * scale).max(0.0);
    let max_y = top + (work_height - (height + 24.0) * scale).max(0.0);
    let x = idea_window_position_number(idea, "x", left + 64.0 * scale).clamp(left, max_x);
    let y = idea_window_position_number(idea, "y", top + 64.0 * scale).clamp(top, max_y);
    (width, height, x, y)
}

fn persist_ideas<R: Runtime>(app: &AppHandle<R>, ideas: &Map<String, Value>) -> Result<(), String> {
    store::write_json(app, IDEAS_STORE_FILE, ideas)?;
    tray::sync_idea_tray_menu(app, &tray::idea_tray_entries_from_map(ideas))
        .map_err(|error| error.to_string())?;
    let _ = app.emit("store-updated", IDEAS_STORE_FILE);
    Ok(())
}

fn set_idea_visibility(
    ideas: &mut Map<String, Value>,
    idea_id: &str,
    is_visible: bool,
) -> Result<(), String> {
    let idea = ideas
        .get_mut(idea_id)
        .and_then(Value::as_object_mut)
        .ok_or_else(|| format!("idea not found: {}", idea_id))?;
    idea.insert("isVisible".to_string(), Value::Bool(is_visible));
    Ok(())
}

fn idea_url(idea_id: &str) -> Result<WebviewUrl, String> {
    let base = if cfg!(debug_assertions) {
        "http://localhost:1420"
    } else {
        "tauri://localhost"
    };
    let full = format!("{}/?view=idea&id={}", base, idea_id);
    Ok(WebviewUrl::External(full.parse().map_err(|error| {
        format!("invalid idea window url '{}': {}", full, error)
    })?))
}

fn reveal_idea_window<R: Runtime>(
    window: &WebviewWindow<R>,
    is_pinned: bool,
) -> Result<(), String> {
    let _ = window.unminimize();
    window.show().map_err(|error| error.to_string())?;
    let _ = window.set_always_on_top(true);
    let _ = window.set_focus();
    if !is_pinned {
        let _ = window.set_always_on_top(false);
    }
    Ok(())
}

fn open_or_reveal_idea_window<R: Runtime>(
    app: &AppHandle<R>,
    idea_id: &str,
    idea: &Value,
) -> Result<(), String> {
    let label = idea_window_label(idea_id);
    let title = idea_string(idea, "title").unwrap_or_else(|| "Idea".to_string());
    let is_pinned = idea_bool(idea, "isPinned", true);

    if let Some(window) = app.get_webview_window(&label) {
        return reveal_idea_window(&window, is_pinned);
    }

    let saved_x = idea_window_position_number(idea, "x", f64::NAN);
    let saved_y = idea_window_position_number(idea, "y", f64::NAN);
    let saved_monitor = if saved_x.is_finite() && saved_y.is_finite() {
        app.monitor_from_point(saved_x, saved_y).map_err(|error| error.to_string())?
    } else {
        None
    };
    let monitor = saved_monitor.or(app.primary_monitor().map_err(|error| error.to_string())?);
    let (scale, work_area) = match monitor {
        Some(monitor) => {
            let area = monitor.work_area();
            (monitor.scale_factor(), (area.position.x as f64, area.position.y as f64,
                area.size.width as f64, area.size.height as f64))
        }
        None => (1.0, (0.0, 0.0, 1920.0, 1040.0)),
    };
    let (width, height, x, y) = idea_window_placement(idea, scale, work_area);
    let window = WebviewWindowBuilder::new(app, &label, idea_url(idea_id)?)
        .title(&title)
        .inner_size(width, height)
        .position(x / scale, y / scale)
        .decorations(false)
        .transparent(true)
        .always_on_top(is_pinned)
        .skip_taskbar(true)
        .resizable(true)
        .maximizable(false)
        .build()
        .map_err(|error| error.to_string())?;

    window.set_position(tauri::PhysicalPosition::new(x.round() as i32, y.round() as i32))
        .map_err(|error| error.to_string())?;

    reveal_idea_window(&window, is_pinned)
}

pub fn show_idea_window<R: Runtime>(app: &AppHandle<R>, idea_id: &str) -> Result<(), String> {
    let mut ideas = ideas_from_store(app)?;
    let idea = ideas
        .get(idea_id)
        .cloned()
        .ok_or_else(|| format!("idea not found: {}", idea_id))?;

    open_or_reveal_idea_window(app, idea_id, &idea)?;
    set_idea_visibility(&mut ideas, idea_id, true)?;
    persist_ideas(app, &ideas)
}

pub fn show_all_idea_windows<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let mut ideas = ideas_from_store(app)?;
    let idea_ids = ideas.keys().cloned().collect::<Vec<_>>();

    for idea_id in &idea_ids {
        let Some(idea) = ideas.get(idea_id).cloned() else {
            continue;
        };
        open_or_reveal_idea_window(app, idea_id, &idea)?;
        set_idea_visibility(&mut ideas, idea_id, true)?;
    }

    persist_ideas(app, &ideas)
}

pub fn hide_all_idea_windows<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let mut ideas = ideas_from_store(app)?;
    let idea_ids = ideas.keys().cloned().collect::<Vec<_>>();

    for idea_id in &idea_ids {
        if let Some(window) = app.get_webview_window(&idea_window_label(idea_id)) {
            let _ = window.destroy();
        }
        set_idea_visibility(&mut ideas, idea_id, false)?;
    }

    persist_ideas(app, &ideas)
}

#[cfg(test)]
mod geometry_tests {
    use super::idea_window_placement;
    use serde_json::json;

    #[test]
    fn tray_restore_converts_legacy_physical_dimensions() {
        let old = json!({"windowState": {"x": 120, "y": 160, "width": 884, "height": 748}});
        assert_eq!(idea_window_placement(&old, 2.0, (0.0, 0.0, 3072.0, 1824.0)),
            (442.0, 374.0, 120.0, 160.0));
        let current = json!({"windowState": {"x": 120, "y": 160,
            "width": 442, "height": 374, "sizeUnit": "logical"}});
        assert_eq!(idea_window_placement(&current, 2.0, (0.0, 0.0, 3072.0, 1824.0)),
            (442.0, 374.0, 120.0, 160.0));
    }

    #[test]
    fn tray_restore_fits_oversized_bounds_on_a_negative_origin_monitor() {
        let idea = json!({"windowState": {"x": -10, "y": 900,
            "width": 9999, "height": 9999, "sizeUnit": "logical"}});
        let (width, height, x, y) = idea_window_placement(&idea, 2.0, (-1366.0, 0.0, 1366.0, 768.0));
        assert_eq!((width, height), (659.0, 360.0));
        assert!(x >= -1366.0 && x + width * 2.0 <= 0.0);
        assert!(y >= 0.0 && y + height * 2.0 <= 768.0);
    }

    #[test]
    fn unsaved_idea_uses_the_same_logical_defaults_as_the_frontend() {
        let (width, height, _, _) = idea_window_placement(&json!({}), 2.0, (0.0, 0.0, 3072.0, 1824.0));
        assert_eq!((width, height), (442.0, 374.0));
    }

    #[test]
    fn tray_restore_keeps_the_native_frame_inside_the_work_area() {
        let idea = json!({"windowState": {"x": 9999, "y": 9999,
            "width": 442, "height": 374, "sizeUnit": "logical"}});
        let (width, height, x, y) = idea_window_placement(&idea, 2.0, (0.0, 0.0, 3072.0, 1824.0));
        // This Windows monitor adds 26 x 15 physical pixels around the client area.
        assert!(x + width * 2.0 + 26.0 <= 3072.0);
        assert!(y + height * 2.0 + 15.0 <= 1824.0);
    }
}
