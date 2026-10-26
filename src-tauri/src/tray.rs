use crate::store;
use crate::window_actions;
use serde_json::{Map, Value};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Runtime,
};

const TRAY_ID: &str = "main-tray";
const IDEAS_STORE_FILE: &str = "ideas.json";
const SETTINGS_STORE_FILE: &str = "settings.json";

#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeaTrayEntry {
    pub id: String,
    pub title: String,
    pub is_visible: bool,
}

#[derive(Default, serde::Deserialize)]
struct TraySettings {
    language: Option<String>,
}

#[derive(Clone, Copy)]
enum TrayLanguage {
    Chinese,
    English,
}

struct TrayCopy {
    open_calendar: &'static str,
    new_task: &'static str,
    new_idea: &'static str,
    show_all: &'static str,
    hide_all: &'static str,
    preferences: &'static str,
    quit: &'static str,
    tooltip: &'static str,
}

fn tray_language<R: Runtime>(app: &AppHandle<R>) -> TrayLanguage {
    let settings =
        store::read_json::<R, TraySettings>(app, SETTINGS_STORE_FILE).unwrap_or_default();

    match settings.language.as_deref() {
        Some("en") => TrayLanguage::English,
        _ => TrayLanguage::Chinese,
    }
}

fn tray_copy(language: TrayLanguage) -> TrayCopy {
    match language {
        TrayLanguage::Chinese => TrayCopy {
            open_calendar: "打开日历   Ctrl+Alt+C",
            new_task: "新建任务盒子   Ctrl+Shift+T",
            new_idea: "新建想法盒子   Ctrl+Shift+I",
            show_all: "显示所有想法盒子",
            hide_all: "隐藏所有想法盒子",
            preferences: "首选项...",
            quit: "退出 Cutmind",
            tooltip: "Cutmind",
        },
        TrayLanguage::English => TrayCopy {
            open_calendar: "Open Calendar   Ctrl+Alt+C",
            new_task: "New Task Box   Ctrl+Shift+T",
            new_idea: "New Idea Box   Ctrl+Shift+I",
            show_all: "Show All Idea Boxes",
            hide_all: "Hide All Idea Boxes",
            preferences: "Preferences...",
            quit: "Quit Cutmind",
            tooltip: "Cutmind",
        },
    }
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

pub fn idea_tray_entries_from_map(ideas: &Map<String, Value>) -> Vec<IdeaTrayEntry> {
    let mut entries = ideas
        .iter()
        .filter_map(|(id, idea)| {
            let idea_object = idea.as_object()?;
            Some((
                idea_object
                    .get("createdAt")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_owned(),
                IdeaTrayEntry {
                    id: id.clone(),
                    title: idea_string(idea, "title")
                        .unwrap_or_else(|| "Untitled Idea".to_string()),
                    is_visible: idea_bool(idea, "isVisible", false),
                },
            ))
        })
        .collect::<Vec<_>>();

    entries.sort_by(|a, b| a.0.cmp(&b.0));
    entries.into_iter().map(|(_, entry)| entry).collect()
}

fn build_tray_menu<R: Runtime>(
    app: &AppHandle<R>,
    ideas: &[IdeaTrayEntry],
) -> Result<Menu<R>, Box<dyn std::error::Error>> {
    let copy = tray_copy(tray_language(app));
    let open_cal = MenuItem::with_id(app, "open_calendar", copy.open_calendar, true, None::<&str>)?;
    let new_task = MenuItem::with_id(app, "new_task", copy.new_task, true, None::<&str>)?;
    let new_idea = MenuItem::with_id(app, "new_idea", copy.new_idea, true, None::<&str>)?;
    let show_all = MenuItem::with_id(app, "show_all_ideas", copy.show_all, true, None::<&str>)?;
    let hide_all = MenuItem::with_id(app, "hide_all_ideas", copy.hide_all, true, None::<&str>)?;
    let prefs = MenuItem::with_id(app, "preferences", copy.preferences, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", copy.quit, true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let dynamic_sep = if ideas.is_empty() {
        None
    } else {
        Some(PredefinedMenuItem::separator(app)?)
    };
    let tail_sep = PredefinedMenuItem::separator(app)?;
    let mut items: Vec<&dyn tauri::menu::IsMenuItem<R>> =
        vec![&open_cal, &new_task, &new_idea, &sep, &show_all, &hide_all];

    let mut dynamic_items: Vec<MenuItem<R>> = Vec::new();
    if let Some(ref separator) = dynamic_sep {
        items.push(separator);
        for idea in ideas {
            let item = MenuItem::with_id(
                app,
                format!("show_idea::{}", idea.id),
                &idea.title,
                true,
                None::<&str>,
            )?;
            dynamic_items.push(item);
        }
        for item in &dynamic_items {
            items.push(item);
        }
    }

    items.push(&tail_sep);
    items.push(&prefs);
    items.push(&quit);

    Ok(Menu::with_items(app, &items)?)
}

pub fn sync_idea_tray_menu<R: Runtime>(
    app: &AppHandle<R>,
    ideas: &[IdeaTrayEntry],
) -> Result<(), Box<dyn std::error::Error>> {
    let menu = build_tray_menu(app, ideas)?;
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_menu(Some(menu))?;
    }
    Ok(())
}

pub fn sync_tray_menu_from_store<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<(), Box<dyn std::error::Error>> {
    let ideas =
        store::read_json::<R, Map<String, Value>>(app, IDEAS_STORE_FILE).unwrap_or_default();
    sync_idea_tray_menu(app, &idea_tray_entries_from_map(&ideas))
}

pub fn create_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let menu = build_tray_menu(app, &[])?;
    let copy = tray_copy(tray_language(app));

    let mut tray = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip(copy.tooltip);

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    tray.on_menu_event(move |app, event| match event.id.as_ref() {
        "new_task" => {
            let _ = app.emit("tray-action", "new_task");
        }
        "new_idea" => {
            let _ = app.emit("tray-action", "new_idea");
        }
        "open_calendar" => {
            let _ = window_actions::toggle_calendar_window(app);
        }
        "show_all_ideas" => {
            let _ = window_actions::show_all_idea_windows(app);
        }
        "hide_all_ideas" => {
            let _ = window_actions::hide_all_idea_windows(app);
        }
        "preferences" => {
            let _ = app.emit("tray-action", "preferences");
        }
        "quit" => {
            app.exit(0);
        }
        id if id.starts_with("show_idea::") => {
            let idea_id = id.trim_start_matches("show_idea::");
            let _ = window_actions::show_idea_window(app, idea_id);
        }
        _ => {}
    })
    .on_tray_icon_event(|tray, event| {
        if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } = event
        {
            let _ = window_actions::toggle_calendar_window(&tray.app_handle());
        }
    })
    .build(app)?;

    Ok(())
}
