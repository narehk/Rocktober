# Work Command

Unified work tracking. One system, one command. Replaces separate idea and work item workflows.

## Usage

```bash
# Capture
/work add "thought or idea"          # Quick capture (status: captured)
/work add "thought" --project MyApp  # Capture with project tag
/work add "thought" --assign NH      # Capture with assignee (initials from Team Members)

# View
/work board                          # Regenerate BOARD.md from item files
/work list                           # Show full board across all projects
/work list <project>                 # Filter by project
/work list <stage>                   # Filter by lifecycle stage (captured, shaping, ready, etc.)
/work list @name                     # Filter by assignee (name or initials)
/work list unassigned                # Show only unassigned items
/work list blocked                   # Show only blocked items across all stages
/work view <id>                      # Show full detail for an item

# Shape
/work refine <id>                    # Start shaping discussion (invokes ideate skill)
/work ready <id>                     # Mark shaped and ready for implementation

# Implement
/work start <id>                     # Begin implementation (sets In Progress)
/work review <id>                    # Move to In Review (includes author quiz)
/work author-quiz <id>               # Take or retake the author quiz standalone
/work acceptance-quiz <id>           # Take or retake the acceptance quiz standalone
/work done <id>                      # Complete and archive
/work move <id> <stage>              # Manual stage override (detects backward moves)
/work block <id> --on <blocker>      # Mark item as blocked (by item ID or free text)
/work unblock <id> [blocker]         # Remove a specific blocker (or all if none specified)
/work skip <id> [reason]              # Move to Skipped with resolution
/work revive <id>                     # Move Skipped item back to Captured

# Provider Integration
/work sync                           # Sync with external provider (ADO/GitHub)
/work import <ref>                   # Import from external provider (ADO ID or GitHub issue #)
/work export <id>                    # Export local item to external provider
```

## Provider Resolution

Before executing any routed subcommand, determine the active provider:

1. **Read CONTEXT.md** — Look for `## Work Provider` section
2. **Extract `**Provider**:` value** — `ado`, `github`, or `local`
3. **Load provider file** — Read `.claude/providers/{name}.md` for operation-specific routing
4. **If no Work Provider section** — Default to local provider (`.claude/providers/local.md`)

### Provider Routing Table

| Subcommand | Routes to Provider | Notes |
|------------|-------------------|-------|
| `add` | Yes | External creation + local mirror |
| `list` | Yes | External query merged with local item data |
| `view` | Yes | External fetch merged with local item |
| `move`, `start`, `review`, `done` | Yes | External state transition + local update |
| `block`, `unblock` | Yes | External dependency links + local update |
| `sync`, `import`, `export` | Yes | External sync operations |
| `skip`, `revive` | No | Local-only terminal state management |
| `refine` | Conditional | Local shaping + Gherkin field sync to ADO for Requirements/Change Orders |
| `ready` | Conditional | Local readiness gate + ADO state stepping + Gherkin validation for Requirements/Change Orders |
| `author-quiz` | No | Local-only author quiz |
| `acceptance-quiz` | Optional | Local quiz; queries provider for related-impact items when configured |

### Dual-Write Pattern

Every write that routes to a provider follows this sequence:

1. Write to external system (ADO/GitHub)
2. Capture external ID and state from the response
3. Write locally (item file)
4. Set `**Sync**: current` and `**Last Synced**:` in Provider Integration section

On external failure, fall back to local-only creation with `**Sync**: pending`. See `provider.md` for the full Offline Fallback Protocol.

## Board Generation

BOARD.md is a **generated file** — derived entirely from item files. It is gitignored and never committed.

Board generation is performed by `.claude/scripts/generate-board.sh` — a shell script that scans item files, parses metadata, and renders the markdown tables. This avoids consuming LLM context for mechanical file I/O.

### How to Regenerate

Run:

```bash
bash .claude/scripts/generate-board.sh .claude/work
```

The script:
1. Scans `items/*.md` and `archive/*.md`
2. Parses metadata from the header section of each file (Status, Title, Category, Project, Assigned, Added, Blocked By, Completed, Resolution)
3. Extracts ID from filename (e.g., `W-001.md` → `W-001`)
4. Groups by status → board section
5. Sorts: active sections by Added ascending (ID ascending tiebreak), Done by Completed descending (ID descending tiebreak), Skipped by Added ascending
6. Renders markdown tables matching the BOARD.md format defined in `work-system.md`
7. Writes to `.claude/work/BOARD.md`
8. Prints summary to stderr: "Board regenerated — N active, M archived"

### ID Assignment

When assigning the next W-NNN ID (e.g., during `/work add`):

1. Scan filenames in `.claude/work/items/` and `.claude/work/archive/` for `W-NNN.md` pattern
2. Extract all numeric values
3. Take max + 1. If no files exist, start at W-001.

### When to Regenerate

- **`/work board`**: Explicit manual regeneration
- **`/work list`**: Regenerate before displaying (ensures board is always current)

Mutating subcommands (`add`, `refine`, `ready`, `start`, `review`, `done`, `move`, `block`, `unblock`, `skip`, `revive`, `import`, `sync`) do **not** regenerate the board. This keeps mutations fast — the board is regenerated lazily when viewed.

### `/work board`

Regenerate BOARD.md from item files manually.

1. Run `bash .claude/scripts/generate-board.sh .claude/work`
2. Confirm with the summary printed by the script

## Command Implementation

### `/work add <description> [--project <name>] [--assign <initials>]`

0. **Resolve provider** — Follow Provider Resolution steps above
1. **Parse description** and detect category using keyword matching
2. **Detect type** based on keywords:
   - "improve", "fix", "enhance", "update" → `enhancement`
   - "bug", "error", "broken" → `fix`
   - Otherwise → `feature`
3. **Suggest category** via keyword matching against configured categories

   **Category keyword matching:**

   | Category | Keywords |
   |----------|----------|
   | **ui** | ui, frontend, component, page, layout, button, form, modal, design, css, style |
   | **backend** | api, endpoint, route, server, database, query, auth, middleware |
   | **infrastructure** | deploy, ci, cd, build, docker, pipeline, config, tooling, script |
   | **performance** | cache, speed, optimize, performance, slow, fast, latency |
   | **security** | auth, login, jwt, oauth, permission, vulnerability, xss, csrf |
   | **docs** | doc, readme, guide, tutorial, comment, changelog |

4. **Confirm category** with AskUserQuestion (binary: Yes/Change)

   ```javascript
   {
     question: "Add this to '{detected_category}' category?",
     header: "Category",
     options: [
       { label: "Yes", description: "Add to {category} section" },
       { label: "Change", description: "Pick a different category" }
     ],
     multiSelect: false
   }
   ```

   If "Change", ask conversationally for category (may exceed 4 options).

   b. **If provider is ADO** — Detect ADO work item type using provider-specific keyword matching (see `ado.md` type detection table). Confirm type via AskUserQuestion. Look up initial ADO state from CONTEXT.md type→state mappings.

   c. **If provider is ADO and Parent-Child Validation table exists in CONTEXT.md** — Look up the detected type in the table. If the type has valid parent types (not `(root)` or standalone), ask conversationally: "This {type} needs a parent {valid_parent_types}. What's the ADO ID of the parent? (or 'skip' to create unlinked)". If the type is auto-created (Planned Work, Unplanned Work), explain and redirect: "This type is auto-created when a {Requirement/Change Order} is approved. Use `/work ready` on the parent instead." and stop.

   d. **If provider is not local** — Create in external system via provider instructions (including parent linking if parent ADO ID provided). Capture external ID and URL from response. On failure, fall back to Offline Fallback Protocol.

5. **Assign next ID**: Scan filenames in `.claude/work/items/` and `.claude/work/archive/` for `W-NNN.md` pattern, take max + 1 (see Board Generation → ID Assignment)
   b. **Set assignee** if `--assign` flag provided. When Team Members are configured in CONTEXT.md, validate the initials against the Team Members table. If invalid, show the valid options and ask again. When Team Members are not configured, accept any value as-is.
6. **Create item file** in `.claude/work/items/W-NNN.md` (minimal captured template, include `**Assigned**: <initials>` field, include `**ADO Parent ID**: {parent_ado_id}` if linked, include `**Frozen**: false`). If provider is not local, add `## Provider Integration` section with external ID, URL, type, sync status, and timestamp.
7. **Confirm**: "Added W-NNN: '{title}' to {category} (captured)" — if external provider, append provider-specific confirmation (e.g., "— ADO Task #1234")
9. **Emit telemetry event** (fire-and-forget) — Append one JSON line to the current session file in `.claude/patterns/sessions/` (see `patterns.md` Integration Contract for session file naming and schema):
   ```json
   { "ts": "<ISO 8601>", "type": "command", "command": "/work add", "item": "W-NNN", "project": "<project>", "outcome": "completed", "context": { "category": "<category>", "type": "<type>", "provider": "<provider>" } }
   ```
   If the session directory or file doesn't exist, create it (`YYYY-MM-DD-<6-char-hex>.jsonl`). If the write fails, silently skip — never surface event logging failures to the user.

### `/work list [filter]`

0. **Resolve provider** — Follow Provider Resolution steps above
1. **Scan item files** from `.claude/work/items/` and `.claude/work/archive/`, parse metadata (see Board Generation → Generation Algorithm steps 1-4)
   b. **If provider is not local** — Query external system (see provider file for query instructions). Merge results with local item data (local is authoritative for display, external surfaces new or updated items).
   c. **Check for pending sync** — Scan item files for `**Sync**: pending`. If found, append reminder after board display: "N items pending sync to {provider}. Run `/work sync` to push."
2. **If no filter**: Display full board (all stages)
3. **If filter matches a stage name** (captured, shaping, ready, in-progress, in-review, done): Show only that stage
   b. **If filter starts with `@`**: Match the value after `@` against Team Members (Name or Initials). Show all stages filtered to items assigned to that person.
   c. **If filter is `unassigned`**: Show all stages filtered to items with an empty Assigned column.
   d. **If filter is `blocked`**: Scan all item files for non-empty `**Blocked By**:` fields. Display those items grouped by current stage, showing what blocks each one.
4. **If filter matches a project name**: Show all stages filtered to that project
5. **Regenerate board** by running `bash .claude/scripts/generate-board.sh .claude/work` — ensures BOARD.md is always current before display
6. **Display formatted board** with counts per stage

### `/work view <id>`

1. **Read item file** from `.claude/work/items/<id>.md`
2. **Display full content** including all sections present

### `/work refine <id>`

1. **Read item file**
2. **Detect acceptance criteria format** — Read the item's ADO type from Provider Integration section or item metadata. Check the Acceptance Criteria Format table in CONTEXT.md (if present). If the type requires Gherkin (Requirement, Change Order), pass this context to the ideate skill so it guides toward Given/When/Then scenarios.
3. **Invoke ideate skill** with item context (including Gherkin flag if applicable)
4. **Suggest relevant experts** based on category (from work-system.md mapping)
5. **Guide shaping discussion**: problem statement, proposed solution, acceptance criteria (Gherkin format for Requirements/Change Orders, checklist for all others)
6. **Update item file** with discussion outcomes (set status to `shaping`)
7. **Sync Gherkin to ADO** — If the item is a Requirement or Change Order with an ADO ID, and Gherkin acceptance criteria were written, sync the four Gherkin fields to ADO (see `ado.md` → Gherkin Field Sync). This ensures the dedicated ADO fields (Custom.Scenario, Custom.Given, Custom.When, Custom.Then) are populated — not just the local item file.
6. **Emit telemetry event** (fire-and-forget) — Append one JSON line to the current session file in `.claude/patterns/sessions/`:
   ```json
   { "ts": "<ISO 8601>", "type": "command", "command": "/work refine", "item": "<id>", "project": "<project>", "outcome": "completed", "context": { "questions": <count>, "statusOutcome": "<shaping|ready>" } }
   ```
   `questions` is the number of open questions discussed during the shaping session. `statusOutcome` is the item's status after refinement. If the write fails, silently skip.

### `/work ready <id>`

1. **Verify item has**: problem statement, proposed solution, acceptance criteria
2. **If missing required fields**, prompt user to refine first
3. **Validate acceptance criteria format** — Read the item's ADO type. Check CONTEXT.md Acceptance Criteria Format table (if present):
   - If type requires Gherkin (Requirement, Change Order): validate that acceptance criteria contain Given/When/Then blocks. If not, block: "This {type} requires Gherkin acceptance criteria. Run `/work refine {id}` to restructure."
   - If type uses checklists: validate `- [ ]` format (existing behavior)
   - If no Acceptance Criteria Format table in CONTEXT.md, skip format validation (backward compat)
4. **State stepping for Requirements** — Requirements advance one ADO state at a time. `/work ready` checks the current ADO state and advances to the next:
   - If current state is **To Do** → advance to **Scoping** (enter shaping). Update local status to `shaping`.
   - If current state is **Scoping** → advance to **Signing** (formal sign-off). **Before advancing**: validate that ADO Gherkin fields (Custom.Scenario, Custom.Given, Custom.When, Custom.Then) are populated. If empty, sync them from the local item file first (see `ado.md` → Gherkin Field Sync). If the local file also lacks Gherkin, block: "Gherkin acceptance criteria required before Signing. Run `/work refine {id}`." Update local status to `signing`. Report: "Requirement moved to Signing — formal sign-off recorded for audit trail."
   - If current state is **Signing** → advance to **Approved** (freeze point). This triggers freeze:
     a. Warn: "This will freeze Requirement #{id}. Content becomes immutable."
     b. Update ADO state to Approved
     c. Set `**Frozen**: true` and `**Frozen Date**: YYYY-MM-DD` in item file
     d. Update local status to `ready`
     e. Trigger Planned Work creation (see ado.md Planned Work / Unplanned Work Creation)
   - If current state is **Approved** (already frozen) → **Planned Work redirect with confirmation**:
     a. Check if a Planned Work item already exists for this Requirement (scan local items for `**Execution Copy Of**: W-{id}` or query ADO for child Planned Work items under this Requirement)
     b. If Planned Work already exists: Report "Planned Work #{pw_id} already exists. Use `/work start {pw_id}` to begin." and stop.
     c. If no Planned Work exists: Report "Requirement #{id} is already Approved and frozen. To start working on it, a Planned Work execution copy is needed."
     d. Prompt: "Create Planned Work? (Yes / No — use `/work start {id}` later instead)"
     e. If Yes: Create Planned Work (see ado.md → Planned Work / Unplanned Work Creation)
     f. **Batch mode**: When multiple frozen items are processed together, show a summary table of all items needing Planned Work, then a single Yes/No prompt for the batch.
   - Report the current state and what the next `/work ready` call will do.
5. **State stepping for Change Orders** — Fewer states:
   - If current state is **To do** → advance to **Viable** (shaping). Update local status to `shaping`.
   - If current state is **Viable** → advance to **Approved** (freeze point). Same freeze workflow as Requirements step 4, but creates Unplanned Work instead of Planned Work.
   - If current state is **Approved** (already frozen) → Same redirect-with-confirmation flow as Requirements step 4 (Approved), but creates Unplanned Work instead of Planned Work.
6. **For all other types** — Update item file status to `ready` (existing behavior). If provider is ADO, execute the state transition per type→state mappings.

### `/work start <id>`

0. **Resolve provider** — Follow Provider Resolution steps. If provider is not local, execute external state transition to In Progress (see provider file for `start` operation).
1. **Update item file** status to `in-progress`
2. **Check assignment**: If CONTEXT.md has a Team Members section and the item has no assignee, prompt for assignment:
      ```javascript
      {
        question: "Who is working on this item?",
        header: "Assign",
        options: [
          // One option per team member from CONTEXT.md Team Members table
          { label: "{Name} ({Initials})", description: "{Role}" },
          // ...
          { label: "Skip", description: "Leave unassigned for now" }
        ],
        multiSelect: false
      }
      ```
      If Team Members is not configured in CONTEXT.md, skip this step entirely.
3. **Ask for branch name**: Read CONTEXT.md for a Git Workflow section. If branch naming conventions are configured (e.g., `<type>/<id>-<slug>`), suggest a branch name following that pattern (e.g., `feat/W-001-user-auth`). If no Git Workflow section exists, suggest based on title as before.
4. **Record branch in item file**
5. **Git guidance output** — Per `git-guidance.md`, read the user's Git Comfort level from CONTEXT.md Team Members table and output branch creation guidance:
   - `guided`: "Created branch `<name>` — this is your isolated workspace. Nothing here affects the main codebase until you choose to share it. **Next step**: Make your changes, then run `/commit` when ready to save a checkpoint."
   - `terse`: "Created branch `<name>`. **Next step**: `/commit` when ready."
6. **Emit telemetry event** (fire-and-forget) — Append one JSON line to the current session file in `.claude/patterns/sessions/`:
   ```json
   { "ts": "<ISO 8601>", "type": "command", "command": "/work start", "item": "<id>", "project": "<project>", "outcome": "completed", "context": { "branchCreated": true, "assigned": <bool> } }
   ```
   `assigned` is `true` if the item has an assignee after this step, `false` otherwise. If the write fails, silently skip.
7. **Check for shaping completeness** — Scan the item file for `## Problem Statement` and `## Acceptance Criteria` sections. If either is missing, warn:
   > "This item is missing [Problem Statement / Acceptance Criteria]. Consider running `/work refine W-NNN` first."

   Present AskUserQuestion:
   ```javascript
   {
     question: "This item is missing shaping fields. Proceed without full shaping?",
     header: "Shaping",
     options: [
       { label: "Yes, proceed", description: "Enter plan mode with available context" },
       { label: "Refine first", description: "Stop here — run /work refine to shape the item" }
     ],
     multiSelect: false
   }
   ```
   If user selects "Refine first", stop. Don't block — user can override with "Yes, proceed".
   If both sections are present, skip this step silently.

8. **Gather plan mode context** — Read the full item file. Build the plan mode seed:

   a. **If a `## Plan Mode Prompt` section exists** (generated by the ideate skill during `/work refine`), use its content as the plan mode seed verbatim.

   b. **If no `## Plan Mode Prompt` section exists**, construct a seed from available sections:
      ```
      Implement [Title].

      [One-Liner]

      ## Problem
      [Content from ## Problem Statement, if present]

      ## Solution
      [Content from ## Proposed Solution, if present]

      ## Acceptance Criteria
      [Content from ## Acceptance Criteria, if present]

      ## Suggested Experts
      [Content from ## Suggested Experts, if present]
      ```
      Omit any section header whose content is not present in the item file.

   c. **Design artifacts** — If a `## Design Artifacts` section exists and lists file paths, read the content of each referenced file and append it to the seed under a `## Design Context` heading. If files are not found, skip them silently.

9. **Enter plan mode** — Call `EnterPlanMode` with the gathered context as the planning prompt. Plan mode's native lifecycle takes over from here: the user explores the codebase, designs the implementation, approves the plan, and exits. Plan mode's exit/clear behavior provides a clean context boundary between ideation and implementation.

### `/work review <id>`

0. **Resolve provider** — Follow Provider Resolution steps. If provider is not local, execute external state transition to In Review (see provider file for `review` operation).
1. **Update item file** status to `in-review`
2. **Record PR link** if provided
4. **Author quiz** — After completing the status transition, present a comprehension quiz focused on key decisions made during implementation:

   a. **Offer opt-out** via AskUserQuestion:
      ```javascript
      {
        question: "Take the author quiz? (3-5 questions about key decisions you made during implementation)",
        header: "Author Quiz",
        options: [
          { label: "Yes", description: "Quick comprehension check — tests WHY decisions were made, not WHAT was built" },
          { label: "Skip", description: "Decline the quiz (recorded for audit trail)" }
        ],
        multiSelect: false
      }
      ```

   b. **If Yes** — Generate and present the quiz:
      1. **Read source material**: Commit messages on the feature branch (run `git log main..HEAD --oneline` or equivalent) + item file (proposed solution, acceptance criteria) + code changes on the branch (`git diff main..HEAD --stat` for scope awareness)
      2. **Generate 3-5 multiple choice questions**: Questions should test WHY decisions were made, not WHAT was built. Each question has 3-4 options with one correct answer. Question styles:
         - **Decision rationale**: "Why was X approach chosen over Y?"
         - **Trade-off awareness**: "What trade-off does the chosen approach introduce?"
         - **Scope boundaries**: "Which of these was deliberately excluded from scope?"
         - **Implementation choices**: "What motivated the choice of [pattern/library/structure]?"
      3. **Present each question** via sequential `AskUserQuestion` calls:
         ```javascript
         {
           question: "Q1: {question text}",
           header: "Quiz Q1",
           options: [
             { label: "A", description: "{option A text}" },
             { label: "B", description: "{option B text}" },
             { label: "C", description: "{option C text}" }
           ],
           multiSelect: false
         }
         ```
      4. **Score the quiz** — count correct answers
      5. **Generate brief assessment** — a 1-2 sentence LLM assessment of understanding based on which questions were answered correctly/incorrectly
      6. **Prompt for reviewer identity**:
         - If CONTEXT.md has a Team Members section, present AskUserQuestion with team member options + "Anonymous"
         - If no Team Members configured, ask conversationally: "Who is taking this quiz? (initials or name, or 'anonymous')"
         - Store the response as `reviewedBy`
      7. **Store completed quiz artifact** in `.claude/artifacts/reviews/YYYY-MM-DD-W-NNN-author-quiz.md`:
         ```markdown
         # Author Quiz: W-NNN — {title}

         **Date**: YYYY-MM-DD
         **Status**: completed
         **Score**: X/Y
         **Reviewed By**: {initials or "anonymous"}

         ## Questions

         ### Q1: {question text}
         - A) {option} ← selected
         - B) {option}
         - C) {option} ✓ (correct)

         ### Q2: ...

         ## Summary

         {Brief LLM assessment of understanding based on answers}
         ```
      8. **Store `.meta.json` sidecar** alongside the quiz artifact:
         ```json
         {
           "type": "author-quiz",
           "workItem": "W-NNN",
           "project": "ProjectName",
           "created": "YYYY-MM-DD",
           "source": "/work review",
           "status": "completed",
           "tags": ["review", "quiz", "author"],
           "summary": "Author quiz — X/Y",
           "extra": { "score": "X/Y", "questions": Y, "reviewedBy": "{initials}" }
         }
         ```
      9. **Report score**: "Author quiz completed: X/Y. {brief assessment}"

   c. **If Skip** — Store declination artifact:
      1. **Store declination artifact** in `.claude/artifacts/reviews/YYYY-MM-DD-W-NNN-author-quiz.md`:
         ```markdown
         # Author Quiz: W-NNN — {title}

         **Date**: YYYY-MM-DD
         **Status**: declined

         The user chose to skip the author quiz for this item.
         ```
      2. **Store `.meta.json` sidecar**:
         ```json
         {
           "type": "author-quiz",
           "workItem": "W-NNN",
           "project": "ProjectName",
           "created": "YYYY-MM-DD",
           "source": "/work review",
           "status": "declined",
           "tags": ["review", "quiz", "author"],
           "summary": "Author quiz — declined",
           "extra": {}
         }
         ```
      3. **Report**: "Author quiz skipped — declination recorded."

### `/work author-quiz <id>`

Generate and present the author quiz as a standalone subcommand. Useful if the user skipped during `/work review` and wants to take it later, or wants to retake.

1. **Read item file** from `.claude/work/items/<id>.md` or `.claude/work/archive/<id>.md`
2. **Verify item is in-review or done** — quiz is only meaningful for items that have reached review stage
3. **Generate and present quiz** — same steps as `/work review` step 4b (generate questions, present via AskUserQuestion, score, assess, prompt for reviewer identity)
4. **Store quiz artifact** — overwrites any existing author quiz artifact (including declinations) for this work item
5. **Store `.meta.json` sidecar** — same schema as `/work review` author quiz
6. **Report score**: "Author quiz completed: X/Y. {brief assessment}"

### `/work done <id>`

0. **Resolve provider** — Follow Provider Resolution steps. If provider is not local, execute external state transition to Done (see provider file for `done` operation). For ADO, this also resolves predecessor links. For GitHub, this closes the issue.
1. **Check for author quiz artifact** (informational, non-blocking): Scan `.claude/artifacts/reviews/` for a file matching `*-<id>-author-quiz.md`. Note presence/absence — used later for self-review detection. Do not prompt or block if missing.
2. **Update item file** with completion notes
   b. **Set `**Completed**: YYYY-MM-DD`** in item file metadata (today's date)
3. **Move item file** to `.claude/work/archive/`
4. **Acceptance quiz** — After completing the status transition, present the acceptance verification quiz:

   a. **Offer opt-out** via AskUserQuestion:
      ```javascript
      {
        question: "Take the acceptance quiz? (3-5 questions verifying outcome matches plan + scope drift check)",
        header: "Acceptance Quiz",
        options: [
          { label: "Yes", description: "Verify requirements alignment, detect scope drift, check related impact" },
          { label: "Skip", description: "Decline the quiz (recorded for audit trail)" }
        ],
        multiSelect: false
      }
      ```

   b. **If Yes** — Generate and present the acceptance quiz:
      1. **Read source material**: Item file (problem statement, acceptance criteria, implementation notes) + branch diff (`git diff main..HEAD` or equivalent) + implementation notes from item
      2. **Scan for related work items** to generate related-impact questions:
         - **Always**: Scan local items in `.claude/work/items/` — items sharing the same category or with potential dependency on the completed item
         - **If provider is not local**: Also query the external system (see provider file for `list`/query operation) for related items in the same area path, category, or tag group. Merge external results with local items, deduplicating by External ID. This ensures items created directly in ADO/GitHub (never imported locally) are still considered for related-impact questions.
         - **On external query failure**: Fall back to local-only scan silently — do not block the quiz flow for a failed external query
      3. **Generate Drift Report**: Compare each acceptance criterion against the actual implementation. For each criterion, classify as:
         - `Implemented ✓` — criterion met
         - `Not implemented ⚠️` — criterion in plan but missing from implementation
         - `Added ⚠️` — present in implementation but not in original criteria
      4. **Generate 3-5 multiple choice questions** across three axes:
         - **Requirement alignment** (1-2 questions): "Does the outcome match criterion X?"
         - **Scope drift** (1-2 questions): "Which of these was NOT in the original plan?"
         - **Related impact** (1 question): "How does this change affect [adjacent feature/item]?"
      5. **Present each question** via sequential `AskUserQuestion` calls:
         ```javascript
         {
           question: "Q1: {question text}",
           header: "Quiz Q1",
           options: [
             { label: "A", description: "{option A text}" },
             { label: "B", description: "{option B text}" },
             { label: "C", description: "{option C text}" }
           ],
           multiSelect: false
         }
         ```
      6. **Score the quiz** — count correct answers
      7. **Prompt for reviewer identity** — same approach as author quiz (Team Members AskUserQuestion or conversational)
      8. **Detect self-review**: Check if an author quiz artifact exists for this item (from step 1). If so, read the `**Reviewed By**:` field from that artifact. Compare with the acceptance quiz reviewer:
         - Same person → `reviewType: "self-review"`
         - Different person → `reviewType: "peer-review"`
         - No author quiz exists → `reviewType: "unknown"`
      9. **Store acceptance quiz artifact** at `.claude/artifacts/reviews/YYYY-MM-DD-W-NNN-acceptance-quiz.md`:
         ```markdown
         # Acceptance Quiz: W-NNN — {title}

         **Date**: YYYY-MM-DD
         **Status**: completed
         **Score**: X/Y
         **Reviewed By**: {initials or "anonymous"}
         **Review Type**: self-review | peer-review | unknown
         **Author Quiz By**: {initials from author quiz, or "none"}

         ## Drift Report

         | Criterion | Status |
         |-----------|--------|
         | Users can register with email/password | Implemented ✓ |
         | Users can log in and receive JWT | Implemented ✓ |
         | Admin dashboard added | Added ⚠️ |

         **Assessment**: {1-2 sentence drift assessment}

         ## Questions

         ### Q1: {question text}
         - A) {option} ← selected
         - B) {option}
         - C) {option} ✓ (correct)

         ### Q2: ...

         ## Summary

         {Brief assessment of understanding + drift findings}
         ```
      10. **Store `.meta.json` sidecar** alongside the quiz artifact:
          ```json
          {
            "type": "acceptance-quiz",
            "workItem": "W-NNN",
            "project": "ProjectName",
            "created": "YYYY-MM-DD",
            "source": "/work done",
            "status": "completed",
            "tags": ["review", "quiz", "acceptance"],
            "summary": "Acceptance quiz — X/Y",
            "extra": { "score": "X/Y", "questions": Y, "reviewType": "peer-review", "scopeDriftDetected": true }
          }
          ```
      11. **Report**: score + drift summary (e.g., "Acceptance quiz completed: 4/5. Drift detected: 1 criterion not implemented, 1 added outside plan.")

   c. **If Skip** — Store declination artifact:
      1. **Store declination artifact** in `.claude/artifacts/reviews/YYYY-MM-DD-W-NNN-acceptance-quiz.md`:
         ```markdown
         # Acceptance Quiz: W-NNN — {title}

         **Date**: YYYY-MM-DD
         **Status**: declined

         The user chose to skip the acceptance quiz for this item.
         ```
      2. **Store `.meta.json` sidecar**:
         ```json
         {
           "type": "acceptance-quiz",
           "workItem": "W-NNN",
           "project": "ProjectName",
           "created": "YYYY-MM-DD",
           "source": "/work done",
           "status": "declined",
           "tags": ["review", "quiz", "acceptance"],
           "summary": "Acceptance quiz — declined",
           "extra": {}
         }
         ```
      3. **Report**: "Acceptance quiz skipped — declination recorded."

5. **Check for unblocked items**: Scan all active item files for `**Blocked By**:` fields that reference the completed item's ID. If found:
   a. Remove the completed item from their `**Blocked By**:` lists
   b. If provider is not local, also remove external dependency links (see provider file)
   c. Report: "Completing W-{id} unblocks: W-003, W-010"
6. **Emit telemetry event** (fire-and-forget) — Append one JSON line to the current session file in `.claude/patterns/sessions/`:
   ```json
   { "ts": "<ISO 8601>", "type": "command", "command": "/work done", "item": "<id>", "project": "<project>", "outcome": "completed", "context": { "itemsUnblocked": <count>, "lifecycleDays": <days> } }
   ```
   `itemsUnblocked` is the number of items unblocked by this completion (0 if none). `lifecycleDays` is the number of days from the item's `**Added**:` date to today. If the write fails, silently skip.

### `/work acceptance-quiz <id>`

Generate and present the acceptance quiz as a standalone subcommand. Useful for retakes or if the user skipped during `/work done`.

1. **Read item file** from `.claude/work/items/<id>.md` or `.claude/work/archive/<id>.md`
2. **Verify item is in-review or done** — quiz is only meaningful for items that have reached review stage
3. **Generate and present quiz** — same steps as `/work done` step 4b (read source material, scan active items, generate drift report, generate questions, present via AskUserQuestion, score, detect self-review, store artifact)
4. **Store quiz artifact** — overwrites any existing acceptance quiz artifact (including declinations) for this work item
5. **Store `.meta.json` sidecar** — same schema as `/work done` acceptance quiz
6. **Report**: score + drift summary

### `/work move <id> <stage>`

0. **Resolve provider** — Follow Provider Resolution steps. If provider is not local, the external state transition is executed in step 4 below.
1. **Validate stage** is one of: captured, shaping, ready, in-progress, in-review, done, skipped
2. **Detect direction**: Compare current stage to target stage using lifecycle order (captured=0, shaping=1, ready=2, in-progress=3, in-review=4, done=5). If target < current, it's a backward move.
3. **If backward move**:
   a. Ask for a reason conversationally (reasons are open-ended, not menu options): "What's the reason for moving this backward?"
   b. Record the backward move in the item's `## Stage History` section (create section if it doesn't exist)
   c. Apply semantics from the backward transition table in `work-system.md`:
      - In Review → In Progress: Keep branch, keep review request open (mark draft if supported), record review feedback
      - In Review → Shaping: Close review request, keep branch for reference
      - In Progress → Ready: Keep branch, update acceptance criteria
      - In Progress → Shaping: Keep branch (if useful), add open questions
      - Ready → Shaping: Update item with new questions
   d. Count backward moves in Stage History. If 2+, show nudge: "This item has moved backward N times — consider splitting it."
4. **If provider is not local** — Execute external state transition (see provider file for `move` operation). If the provider rejects the transition (e.g., ADO invalid state for that type), report as blocking error with valid transitions.
5. **Update item file** status
6. **If moving to done**, also archive the file

### `/work block <id> --on <blocker>`

0. **Resolve provider** — Follow Provider Resolution steps
1. **Read item file** from `.claude/work/items/<id>.md`
2. **Validate blocker**: If it looks like `W-NNN`, verify that item exists in `.claude/work/items/`
   b. **If provider is not local** — Create external dependency link (see provider file for `block` operation). ADO uses `System.LinkTypes.Dependency-Reverse`. GitHub uses labels + comments.
3. **Add/append to `**Blocked By**:`** field in item file. If the field is empty, set it. If it already has values, append with comma separation.
4. **Confirm**: "W-{id} blocked by {blocker}"

### `/work unblock <id> [blocker]`

0. **Resolve provider** — Follow Provider Resolution steps
1. **Read item file** from `.claude/work/items/<id>.md`
2. **If blocker specified**: Remove that specific blocker from `**Blocked By**:` field
   b. **If provider is not local** — Remove external dependency link (see provider file for `unblock` operation)
3. **If no blocker specified**: Clear all blockers (set `**Blocked By**:` to empty)
   b. **If provider is not local** — Remove all external dependency links
4. **Confirm**: "W-{id} unblocked" (or "Removed blocker {blocker} from W-{id}" if specific)

### `/work skip <id> [reason]`

1. **Read item file** and current status
2. **If already skipped**: "W-{id} is already skipped."
3. **Ask for resolution category** if not obvious from reason:
   ```javascript
   {
     question: "What's the resolution for this item?",
     header: "Resolution",
     options: [
       { label: "Won't fix", description: "Decided not to do this" },
       { label: "Superseded", description: "Another item replaces this" },
       { label: "Duplicate", description: "Same as another item" },
       { label: "Obsolete", description: "No longer relevant" },
       { label: "Deferred", description: "Will reconsider later" }
     ],
     multiSelect: false
   }
   ```
4. **Update item file**: Set status to `skipped`, add Resolution, Resolution Note, and Skipped date
5. **Confirm**: "Skipped W-{id}: '{title}' ({resolution})"

### `/work revive <id>`

1. **Read item file** and verify status is `skipped`
2. **If not skipped**: "W-{id} is not skipped — current status is {status}."
3. **Update item file**: Set status to `captured`, remove Resolution fields
4. **Confirm**: "Revived W-{id}: '{title}' — moved back to Captured for reconsideration"

### `/work sync`

0. **Resolve provider** — Follow Provider Resolution steps. If local provider, display: "Local provider — nothing to sync."
1. **Scan item files** for Provider Integration sections with `**Sync**: pending`
2. **For each pending item** — Attempt to create/update in external system (see provider file for `sync` operation)
3. **On success** — Set `**Sync**: current`, update `**Last Synced**:`
4. **On failure** — Keep as pending, report the error
5. **Report sync summary**: "Synced N items. M still pending. K failed."

### `/work import <ref>`

0. **Resolve provider** — Follow Provider Resolution steps. If local provider, display: "Import requires an external provider."
1. **Fetch from external system** — Use provider-specific fetch command (see provider file for `import` operation). `<ref>` is an ADO work item ID or GitHub issue number.
2. **Check if already imported** (scan item files for matching External ID in Provider Integration section)
3. **Map external state to our stage** — Use provider-specific state mapping
4. **Detect category** from external fields, labels, or keywords
5. **Confirm category** with AskUserQuestion
6. **Create item file** with Provider Integration section
7. **Confirm**: "Imported {provider} #{ref} as W-NNN: '{title}'"

### `/work export <id>`

0. **Resolve provider** — Follow Provider Resolution steps. If local provider, display: "Export requires an external provider."
1. **Read item file** — Verify no Provider Integration section exists
2. **Create in external system** — Use provider-specific create command (see provider file for `export` operation)
3. **Update item file** — Add Provider Integration section with external ID, URL, type
4. **Confirm**: "Exported W-NNN as {provider} #{external_id}: {url}"

## User Interaction Pattern

- **AskUserQuestion** for: Category confirmation (binary), type selection (if needed)
- **Conversational** for: Refinement discussions (delegate to ideate skill), backward move reasons
- **Procedural** for: list, view, block, unblock, sync, done (no questions needed)

## Auto-Categorization

When adding items, the system:
1. Converts description to lowercase
2. Matches against category keywords
3. Ranks by match count
4. Suggests top match (or asks if no matches)

## File Locations

```
.claude/work/
├── BOARD.md                    # Generated kanban board (gitignored — regenerated from item files)
├── items/W-001.md              # Active item files
├── items/W-002.md
└── archive/W-000.md            # Completed items
```
