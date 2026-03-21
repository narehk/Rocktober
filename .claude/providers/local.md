# Local Provider

The default provider. Routes all `/work` commands to local files only — no external system. This codifies the current behavior and serves as the fallback when no provider is configured or when an external provider is unreachable.

## When Active

The local provider is used when any of these conditions are true:

- No `## Work Provider` section exists in CONTEXT.md
- `**Provider**: local` is set in CONTEXT.md
- The configured external provider is unreachable (offline fallback)

## Prerequisites

None. The local provider has zero external dependencies. It requires only the standard `.claude/work/` directory structure:

```
.claude/work/
├── BOARD.md        # Generated kanban board (gitignored — regenerated from item files)
├── items/          # Active work item files
└── archive/        # Completed work item files
```

## Operations

All operations follow the existing `work.md` command implementation unchanged. No `## Provider Integration` section is added to item files.

| Operation | Behavior |
|-----------|----------|
| **add** | Create item file in `.claude/work/items/W-NNN.md`, regenerate board |
| **list** | Scan item files, display board, regenerate BOARD.md |
| **view** | Read and display item file from `.claude/work/items/` |
| **move** | Update item file status, regenerate board |
| **start** | Delegate to move (→ In Progress), prompt for branch name |
| **review** | Delegate to move (→ In Review), record PR link |
| **done** | Update item, move file to archive, check for unblocked items, regenerate board |
| **block** | Update `**Blocked By**:` field in item file, regenerate board |
| **unblock** | Remove blocker from item file, regenerate board |
| **sync** | No-op. Display: "Local provider — nothing to sync. Items are stored in `.claude/work/`." |
| **import** | Display: "Import requires an external provider (ado or github). Configure a provider in CONTEXT.md `## Work Provider` section." |
| **export** | Display: "Export requires an external provider (ado or github). Configure a provider in CONTEXT.md `## Work Provider` section." |
| **skip** | Update item file to skipped, regenerate board |
| **revive** | Update item file to captured, regenerate board |
| **refine** | Invoke ideate skill for shaping discussion |
| **ready** | Verify acceptance criteria, update status |

## Migration Note

When a project adds an external provider later, existing local items are not automatically migrated. They remain as local-only items (no `## Provider Integration` section).

To push individual items to the new provider, use `/work export <id>`. This creates the item in the external system and adds the Provider Integration section to the local item file.

To bulk-migrate, run `/work export` on each item that should be tracked externally. Items that are historical or completed can stay local-only.

## Doc Operations

The local doc provider writes all documentation to the `docs/` directory. No external system is involved.

| Operation | Behavior |
|-----------|----------|
| **doc_publish** | No-op. Display: "Document is already local at `<path>`. No external provider configured." |
| **doc_list** | List all `.md` files in `docs/` recursively with last modified date and size |
| **doc_sync** | No-op. Display: "Local provider — nothing to sync. Documentation lives in `docs/`." |
| **doc_import** | Display: "Import requires an external provider (ado or github). Configure a provider in CONTEXT.md `## Doc Provider` section." |
| **doc_review** | Check local docs for staleness by comparing references against the current codebase |
