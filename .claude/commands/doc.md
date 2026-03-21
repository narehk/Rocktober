# Doc Command

Generate, publish, and manage project documentation. Routes to the configured doc provider (ADO Wiki, GitHub docs, or local `docs/`).

## Usage

```bash
/doc generate <topic>        # Generate docs from codebase, context, and decisions
/doc publish <path>          # Push a local doc to the configured provider
/doc list                    # List documentation in the external system
/doc sync                    # Sync local docs/ with the external documentation system
/doc review [path]           # Review docs for staleness, accuracy, and completeness
/doc import <ref>            # Pull an external doc to local
```

## Arguments

- `$ARGUMENTS` — A subcommand (`generate`, `publish`, `list`, `sync`, `review`, `import`) with optional arguments

## Subcommand Routing

1. **If `$ARGUMENTS` starts with `generate`**: Route to `/doc generate`
2. **If `$ARGUMENTS` starts with `publish`**: Route to `/doc publish`
3. **If `$ARGUMENTS` starts with `list`**: Route to `/doc list`
4. **If `$ARGUMENTS` starts with `sync`**: Route to `/doc sync`
5. **If `$ARGUMENTS` starts with `review`**: Route to `/doc review`
6. **If `$ARGUMENTS` starts with `import`**: Route to `/doc import`
7. **Otherwise**: Display usage help

---

## Doc Provider Resolution

Before executing any subcommand, determine the active doc provider:

1. **Read CONTEXT.md** — Look for `## Doc Provider` section
2. **Extract `**Provider**:` value** — `ado`, `github`, or `local`
3. **Load provider file** — Read `.claude/providers/{name}.md`, specifically the `## Doc Operations` section
4. **If no Doc Provider section** — Default to local provider (write to `docs/` directory)

Doc Provider is separate from Work Provider — a project can use ADO for work tracking and GitHub for documentation, or vice versa.

---

## `/doc generate <topic>` — Generate Documentation

Claude generates documentation from scratch by analyzing the codebase, context, and project history.

### Supported Topics

| Topic | Output | Source Material |
|-------|--------|----------------|
| `api` | API reference (endpoints, parameters, responses, errors) | Source code, route definitions, middleware, test fixtures |
| `guides` | Developer/user guide for a feature or workflow | CONTEXT.md, work item history, implementation artifacts |
| `adr` | Architecture Decision Record | `.claude/memory/` decisions, work item discussions, CONTEXT.md |
| `onboarding` | Getting started / new developer guide | CONTEXT.md, README, project structure, setup scripts |
| `migration` | Migration guide for a breaking change | Git diff, work item acceptance criteria, changelog |

If `<topic>` doesn't match a known type, treat it as a free-form topic and generate documentation based on codebase analysis.

### Steps

1. **Resolve doc provider** — Follow Doc Provider Resolution
2. **Gather source material**:
   - Read `CONTEXT.md` for tech stack, patterns, environment
   - Read relevant source code files (search by topic keywords)
   - Read work item history from `.claude/work/archive/` for decisions and rationale
   - Read artifacts from `.claude/artifacts/` for implementation notes
   - If topic is `api`: scan for route definitions, controllers, endpoints
   - If topic is `adr`: scan `.claude/memory/` for decision records
   - If topic is `onboarding`: read README, package.json/requirements.txt, setup scripts
3. **Generate documentation** — Produce a well-structured document following `documentation-standards.md` quality criteria:
   - Audience identified
   - Task-oriented (how to do X, not just what X is)
   - Working examples included
   - Current state reflected
4. **Write locally** — Save to `docs/<topic>/YYYY-MM-DD-<slug>.md`
5. **Create `.meta.json` sidecar** in `.claude/artifacts/` (if artifact tracking is available):
   ```json
   {
     "type": "doc-generation",
     "workItem": "",
     "project": "ProjectName",
     "created": "YYYY-MM-DD",
     "source": "/doc generate",
     "status": "draft",
     "tags": ["docs", "<topic>"],
     "summary": "Generated <topic> documentation",
     "extra": { "docType": "<topic>", "pages": N }
   }
   ```
6. **Present to user** — Show the generated doc with key sections highlighted
7. **Offer next step**:
   ```javascript
   {
     question: "What would you like to do with this doc?",
     header: "Next Step",
     options: [
       { label: "Publish", description: "Push to configured doc provider" },
       { label: "Edit", description: "Make changes before publishing" },
       { label: "Keep local", description: "Leave in docs/ without publishing" }
     ],
     multiSelect: false
   }
   ```
   - **Publish**: Run `/doc publish <path>` flow
   - **Edit**: User makes changes, then can run `/doc publish` manually
   - **Keep local**: Done — doc stays in `docs/`

### Document Templates

Each topic type follows a consistent template:

**API Reference:**
```markdown
# API Reference: {service/module}

## Overview
{Brief description of the API}

## Authentication
{Auth requirements}

## Endpoints

### {METHOD} {path}
**Description**: {what it does}
**Parameters**: {table of params}
**Request**: {example}
**Response**: {example}
**Errors**: {error codes}
```

**Architecture Decision Record:**
```markdown
# ADR: {title}

**Date**: YYYY-MM-DD
**Status**: proposed | accepted | deprecated | superseded

## Context
{Why was this decision needed?}

## Decision
{What was decided?}

## Consequences
{What are the trade-offs?}

## Alternatives Considered
{What else was evaluated?}
```

**Developer Guide:**
```markdown
# {Feature} Guide

## Overview
{What this feature does and why}

## Prerequisites
{What you need before starting}

## How To
### {Task 1}
{Step-by-step instructions}

### {Task 2}
{Step-by-step instructions}

## Troubleshooting
{Common issues and solutions}
```

---

## `/doc publish <path>` — Publish Documentation

Push a local document to the configured doc provider.

### Steps

1. **Resolve doc provider** — Follow Doc Provider Resolution
2. **Read the local document** at `<path>` (relative to project root)
3. **If provider is local**: Document is already in `docs/` — confirm: "Document is already local at `<path>`. No external provider configured."
4. **If provider is ado or github**: Execute the provider's `doc_publish` operation (see provider `## Doc Operations` section)
5. **Report**: "Published `<path>` to {provider target}"

---

## `/doc publish-review` — Publish Review Artifact to Wiki (Internal)

Publish a quiz artifact from `.claude/artifacts/reviews/` to the Product wiki. This is an internal operation called by `/work review` and `/work done` — not a user-facing subcommand.

### Steps

1. **Resolve doc provider** — Follow Doc Provider Resolution. If local provider, skip wiki publish silently (artifact stays local only).
2. **Read local quiz artifact** from `.claude/artifacts/reviews/{artifact-filename}.md`
3. **Determine wiki target path** from CONTEXT.md Doc Provider → Wiki Structure Convention:
   - Read Product wiki name from `**Target**:` field (this is a **code wiki**, not the project wiki)
   - Read Project name from the work item's `**Project**:` field
   - Construct path: `/{Project}/Reviews/W-NNN-{quiz-type}` (e.g., `/Rocktober/Reviews/W-11968-acceptance-quiz`)
4. **Ensure ancestor pages exist** — Wiki pages require parent pages. Before creating the quiz page, verify (and create if missing) ancestor pages top-down:
   - `/{Project}` — Project landing page
   - `/{Project}/Reviews` — Reviews index page

   For ADO REST API approach, all pages (ancestors + quiz) can be created in a single git push to the wiki backing repo, which is more efficient.
5. **Add work item cross-link** — Include `**ADO Work Item**: [PW #NNN](work_item_url)` in the quiz page metadata so the wiki links back to ADO.
6. **Create/update wiki page** using provider's wiki publish command:
   ```bash
   MSYS_NO_PATHCONV=1 az devops wiki page create --wiki "{product-wiki}" \
     --path "/{Project}/Reviews/W-NNN-{quiz-type}" \
     --content "{quiz artifact markdown}" \
     --org https://dev.azure.com/southbendin -o json
   ```
   - **Note**: `MSYS_NO_PATHCONV=1` is required on Windows/Git Bash to prevent `/path` expansion
   - If page already exists, use `az devops wiki page update` instead (requires `--version` from a prior `az devops wiki page show`)
7. **Return wiki page URL** — extract from the JSON response. The caller (`/work review` or `/work done`) uses this URL to:
   a. Add a hyperlink to the ADO work item (with companion discussion comment — see ado.md Hyperlink Companion Pattern)
   b. Include the URL in the ADO discussion comment
8. **On failure**: Return `null` URL — the caller falls back to embedding full quiz content in the ADO comment instead. Do not block the workflow for a wiki publish failure.

### Called By

| Caller | When | Quiz Type |
|--------|------|-----------|
| `/work review` | After author quiz completion | `author-quiz` |
| `/work done` | After acceptance quiz completion | `acceptance-quiz` |
| `/work author-quiz` | After standalone author quiz | `author-quiz` |
| `/work acceptance-quiz` | After standalone acceptance quiz | `acceptance-quiz` |

---

## `/doc publish-framework` — Publish Framework Docs to Wiki (Internal)

Publish framework lifecycle documentation to the Product wiki. Called during `/setup` or first-run, and when framework rules change.

### Steps

1. **Resolve doc provider** — If local, skip silently.
2. **Read framework rule files**:
   - `.claude/rules/work-system.md` → extract Lifecycle Gates, Valid Transition Matrix, --force semantics
   - `.claude/providers/ado.md` → extract ADO Comment Protocol, Quiz Sync
3. **Ensure ancestor pages exist** — Create `/Framework` page if it doesn't exist in the Product wiki (code wiki).
4. **Publish three wiki pages** to the Product wiki (code wiki from `**Target**:` in CONTEXT.md Doc Provider):
   - `/Framework/Lifecycle-Gates` — valid transitions, gate definitions, --force override semantics
   - `/Framework/Work-Decomposition` — Detail/Task breakdown process (from `/work decompose` docs)
   - `/Framework/ADO-Audit-Trail` — comment protocol, quiz sync flow
   - **Note**: Use `MSYS_NO_PATHCONV=1` on Windows for all wiki path commands
5. **Report**: "Framework docs published to {wiki}/Framework/"

### When to Publish

- **First-run**: During `/setup` when a Doc Provider with ADO wiki is configured
- **On framework change**: When `work-system.md` or `ado.md` are modified (manual trigger via `/doc publish-framework`)
- **Not per-session**: These are published once and updated only when rules change

---

## `/doc list` — List Documentation

List documentation from the configured provider.

### Steps

1. **Resolve doc provider** — Follow Doc Provider Resolution
2. **If provider is local**: List all `.md` files in `docs/` recursively, display as table:
   ```
   Project Documentation (local docs/)

   | Path | Last Modified | Size |
   |------|--------------|------|
   | docs/api/endpoints.md | 2026-03-01 | 3.2 KB |
   | docs/guides/getting-started.md | 2026-02-15 | 5.1 KB |

   4 documents found
   ```
3. **If provider is ado or github**: Execute the provider's `doc_list` operation, merge with local `docs/` listing
4. **Show sync status** if external provider: flag docs that exist locally but not externally, and vice versa

---

## `/doc sync` — Sync Documentation

Synchronize local `docs/` with the external documentation system.

### Steps

1. **Resolve doc provider** — Follow Doc Provider Resolution
2. **If provider is local**: "Local provider — nothing to sync. Documentation lives in `docs/`."
3. **If provider is ado or github**:
   a. **List local docs** — Scan `docs/` directory
   b. **List external docs** — Execute provider's `doc_list` operation
   c. **Compare** — Identify:
      - **Local only**: Docs in `docs/` not in external system → offer to publish
      - **External only**: Docs in external system not in `docs/` → offer to import
      - **Both exist**: Compare content/dates → flag stale docs
   d. **Present sync plan** via AskUserQuestion:
      ```javascript
      {
        question: "How should we handle the sync?",
        header: "Sync Plan",
        options: [
          { label: "Push all", description: "Publish N local docs to {provider}" },
          { label: "Pull all", description: "Import M external docs locally" },
          { label: "Review each", description: "Decide per document" }
        ],
        multiSelect: false
      }
      ```
   e. **Execute sync** based on user choice
   f. **Report**: "Sync complete: N published, M imported, K unchanged"

---

## `/doc review [path]` — Review Documentation

Analyze documentation for staleness, accuracy, and completeness using `documentation-standards.md` quality criteria.

### Steps

1. **Determine scope**:
   - If `<path>` provided: Review that specific document
   - If no path: Review all docs in `docs/` directory
2. **For each document**, evaluate against quality criteria:
   - **Audience identified?** — Does the doc say who it's for?
   - **Task-oriented?** — Does it answer "how do I do X?"
   - **Working examples?** — Are code samples present and likely current?
   - **Current?** — Compare doc references against actual codebase (imports, endpoints, config keys)
   - **Findable?** — Is it in the right location per `file-organization.md`?
3. **Check staleness indicators**:
   - Last modified date vs recent code changes in related files
   - References to files, functions, or endpoints that no longer exist
   - Version numbers or dates that are outdated
4. **Display review report**:
   ```
   Documentation Review

   docs/api/endpoints.md
     PASS  Audience identified (developers)
     PASS  Task-oriented (how to call each endpoint)
     WARN  Example request uses deprecated auth header
     FAIL  References /api/v1/users — endpoint renamed to /api/v2/users

   docs/guides/getting-started.md
     PASS  Audience identified
     PASS  Task-oriented
     PASS  Examples present
     WARN  Last modified 45 days ago — code has changed since

   Summary: 2 docs reviewed — 1 needs updates, 1 has warnings
   ```
5. **Offer to fix**:
   ```javascript
   {
     question: "Would you like me to update the flagged docs?",
     header: "Fix Docs",
     options: [
       { label: "Update all", description: "Fix all flagged issues" },
       { label: "Review each", description: "Go through fixes one by one" },
       { label: "Skip", description: "Just flag them for now" }
     ],
     multiSelect: false
   }
   ```

---

## `/doc import <ref>` — Import External Documentation

Pull a document from the external provider to local.

### Steps

1. **Resolve doc provider** — Follow Doc Provider Resolution
2. **If provider is local**: "Import requires an external provider (ado or github). Configure a provider in CONTEXT.md `## Doc Provider` section."
3. **If provider is ado or github**: Execute the provider's `doc_import` operation
4. **Write locally** — Save to `docs/<appropriate-subdirectory>/<slug>.md`
5. **Report**: "Imported '{title}' to `<local-path>`"

---

## Auto-Routing Triggers

Documentation routing can fire automatically during normal workflow. Auto-routing is **opt-in** via the `**Auto-route**:` field in the Doc Provider config (default: false).

### When Auto-Routing Fires

| Trigger | Condition | Action |
|---------|-----------|--------|
| `/work done <id>` | Item had API changes or new endpoints | Suggest: "This feature added new endpoints. Generate API docs? `/doc generate api`" |
| `/work done <id>` | Item is a significant feature (not a fix) | Suggest: "Generate docs for this feature? `/doc generate guides`" |
| New endpoint detected | `git diff` shows new route/controller | Nudge: "New endpoint added — consider `/doc generate api`" |
| Architecture decision | Item involved `expert-architect` | Suggest: "Record this as an ADR? `/doc generate adr`" |

### Auto-Routing Rules

- **Never auto-generate** — only suggest. The user decides.
- **Only fire when Auto-route is true** in Doc Provider config
- **Respect consultation-first** — suggestions are informational, not actions
- **One nudge per trigger** — don't repeat suggestions for the same item

---

## Integration with Other Systems

### documentation-standards.md
The `/doc review` subcommand evaluates against the quality criteria defined in `documentation-standards.md`. The `/doc generate` subcommand uses the document type triggers from that rule to determine what kind of doc to produce.

### artifact-first.md
Generated documentation can be tracked via the artifact registry (W-021). When `/doc generate` produces output, it writes a `.meta.json` sidecar with `type: "doc-generation"`.

### expert-docs skill
The `expert-docs` skill provides methodology for documentation quality. `/doc generate` can invoke this skill for guidance on structure and content.

### Work Provider
Doc Provider is independent of Work Provider. They can use different backends (e.g., ADO for work tracking, GitHub for documentation).

---

## Important

- **Local first**: All docs are written locally before publishing. The local `docs/` directory is always the working copy.
- **Provider-agnostic generation**: `/doc generate` produces the same output regardless of provider. Only `/doc publish` and `/doc sync` interact with external systems.
- **Quality gate**: Generated docs should meet `documentation-standards.md` criteria before publishing.
- **No auto-publish**: Even with auto-routing enabled, docs are only suggested, never published without user confirmation.
- **Artifact tracking**: When the artifact registry (W-021) is available, doc generation produces `.meta.json` sidecars for tracking.
