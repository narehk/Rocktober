# Provider Interface Contract

Defines the contract all work providers must implement. Providers route `/work` commands to external systems while maintaining local mirrors for display and offline use.

## Provider Resolution

When any `/work` subcommand executes, determine the active provider:

1. **Read CONTEXT.md** — Look for a `## Work Provider` section
2. **Extract provider name** — Read the `**Provider**:` field value (e.g., `ado`, `github`, `local`)
3. **Load provider file** — Read `.claude/providers/{name}.md` for routing instructions
4. **Fallback** — If no `## Work Provider` section exists, or `**Provider**: local`, use `.claude/providers/local.md`

Provider resolution happens once per command invocation. Cache the result for the duration of the command.

## Required Operations

Every provider must handle these operations. The table shows which `/work` subcommands route to the provider vs. stay local-only.

| Operation | Subcommand | Routes to Provider | Description |
|-----------|------------|-------------------|-------------|
| **add** | `/work add` | Yes | Create work item in external system + local mirror |
| **list** | `/work list` | Yes | Query external system, merge with local item data |
| **view** | `/work view` | Yes | Fetch external item details, merge with local |
| **move** | `/work move` | Yes | Transition state in external system + local |
| **start** | `/work start` | Yes | Delegate to move (→ In Progress) |
| **review** | `/work review` | Yes | Delegate to move (→ In Review) |
| **done** | `/work done` | Yes | Delegate to move (→ Done) + resolve links |
| **block** | `/work block` | Yes | Create dependency link in external system + local |
| **unblock** | `/work unblock` | Yes | Remove dependency link in external system + local |
| **sync** | `/work sync` | Yes | Push pending local items, pull external changes |
| **import** | `/work import` | Yes | Fetch external item → create local mirror |
| **export** | `/work export` | Yes | Push local item → create in external system |
| **skip** | `/work skip` | No | Local-only (terminal state management) |
| **revive** | `/work revive` | No | Local-only (reactivation from Skipped) |
| **refine** | `/work refine` | No | Local-only (shaping discussion) |
| **ready** | `/work ready` | No | Local-only (readiness gate) |

## Local Mirror Pattern

**All providers maintain a local copy.** The external system is the source of truth for state, but local files are always authoritative for display.

For every work item created or imported from an external provider:

1. **Item file** — `.claude/work/items/W-NNN.md` exists with full content
2. **Board view** — `BOARD.md` is auto-generated from item files (gitignored, regenerated after every `/work` mutation)
3. **Provider metadata** — Item file includes a `## Provider Integration` section linking back to the external item

This means `/work list` and `/work view` always work, even offline. External queries augment local data, they don't replace it.

## Provider Integration Section Format

When an item is managed by an external provider, add this section to the item file (after the last standard section):

```markdown
## Provider Integration

- **Provider**: ado | github
- **External ID**: <provider-specific ID> (e.g., ADO work item ID, GitHub issue number)
- **URL**: <direct link to the external item>
- **Type**: <provider-specific type> (e.g., Task, Bug, Issue)
- **Sync**: current | pending
- **Last Synced**: <ISO 8601 timestamp>
```

**Field rules:**
- `**Sync**: current` — Local and external are in sync
- `**Sync**: pending` — Local changes haven't been pushed (offline fallback or failed write)
- `**Last Synced**:` — Updated on every successful external read or write

Local-only items (local provider) do NOT have this section.

## Offline Fallback Protocol

When the external provider is unreachable (CLI not installed, auth expired, network down):

1. **Attempt the CLI command** — Try the external operation
2. **On failure, create locally** — Create the item in `.claude/work/items/` (board regenerates automatically)
3. **Mark as pending** — Set `**Sync**: pending` in the Provider Integration section
4. **Warn loudly** — Display: "{Provider} unreachable — created local item. Run `/work sync` when connected."
5. **Remind on list** — `/work list` checks for items with `**Sync**: pending` and shows: "N items pending sync to {provider}"
6. **Push on sync** — `/work sync` scans for pending items and attempts to create/update them in the external system

## Configuration Schema

Each provider reads its configuration from the `## Work Provider` section in CONTEXT.md. Required fields vary by provider:

| Field | ADO | GitHub | Local | Description |
|-------|-----|--------|-------|-------------|
| `**Provider**:` | `ado` | `github` | `local` | Provider identifier |
| `**Organization**:` | Required | — | — | ADO org URL |
| `**Project**:` | Required | Optional | — | ADO project name / GitHub repo |
| `**Process Template**:` | Required | — | — | ADO process template name |
| `**CLI**:` | `az boards` | `gh` | — | CLI tool reference |
| `**Repository**:` | — | Optional | — | GitHub `owner/repo` (auto-detected from git remote if omitted) |
| Type→State mappings | Required | — | — | Per-type ADO state mapping tables |
| Stage→Label mappings | — | Optional | — | Custom label scheme (has defaults) |

## Dual-Write Pattern

Every write operation that touches the external provider also writes locally. The sequence is:

1. **Write to external system** — Create/update in ADO or GitHub
2. **Capture external ID** — Get the ID, URL, and state from the response
3. **Write locally** — Create/update the item file (board regenerates automatically)
4. **Update sync metadata** — Set `**Sync**: current` and `**Last Synced**:` timestamp

If step 1 fails, fall back to the Offline Fallback Protocol (local write with `**Sync**: pending`).

If step 1 succeeds but step 3 fails (unlikely — local filesystem), report the error. The external item exists but the local mirror is incomplete. The next `/work sync` or `/work list` will detect and repair the mismatch.

## Doc Operations Contract

Providers may also handle documentation routing via the `/doc` command. Doc Operations are separate from work item operations — a project can use one provider for work and another for docs.

### Doc Provider Resolution

1. **Read CONTEXT.md** — Look for `## Doc Provider` section
2. **Extract `**Provider**:` value** — `ado`, `github`, or `local`
3. **Load provider file** — Read the `## Doc Operations` section
4. **Fallback** — If no `## Doc Provider` section, default to local (write to `docs/` directory)

### Required Doc Operations

| Operation | Subcommand | Description |
|-----------|------------|-------------|
| **doc_publish** | `/doc publish` | Push a local doc to the external documentation system |
| **doc_list** | `/doc list` | List documentation in the external system |
| **doc_sync** | `/doc sync` | Synchronize local `docs/` with external system |
| **doc_import** | `/doc import` | Pull an external doc to local |
| **doc_review** | `/doc review` | Check external docs for staleness (compare with local) |

### Doc Provider Configuration

Each provider reads its doc configuration from the `## Doc Provider` section in CONTEXT.md:

| Field | ADO | GitHub | Local | Description |
|-------|-----|--------|-------|-------------|
| `**Provider**:` | `ado` | `github` | `local` | Doc provider identifier |
| `**Target**:` | Wiki name | `wiki` or `docs/` | `docs/` | Where docs are published |
| `**Auto-route**:` | `true`/`false` | `true`/`false` | `true`/`false` | Enable auto-routing suggestions |
| `**Doc Types**:` | Comma-separated | Comma-separated | Comma-separated | Which types to auto-suggest (api, guides, adrs, onboarding) |
