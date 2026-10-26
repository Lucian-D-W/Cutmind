# 脑闸 · Cutmind File Index

## Entry points and configuration

- `README.md`, `README.en.md` — Chinese and English product introductions, real demos, installation and design references.
- `AGENTS.md` — Repository working agreement and file organization.
- `package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `index.html` — Frontend dependencies, scripts and build configuration.
- `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.md`, `licenses/third-party/` — Project and upstream licenses and attribution.

## Application source

- `src/` — React interface, task and idea stores, calendar, settings, runtime bridges and tests.
- `src-tauri/src/` — Rust desktop commands, storage, shortcuts and system tray.
- `src-tauri/capabilities/`, `src-tauri/permissions/` — Desktop API permissions.
- `src-tauri/icons/`, `src-tauri/app-icon-source.png` — Application icon files and source artwork.
- `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `src-tauri/build.rs` — Native dependencies and build configuration.

## Documentation and demonstrations

- `docs/guides/DEVELOPMENT.md` — Development, building and data preservation.
- `docs/guides/PRODUCT_DESIGN_AND_REQUIREMENTS.md` — Product behavior and design context.
- `docs/guides/创作意图参考文献.md` — Author motivation, research references and design connections.
- `docs/guides/GITNEXUS.md` — Local code-analysis provider guidance.
- `docs/assets/demos/` — The four author-supplied GIFs used by both READMEs.
- `fonts/README.md` — System fonts and third-party font distribution scope.

## Release material

- `release/README.md` — Installer naming and artifact policy.
- `release/v1.1.0/README.md` — Installer build and verification notes.
- `release/v1.1.0/bundle-notices.json`, `release/v1.1.0/notices/` — License resources to include when bundling installers.

Installers are distributed through GitHub Releases. Local runtime data, analysis caches,
historical development reports, private Git history and third-party font binaries are excluded.
