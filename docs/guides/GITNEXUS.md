# GitNexus Provider Notes

GitNexus is the direct code graph and impact-analysis provider for this repository. Use it before code or behavior changes to understand relevant symbols, callers, execution flows, and blast radius.

## Working Model

- Use GitNexus MCP resources and tools for graph context, impact analysis, and execution-flow discovery.
- Keep project-owned workflow rules in `AGENTS.md`.
- Keep GitNexus-generated companion guidance in `CLAUDE.md` or `.claude/`.
- Review generated instruction diffs before accepting changes to `AGENTS.md` or `CLAUDE.md`.

## Refreshing The Index

When the GitNexus index is stale or unavailable, refresh it directly:

```powershell
npx gitnexus analyze --skip-agents-md --no-stats
```

`--skip-agents-md` avoids replacing project-owned agent instructions during routine refreshes.

`--no-stats` avoids volatile graph counts changing instruction files.

## Before Editing

- Check `gitnexus://repo/Cutbrain/context` or the equivalent current repo context.
- Use `gitnexus_impact` for symbol-level edits.
- Use `gitnexus_context` when a symbol participates in multiple flows.
- Use process or flow views for IPC, event, window, config, env, dependency, storage, or API changes.
- Warn before proceeding when GitNexus reports HIGH or CRITICAL impact.

## After Editing

- Run targeted tests or verification appropriate to the changed area.
- Use GitNexus change detection or impact review when available to confirm the affected scope.
