use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::store;
use crate::window_actions;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutSettings {
    pub new_task: String,
    pub new_idea: String,
    pub open_calendar: String,
}

const LEGACY_OPEN_CALENDAR_SHORTCUT: &str = "ctrl+shift+k";

impl Default for ShortcutSettings {
    fn default() -> Self {
        Self {
            new_task: "ctrl+shift+t".to_string(),
            new_idea: "ctrl+shift+i".to_string(),
            open_calendar: "ctrl+alt+c".to_string(),
        }
    }
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsFile {
    #[serde(default)]
    shortcuts: ShortcutSettings,
}

fn normalize_shortcut(shortcut: &str) -> String {
    shortcut
        .split('+')
        .map(normalize_shortcut_part)
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("+")
}

fn normalize_shortcut_part(part: &str) -> String {
    let lowered = part.trim().to_lowercase();
    match lowered.as_str() {
        "control" => "ctrl".to_string(),
        "meta" | "command" => "super".to_string(),
        "commandorcontrol" | "cmdorctrl" => "ctrl".to_string(),
        "esc" | "escape" => "Escape".to_string(),
        " " | "space" => "Space".to_string(),
        "enter" | "return" => "Return".to_string(),
        "backspace" => "Backspace".to_string(),
        "delete" => "Delete".to_string(),
        "tab" => "Tab".to_string(),
        "arrowup" => "Up".to_string(),
        "arrowdown" => "Down".to_string(),
        "arrowleft" => "Left".to_string(),
        "arrowright" => "Right".to_string(),
        "pageup" => "PageUp".to_string(),
        "pagedown" => "PageDown".to_string(),
        "home" => "Home".to_string(),
        "end" => "End".to_string(),
        "insert" => "Insert".to_string(),
        _ if lowered.len() >= 2
            && lowered.starts_with('f')
            && lowered[1..].chars().all(|c| c.is_ascii_digit()) =>
        {
            lowered.to_uppercase()
        }
        _ => lowered,
    }
}

pub fn normalize_shortcuts(shortcuts: ShortcutSettings) -> ShortcutSettings {
    let normalized = ShortcutSettings {
        new_task: normalize_shortcut(&shortcuts.new_task),
        new_idea: normalize_shortcut(&shortcuts.new_idea),
        open_calendar: normalize_shortcut(&shortcuts.open_calendar),
    };

    if normalized.open_calendar == LEGACY_OPEN_CALENDAR_SHORTCUT {
        ShortcutSettings {
            open_calendar: ShortcutSettings::default().open_calendar,
            ..normalized
        }
    } else {
        normalized
    }
}

pub fn load_shortcuts<R: Runtime>(app: &AppHandle<R>) -> ShortcutSettings {
    let settings = store::read_json::<_, SettingsFile>(app, "settings.json").unwrap_or_default();
    normalize_shortcuts(settings.shortcuts)
}

pub fn validate_shortcuts(shortcuts: &ShortcutSettings) -> Result<(), String> {
    let values = [
        shortcuts.new_task.as_str(),
        shortcuts.new_idea.as_str(),
        shortcuts.open_calendar.as_str(),
    ];

    if values.iter().any(|shortcut| shortcut.trim().is_empty()) {
        return Err("all shortcuts must be set".to_string());
    }

    if values.iter().any(|shortcut| !shortcut.contains('+')) {
        return Err("each shortcut must include at least one modifier key".to_string());
    }

    let unique = values.iter().collect::<std::collections::HashSet<_>>();
    if unique.len() != values.len() {
        return Err("shortcuts must be unique".to_string());
    }

    Ok(())
}

fn register_shortcut<R: Runtime>(
    app: &AppHandle<R>,
    shortcut: &str,
    action: &'static str,
) -> Result<(), String> {
    let action_name = action.to_string();
    app.global_shortcut()
        .on_shortcut(shortcut, move |app, _shortcut, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }

            if action_name == "open_calendar" {
                let _ = window_actions::toggle_calendar_window(app);
            } else {
                let _ = app.emit("tray-action", action_name.as_str());
            }
        })
        .map_err(|error| {
            let msg = error.to_string();
            // Surface a user-friendly reason when the OS rejects the hotkey
            if msg.contains("already registered") || msg.contains("RegisterHotKey") {
                format!("\"{}\" is already in use by another application", shortcut)
            } else {
                format!("\"{}\" could not be registered: {}", shortcut, msg)
            }
        })
}

pub fn apply_shortcuts<R: Runtime>(
    app: &AppHandle<R>,
    shortcuts: ShortcutSettings,
) -> Result<ShortcutSettings, String> {
    let normalized = normalize_shortcuts(shortcuts);
    validate_shortcuts(&normalized)?;

    let entries: &[(&str, &str)] = &[
        (&normalized.new_task, "new_task"),
        (&normalized.new_idea, "new_idea"),
        (&normalized.open_calendar, "open_calendar"),
    ];

    // Unregister everything only after validation passes
    app.global_shortcut()
        .unregister_all()
        .map_err(|error| format!("failed to clear shortcuts: {}", error))?;

    // Register one by one; on failure unregister what succeeded and surface the error
    let mut registered: Vec<String> = Vec::new();
    for (shortcut, action) in entries {
        match register_shortcut(app, shortcut, action) {
            Ok(()) => registered.push(shortcut.to_string()),
            Err(error) => {
                for s in &registered {
                    let _ = app.global_shortcut().unregister(s.as_str());
                }
                return Err(error);
            }
        }
    }

    Ok(normalized)
}

#[cfg(test)]
mod tests {
    use super::{normalize_shortcuts, ShortcutSettings};

    #[test]
    fn normalizes_aliases_like_the_frontend() {
        let normalized = normalize_shortcuts(ShortcutSettings {
            new_task: " CommandOrControl + Enter ".to_string(),
            new_idea: "Meta+Escape".to_string(),
            open_calendar: "Ctrl+ArrowUp".to_string(),
        });

        assert_eq!(normalized.new_task, "ctrl+Return");
        assert_eq!(normalized.new_idea, "super+Escape");
        assert_eq!(normalized.open_calendar, "ctrl+Up");
    }
}
