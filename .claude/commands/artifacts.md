# Artifacts Command

Query, browse, and manage the artifact registry. Artifacts are tracked via `.meta.json` sidecar files alongside each artifact.

## Usage

```bash
/artifacts list [--type <type>] [--work-item <id>] [--project <name>] [--since <date>]
/artifacts view <path>
/artifacts index
/artifacts stats [--type <type>] [--project <name>]
/artifacts tag <path> <tags...>
```

## Arguments

- `$ARGUMENTS` — A subcommand (`list`, `view`, `index`, `stats`, `tag`) with optional flags

## Subcommand Routing

1. **If `$ARGUMENTS` starts with `list`**: Route to `/artifacts list`
2. **If `$ARGUMENTS` starts with `view`**: Route to `/artifacts view`
3. **If `$ARGUMENTS` starts with `index`**: Route to `/artifacts index`
4. **If `$ARGUMENTS` starts with `stats`**: Route to `/artifacts stats`
5. **If `$ARGUMENTS` starts with `tag`**: Route to `/artifacts tag`
6. **Otherwise**: Display usage help

---

## Sidecar Metadata Schema

Every tracked artifact has a companion `.meta.json` file alongside it with the same base name:

```
.claude/artifacts/auth/
├── 2026-02-15-auth-flow.md
└── 2026-02-15-auth-flow.meta.json
```

### Schema

```json
{
  "type": "design | author-quiz | acceptance-quiz | implementation | doc-generation | code-review | prompt-pattern",
  "workItem": "W-NNN",
  "project": "ProjectName",
  "created": "YYYY-MM-DD",
  "source": "/work review | /review | /doc generate | /sketch | manual",
  "status": "completed | declined | draft | final",
  "tags": ["tag1", "tag2"],
  "summary": "One-line description of this artifact",
  "extra": {}
}
```

### Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | One of the 6 artifact types (see Artifact Types below) |
| `workItem` | No | Associated work item ID (e.g., `W-003`). Empty string if none. |
| `project` | Yes | Project name from CONTEXT.md or item file |
| `created` | Yes | Date artifact was created (YYYY-MM-DD) |
| `source` | Yes | Command or process that created this artifact |
| `status` | Yes | Current state of the artifact |
| `tags` | No | Free-form tags for categorization. Default `[]`. |
| `summary` | Yes | One-line human-readable description |
| `extra` | No | Type-specific data (see below). Default `{}`. |

### Artifact Types

| Type | Source | Description | `extra` fields |
|------|--------|-------------|----------------|
| `design` | artifact-first rule, `/sketch` | Architecture diagrams, mockups, implementation plans | — |
| `author-quiz` | `/work review` (W-033) | Author comprehension quiz — key implementation decisions | `{ "score": "4/5", "questions": 5, "reviewedBy": "NH" }` |
| `acceptance-quiz` | `/work done` (W-033) | Acceptance verification quiz — requirement alignment + scope drift | `{ "score": "4/5", "questions": 5, "reviewType": "peer-review", "scopeDriftDetected": false }` |
| `implementation` | Feature work | Implementation notes, fix logs | — |
| `doc-generation` | `/doc generate` (W-019, future) | Generated documentation outputs | `{ "docType": "api", "pages": 3 }` |
| `code-review` | `/review` command | Code review findings | `{ "critical": 0, "errors": 1, "warnings": 3 }` |
| `prompt-pattern` | `/patterns` (W-022, future) | Interaction pattern captures | — |

### Status Values

| Status | Meaning |
|--------|---------|
| `completed` | Artifact is finished and final |
| `declined` | User opted out (e.g., skipped a review quiz) |
| `draft` | Work in progress, may be revised |
| `final` | Formally approved or published |

---

## `/artifacts list` — Query Artifacts

Scan all `.meta.json` files in `.claude/artifacts/` and display matching results.

### Steps

1. **Recursively scan** `.claude/artifacts/**/*.meta.json`
2. **Parse each JSON file** — skip malformed files with a warning
3. **Apply filters** from flags:
   - `--type <type>`: Match `type` field exactly
   - `--work-item <id>`: Match `workItem` field exactly
   - `--project <name>`: Match `project` field (case-insensitive)
   - `--since <date>`: Match `created` >= date (YYYY-MM-DD format)
4. **Sort results** by `created` descending (most recent first)
5. **Display results table**:

   ```
   Artifacts (5 found)

   | Date | Type | Work Item | Status | Summary | Path |
   |------|------|-----------|--------|---------|------|
   | 2026-03-04 | review-quiz | W-020 | completed | Review quiz — 4/5 | reviews/2026-03-04-W-020-review-quiz.md |
   | 2026-03-01 | design | W-003 | final | ADO type-state inventory | provider-abstraction/2026-03-01-ado-type-state-inventory.md |
   ```

6. **If no `.meta.json` files found**: "No tracked artifacts found. Artifacts need a `.meta.json` sidecar to appear in the registry. See `/artifacts` usage for the schema."
7. **If filters produce no matches**: "No artifacts match the given filters. Run `/artifacts list` without filters to see all tracked artifacts."

---

## `/artifacts view <path>` — View Artifact Detail

Display an artifact's content alongside its metadata.

### Steps

1. **Resolve path** — `<path>` is relative to `.claude/artifacts/`. Resolve to full path.
2. **Read the artifact file** (`.md` or other)
3. **Read the companion `.meta.json`** (same directory, same base name)
4. **Display metadata header**:

   ```
   Artifact: reviews/2026-03-04-W-020-review-quiz.md

   Type: review-quiz
   Work Item: W-020
   Project: WorkSpaceFramework
   Created: 2026-03-04
   Source: /work review
   Status: completed
   Tags: review, quiz
   Summary: Review quiz — 4/5

   ---
   ```

5. **Display artifact content** below the metadata header
6. **If artifact file not found**: "Artifact not found at `<path>`. Run `/artifacts list` to see available artifacts."
7. **If `.meta.json` not found**: Display artifact content with note: "No metadata found for this artifact. Run `/artifacts tag <path>` to create one, or see the `.meta.json` schema in this command's documentation."

---

## `/artifacts index` — Rebuild INDEX.md

Generate a browsable index file from all `.meta.json` files.

### Steps

1. **Recursively scan** `.claude/artifacts/**/*.meta.json`
2. **Parse all metadata files** — skip malformed files with a warning
3. **Aggregate by type** — count artifacts per type, find latest date per type
4. **Sort recent artifacts** by `created` descending, take top 20
5. **Generate INDEX.md** at `.claude/artifacts/INDEX.md`:

   ```markdown
   # Artifact Index

   **Generated**: YYYY-MM-DD — rebuild with `/artifacts index`

   ## Summary

   | Type | Count | Latest |
   |------|-------|--------|
   | design | 3 | 2026-03-01 |
   | review-quiz | 5 | 2026-03-04 |
   | implementation | 2 | 2026-02-28 |

   ## Recent Artifacts

   | Date | Type | Work Item | Status | Summary | Path |
   |------|------|-----------|--------|---------|------|
   | 2026-03-04 | review-quiz | W-020 | completed | Review quiz — 4/5 | reviews/2026-03-04-W-020-review-quiz.md |
   | 2026-03-01 | design | W-003 | ADO type-state inventory | final | provider-abstraction/2026-03-01-ado-type-state-inventory.md |

   ## By Work Item

   | Work Item | Artifacts | Types |
   |-----------|-----------|-------|
   | W-020 | 2 | review-quiz |
   | W-003 | 1 | design |
   ```

6. **Report**: "Index rebuilt — {N} artifacts across {M} types."
7. **If no `.meta.json` files found**: Write a minimal INDEX.md with "No tracked artifacts yet." and report: "Index rebuilt — 0 artifacts found."

---

## `/artifacts stats` — Aggregate Statistics

Show aggregate statistics about tracked artifacts.

### Steps

1. **Recursively scan** `.claude/artifacts/**/*.meta.json`
2. **Apply filters** from flags:
   - `--type <type>`: Only include matching type
   - `--project <name>`: Only include matching project
3. **Calculate aggregates**:

   ```
   Artifact Statistics

   Total: 12 artifacts

   By Type:
     design          4 (33%)
     review-quiz     3 (25%)
     implementation  2 (17%)
     code-review     2 (17%)
     doc-generation  1 (8%)

   By Status:
     completed  8 (67%)
     final      2 (17%)
     declined   1 (8%)
     draft      1 (8%)

   By Project:
     WorkSpaceFramework  7
     MyApp               5

   Date Range: 2026-02-15 to 2026-03-04
   ```

4. **Type-specific summaries** (when data exists in `extra`):

   ```
   Review Quiz Summary:
     Completed: 2, Declined: 1
     Average score: 4.0/5.0

   Code Review Summary:
     Total reviews: 2
     Critical issues: 0, Errors: 3, Warnings: 8
   ```

5. **If no `.meta.json` files found**: "No tracked artifacts found. Nothing to aggregate."

---

## `/artifacts tag <path> <tags...>` — Tag an Artifact

Add tags to an artifact's metadata. Creates the `.meta.json` file if it doesn't exist.

### Steps

1. **Resolve path** — `<path>` is relative to `.claude/artifacts/`
2. **Verify artifact file exists** at the resolved path
3. **Read existing `.meta.json`** if present
4. **If `.meta.json` doesn't exist** — create one with minimal metadata:
   ```json
   {
     "type": "implementation",
     "workItem": "",
     "project": "",
     "created": "YYYY-MM-DD",
     "source": "manual",
     "status": "draft",
     "tags": [],
     "summary": "",
     "extra": {}
   }
   ```
   Ask user to confirm or fill in the `type` and `summary` fields via AskUserQuestion.
5. **Append tags** — merge new tags into existing `tags` array, deduplicate
6. **Write `.meta.json`** back
7. **Report**: "Tagged `<path>` with: tag1, tag2 (now has N total tags)"

---

## Integration Contract

Systems that produce artifacts should write a `.meta.json` sidecar alongside the artifact file. Each producer owns its metadata creation.

### For `/work review` (W-033 — author quiz)

```json
{
  "type": "author-quiz",
  "workItem": "W-NNN",
  "project": "ProjectName",
  "created": "YYYY-MM-DD",
  "source": "/work review",
  "status": "completed",
  "tags": ["review", "quiz", "author"],
  "summary": "Author quiz — 4/5",
  "extra": { "score": "4/5", "questions": 5, "reviewedBy": "NH" }
}
```

For declined quizzes, set `"status": "declined"` and omit score/reviewedBy from `extra`.

### For `/work done` (W-033 — acceptance quiz)

```json
{
  "type": "acceptance-quiz",
  "workItem": "W-NNN",
  "project": "ProjectName",
  "created": "YYYY-MM-DD",
  "source": "/work done",
  "status": "completed",
  "tags": ["review", "quiz", "acceptance"],
  "summary": "Acceptance quiz — 4/5",
  "extra": { "score": "4/5", "questions": 5, "reviewType": "peer-review", "scopeDriftDetected": false }
}
```

`reviewType` is `"self-review"` (same person took both quizzes), `"peer-review"` (different people), or `"unknown"` (no author quiz exists). `scopeDriftDetected` is `true` if any criterion was classified as "Not implemented ⚠️" or "Added ⚠️".

For declined quizzes, set `"status": "declined"` and omit score/reviewType/scopeDriftDetected from `extra`.

### For `/review` (code review)

```json
{
  "type": "code-review",
  "workItem": "W-NNN",
  "project": "ProjectName",
  "created": "YYYY-MM-DD",
  "source": "/review",
  "status": "completed",
  "tags": ["review"],
  "summary": "Code review — 0 critical, 1 error, 3 warnings",
  "extra": { "critical": 0, "errors": 1, "warnings": 3 }
}
```

### For `/doc generate` (W-019 — future)

```json
{
  "type": "doc-generation",
  "workItem": "W-NNN",
  "project": "ProjectName",
  "created": "YYYY-MM-DD",
  "source": "/doc generate",
  "status": "final",
  "tags": ["docs", "api"],
  "summary": "API reference — 3 pages",
  "extra": { "docType": "api", "pages": 3 }
}
```

### For artifact-first rule (design artifacts)

When creating artifacts under `.claude/artifacts/`, produce a `.meta.json` alongside the artifact:

```json
{
  "type": "design",
  "workItem": "W-NNN",
  "project": "ProjectName",
  "created": "YYYY-MM-DD",
  "source": "/sketch",
  "status": "draft",
  "tags": ["design", "mockup"],
  "summary": "Auth flow architecture diagram",
  "extra": {}
}
```

### For `/patterns` (W-022 — future)

```json
{
  "type": "prompt-pattern",
  "workItem": "",
  "project": "ProjectName",
  "created": "YYYY-MM-DD",
  "source": "/patterns analyze",
  "status": "completed",
  "tags": ["patterns", "analysis"],
  "summary": "Weekly interaction pattern analysis",
  "extra": {}
}
```

---

## Important

- **Sidecar files are the source of truth** — `INDEX.md` is generated and should never be manually edited
- **`.meta.json` files are optional** — artifacts without sidecars still exist in the filesystem, they just don't appear in registry queries
- **Producers own their metadata** — each command/system that creates artifacts is responsible for writing the `.meta.json`
- **Graceful degradation** — all subcommands handle missing, malformed, or absent `.meta.json` files without errors
- **Tags are free-form** — no controlled vocabulary. Use consistent conventions within a project.
- **INDEX.md is gitignored** — it's a generated cache, not a source of truth. Add it to `.gitignore` if not already covered.
