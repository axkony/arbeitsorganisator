// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs;
use std::path::PathBuf;
use tauri::menu::{AboutMetadata, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager};
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

const BACKUP_DIR_NAME: &str = "Arbeitsorganisator-Backups";
const KEEP_BACKUPS: usize = 500; // ~5 days at the 15-min cadence — tune below

/// Ensures the dedicated backups folder exists, prunes old backups, and returns
/// a fresh timestamped path for the frontend to VACUUM INTO. The app writes
/// nothing else into this folder.
#[tauri::command]
fn prepare_backup_path(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .document_dir()
        .map_err(|e| e.to_string())?
        .join(BACKUP_DIR_NAME);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    prune(&dir);

    let stamp = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    // VACUUM INTO refuses to overwrite, so guarantee a unique name.
    let mut path = dir.join(format!("arbeitsorganisator-{stamp}.db"));
    let mut n = 1;
    while path.exists() {
        path = dir.join(format!("arbeitsorganisator-{stamp}-{n}.db"));
        n += 1;
    }
    Ok(path.to_string_lossy().into_owned())
}

fn prune(dir: &PathBuf) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    let mut files: Vec<PathBuf> = entries
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().map_or(false, |x| x == "db"))
        .collect();
    if files.len() <= KEEP_BACKUPS {
        return;
    }
    files.sort(); // timestamped names sort chronologically → front = oldest
    for old in &files[..files.len() - KEEP_BACKUPS] {
        let _ = fs::remove_file(old);
    }
}

#[tauri::command]
fn close_splashscreen(window: tauri::Window) {
    if let Some(splash) = window.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
    if let Some(main) = window.get_webview_window("main") {
        let _ = main.show();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "init_schema",
            sql: include_str!("../../src/db/migrations/0000_tense_mister_fear.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "todos_nesting",
            sql: include_str!("../../src/db/migrations/0001_brown_karma.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3, // next integer after your current last migration
            description: "invoice_session_billing",
            sql: include_str!("../../src/db/migrations/0002_mature_vindicator.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "invoice_billing_active",
            sql: include_str!("../../src/db/migrations/0003_wooden_lucky_pierre.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "invoice_number_nullable",
            sql: include_str!("../../src/db/migrations/0004_sudden_wrecking_crew.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "finances_general",
            sql: include_str!("../../src/db/migrations/0005_free_scarlet_spider.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:arbeitsorganisator.db", migrations)
                .build(),
        )
        .setup(|app| {
            // Start from the default macOS menu (keeps the app/Edit/Window/Help
            // menus — Quit, Copy/Paste, etc.) and append our own menus.

            let new_session = MenuItemBuilder::with_id("new_session", "Neue Sitzung")
                .accelerator("CmdOrCtrl+N")
                .build(app)?;
            let new_todo = MenuItemBuilder::with_id("new_todo", "Neues Todo")
                .accelerator("CmdOrCtrl+Shift+N")
                .build(app)?;
            let new_patient = MenuItemBuilder::with_id("new_patient", "Neuer Patient")
                .accelerator("CmdOrCtrl+Alt+Shift+N")
                .build(app)?;

            let left_sidebar_open =
                MenuItemBuilder::with_id("left_sidebar_open", "Seitenleiste links einklappen")
                    .accelerator("CmdOrCtrl+B")
                    .build(app)?;
            let right_sidebar_open =
                MenuItemBuilder::with_id("right_sidebar_open", "Seitenleiste rechts einklappen")
                    .accelerator("CmdOrCtrl+Shift+B")
                    .build(app)?;

            let app_menu = SubmenuBuilder::new(app, "Arbeitsorganisator")
                .about(Some(AboutMetadata::default()))
                .separator()
                .services()
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;

            let edit_menu = SubmenuBuilder::new(app, "Bearbeiten")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            let sitzungen = SubmenuBuilder::new(app, "Sitzungen")
                .item(&new_session)
                .build()?;
            let todos = SubmenuBuilder::new(app, "Todos").item(&new_todo).build()?;
            let patienten = SubmenuBuilder::new(app, "Patienten")
                .item(&new_patient)
                .build()?;
            let ansicht = SubmenuBuilder::new(app, "Ansicht")
                .item(&left_sidebar_open)
                .item(&right_sidebar_open)
                .build()?;

            let menu = MenuBuilder::new(app)
                .items(&[
                    &app_menu, &edit_menu, &sitzungen, &todos, &patienten, &ansicht,
                ])
                .build()?;

            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "new_session" => {
                let _ = app.emit("menu:new-session", ());
            }
            "new_todo" => {
                let _ = app.emit("menu:new-todo", ());
            }
            "new_patient" => {
                let _ = app.emit("menu:new-patient", ());
            }
            "left_sidebar_open" => {
                let _ = app.emit("menu:left_sidebar_open", ());
            }
            "right_sidebar_open" => {
                let _ = app.emit("menu:right_sidebar_open", ());
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            prepare_backup_path,
            close_splashscreen
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
