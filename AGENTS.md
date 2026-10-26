# Cutmind Agent Working Agreement

This repository prefers the installed Codex skill named `gitnexus-codegraph-provider` for code graph and impact-analysis work.

## Code Impact Workflow

Whenever a task changes code, behavior, commands, configuration, schema, dependencies, tests, rules, API surfaces, events, IPC, storage, env, or config keys:

1. Prefer the `gitnexus-codegraph-provider` skill. Resolve it by skill name or local skill path; do not hard-code another user's workstation path.
2. Follow that skill's provider choice: codegraph for routine fast analysis; GitNexus 1.6.5 for debug, high-risk, suspicious, or escalation cases.
3. For symbol-level edits, inspect impact for the symbol or symbols being changed and call out HIGH or CRITICAL blast radius before editing.
4. For changes crossing IPC, events, windows, config, env, dependency, storage, or API surfaces, inspect the relevant provider context before editing.
5. After edits, run appropriate targeted verification and use provider change-scope review when available to confirm the affected scope.
6. If the preferred skill route or provider is unavailable, record that gap explicitly before using fallback material.

## Guardrails

- `gitnexus-codegraph-provider` is the preferred graph/context route for this repository.
- Do not route project workflow through legacy wrapper workflows.
- Persist only direct edges.
- Never persist indirect or transitive impact as durable graph truth.
- Compute transitive impact only while generating the report.
- Treat low-confidence graph edges as bounded evidence, not architectural proof.
- If GitNexus coverage or freshness is unavailable, record that fact. Never fabricate coverage-backed results.
- Keep workflow documents like `AGENTS.md` guarded; do not treat them as bypass-class notes.
- Delete actions must move items to the recycle bin or trash by default. Permanent deletion requires explicit, strict user approval first.
- Tests passed is not the same thing as safe.
- If graph/provider analysis says the report is incomplete or stale, do not treat that as edit-safe context unless the user explicitly overrides it.
- Local markdown rules remain the default rule source.

## GitNexus Notes

GitNexus companion guidance lives in `CLAUDE.md` and `.claude/`. Additional direct-provider notes live in `docs/guides/GITNEXUS.md`.

## Repository Information Architecture

Use this method before creating, moving, or renaming durable files. The goal is that a new maintainer can scan the root in seconds, then use `docs/INDEX.md` as the map.

### Root Boundary

The repository root is only for entry points and project configuration:

- Keep `README.md`, `AGENTS.md`, `CLAUDE.md`, package manifests, TypeScript/Vite config, `index.html`, and top-level source folders here.
- Do not add new root markdown reports, screenshots, logs, generated previews, or release binaries.
- If a file is only useful during a local run, put it in ignored scratch space such as `.codex-runtime/` or `.codex-temp/`.

### Durable File Categories

- Product or developer guides go in `docs/guides/`.
- Implementation plans and phase plans go in `docs/plans/`.
- Bug reports go in `docs/reports/bugs/`.
- Debug notes and regression investigations go in `docs/reports/debug/`.
- Follow-up task lists go in `docs/reports/followups/`.
- Documentation screenshots and visual references go in `docs/assets/`.
- Release installers go in `release/vX.Y.Z/`, one version per folder.
- Frontend code, tests, hooks, stores, runtime bridges, and UI components stay under `src/`.
- Tauri desktop code, Rust commands, permissions, tray logic, and desktop config stay under `src-tauri/`.

### Index Rule

- Update `docs/INDEX.md` in the same change whenever a durable file is added, moved, renamed, or promoted out of scratch space.
- The index should describe folders by purpose, not list every transient cache file.
- If a file does not fit an existing category, create the smallest clear category under `docs/` or explain the exception in `docs/INDEX.md`.

### Release Hygiene

- Do not put installers directly under `release/`.
- Keep historical versions unless the user explicitly asks for archival or removal.
- Never overwrite a release artifact silently; version the folder or document the replacement.

### Cleanup Rule

- Moving files to better homes is allowed when it preserves content and history.
- Deleting files must move them to the recycle bin or trash by default.
- Permanent deletion still requires explicit, strict user approval.
