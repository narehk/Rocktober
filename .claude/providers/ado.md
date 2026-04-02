# ADO Provider

Routes `/work` commands to Azure DevOps Boards via the `az boards` CLI. Every external write also creates or updates a local mirror (dual-write pattern per `provider.md`).

## Script Reference

Reusable scripts in `.claude/scripts/ado/` encapsulate all CLI operations. **Use these scripts instead of deriving `az boards` commands inline.** Each script sources `lib/common.sh`, handles auth checks, and outputs JSON to stdout with human messages to stderr.

| Operation | Script | Usage |
|-----------|--------|-------|
| Get work item | `ado/ado-get-item.sh` | `bash .claude/scripts/ado/ado-get-item.sh <id> [--expand relations]` |
| Update state | `ado/ado-update-state.sh` | `bash .claude/scripts/ado/ado-update-state.sh <id> <state>` |
| Post comment | `ado/ado-post-comment.sh` | `bash .claude/scripts/ado/ado-post-comment.sh <id> "<html>"` |
| Create item | `ado/ado-create-item.sh` | `bash .claude/scripts/ado/ado-create-item.sh <type> <title> [--parent <id>] [--field k=v ...]` |
| Add relation | `ado/ado-add-relation.sh` | `bash .claude/scripts/ado/ado-add-relation.sh <src_id> <relation_type> <target>` |
| Update fields | `ado/ado-update-fields.sh` | `bash .claude/scripts/ado/ado-update-fields.sh <id> <field=val ...>` |
| WIQL query | `ado/ado-query.sh` | `bash .claude/scripts/ado/ado-query.sh "<where_clause>"` |

**Conventions**: Exit 0=success, 1=blocking error, 2=transient. `ado-post-comment.sh` exits 0 even on failure (non-blocking per Comment Protocol). All scripts read org/project from CONTEXT.md automatically.

## Prerequisites

Required tools and authentication:

| Requirement | Check Command | Install |
|-------------|--------------|---------|
| Azure CLI | `az --version` | [Install Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) |
| DevOps extension | `az extension show --name azure-devops` | `az extension add --name azure-devops` |
| Authentication | `az account show` | `az login` (interactive browser auth) |
| Defaults configured | `az devops configure --list` | `az devops configure --defaults organization=<org> project=<project>` |

### Prerequisite Check

Run this sequence to verify readiness:

```bash
az --version 2>/dev/null && echo "az CLI: OK" || echo "az CLI: MISSING"
az extension show --name azure-devops --query name -o tsv 2>/dev/null && echo "DevOps ext: OK" || echo "DevOps ext: MISSING"
az account show --query user.name -o tsv 2>/dev/null && echo "Auth: OK" || echo "Auth: EXPIRED"
```

If any check fails, report as a **blocking** error with install/fix instructions.

## Reading Configuration

Extract provider config from the `## Work Provider` section in CONTEXT.md:

| Field | Variable | Example |
|-------|----------|---------|
| `**Organization**:` | `ORG` | `https://dev.azure.com/southbendin` |
| `**Project**:` | `PROJECT` | `Digital - Product Portfolio` |
| `**Process Template**:` | `TEMPLATE` | `Digital Product Portfolio - Electric Boogaloo` |

### Type-State Mappings

Read the `### Type → State Mappings` subsection in CONTEXT.md. Each type has a mapping table:

```
| Our Stage | ADO State |
|-----------|-----------|
| Captured  | To Do     |
| ...       | ...       |
```

Parse these tables into a lookup: `(type, our_stage) → ado_state` and `(type, ado_state) → our_stage`.

If a type→state mapping is missing for a particular stage, the transition is **not valid** for that type. Report it as a blocking error with the valid transitions listed.

### Relation Type Reference

**Always use display names** when calling `az boards work-item relation add/remove`. The CLI rejects reference names.

| Display Name | Reference Name (in JSON responses) | Use For |
|-------------|-----------------------------------|---------|
| `"Parent"` | `System.LinkTypes.Hierarchy-Reverse` | Set parent (child → parent) |
| `"Child"` | `System.LinkTypes.Hierarchy-Forward` | Set child (parent → child) |
| `"Predecessor"` | `System.LinkTypes.Dependency-Reverse` | Blocked-by link |
| `"Successor"` | `System.LinkTypes.Dependency-Forward` | Blocks link |
| `"Related"` | `System.LinkTypes.Related` | General association |
| `"Duplicate Of"` | `System.LinkTypes.Duplicate-Reverse` | Execution copy → frozen source (PW → Req, UW → CO) |
| `"Duplicate"` | `System.LinkTypes.Duplicate-Forward` | Frozen source → execution copy (Req → PW, CO → UW) |

## ADO Comment Protocol

Post a structured comment to an ADO work item's discussion thread on every state transition that routes to the provider. Comments create an audit trail visible to anyone viewing the work item in ADO.

### Command Pattern

```bash
bash .claude/scripts/ado/ado-post-comment.sh {ado_id} "{comment_html}"
```

**Note**: The `--discussion` flag accepts HTML. ADO renders it in the Discussion tab. The script exits 0 even on failure (non-blocking).

### Standard Comment Format

```html
<div>
  <b>State Transition</b><br/>
  <b>From</b>: {old_state} &rarr; <b>To</b>: {new_state}<br/>
  <b>Triggered by</b>: /work {command}<br/>
  <b>Date</b>: {YYYY-MM-DD}<br/>
  {optional context lines — see table below}
</div>
```

### Context Lines by Command

| Command | Additional Context |
|---------|-------------------|
| `/work start` | Branch name, assignee, decomposition status (N Details / M Tasks, or "skipped") |
| `/work review` | PR link (if available), author quiz result (score X/Y, or "declined"), wiki page link |
| `/work done` | Acceptance quiz score, drift summary (N implemented, N drifted), items unblocked, wiki page link |
| `/work move` | Direction (forward/backward), reason (if backward or forced) |
| `/work skip` | Resolution category, resolution note |
| `/work decompose` | Number of Details and Tasks created, list of Detail titles |
| `--force` override | `<b>⚠️ FORCE OVERRIDE</b>: {reason}` — always bold, always included when --force was used |

### Failure Handling

If the comment post fails (network error, permissions), log the failure locally but **do not block** the state transition. The state transition is the primary action; the comment is secondary. Report: "State transition succeeded but ADO comment failed — will retry on next sync."

## Quiz Sync to ADO

After any quiz (author or acceptance) completes or is declined, perform three actions:

### 1. Publish to Product Wiki

Create/update a wiki page for the quiz artifact:

```bash
bash .claude/scripts/ado/ado-wiki-publish.sh "{product-wiki}" \
  "/{Project}/Reviews/W-NNN-{quiz-type}" \
  "{local_artifact_path}"
```

The script handles create-or-update automatically (checks if page exists, extracts eTag from response headers, uses REST API). It works for both code wikis and project wikis.

> **Note**: The `az devops wiki page update` CLI has a bug on code wikis — it fails with "versionType should be 'branch'" regardless of the `--version` value. The `ado-wiki-publish.sh` script works around this by using the ADO REST API directly. See [AAR #13](https://github.com/southbendin/WorkSpaceFramework/issues/13).

The Product wiki name and Project name are read from CONTEXT.md Doc Provider section.

### 2. Add Hyperlink to ADO Work Item

Link the wiki page URL to the work item so it's discoverable from the "Links" tab:

```bash
bash .claude/scripts/ado/ado-add-relation.sh {ado_id} "Hyperlink" "{wiki_page_url}"
```

**Note**: Check for existing hyperlinks to the same path before adding to avoid duplicates (relevant for retakes).

### 3. Post Summary Comment (MANDATORY — AAR #21)

Post a companion comment to the ADO discussion thread with a brief summary and link. **This step is mandatory, not optional.** Hyperlinks added in step 2 appear only in the Links tab, which is not easily discoverable. The companion comment in the Discussion tab ensures the link is visible to anyone reviewing the work item's activity feed. See "Hyperlink Companion Pattern" below for the rationale.

Summary comment templates:

**Author Quiz**:
```html
<div>
  <b>Author Quiz</b><br/>
  <b>Score</b>: {X}/{Y}<br/>
  <b>Reviewed By</b>: {initials}<br/>
  <b>Assessment</b>: {1-2 sentence summary}<br/>
  <a href="{wiki_page_url}">Full quiz artifact</a>
</div>
```

**Acceptance Quiz** (includes drift report):
```html
<div>
  <b>Acceptance Quiz</b><br/>
  <b>Score</b>: {X}/{Y} | <b>Review Type</b>: {self-review|peer-review}<br/>
  <b>Drift</b>: {N} implemented, {N} not implemented, {N} added outside plan<br/>
  <b>Assessment</b>: {drift assessment}<br/>
  <a href="{wiki_page_url}">Full quiz and drift report</a>
</div>
```

**Declined Quiz**:
```html
<div>
  <b>{Author|Acceptance} Quiz — Declined</b><br/>
  <b>Date</b>: {YYYY-MM-DD}<br/>
  Quiz was skipped. <a href="{wiki_page_url}">Declination record</a>
</div>
```

### Failure Handling

If wiki publish or hyperlink fails, fall back gracefully:
- Wiki fails → post full quiz summary in ADO comment instead of just the link
- Hyperlink fails → include URL in the comment text as plain text
- Comment fails → log locally, do not block

## Decompose Operation

Creation of Detail and Task items under a Planned Work or Unplanned Work item. Two modes: **Serial** (interactive, one-at-a-time) and **Batch** (template-based, MCP batch APIs).

### Serial Mode (Interactive)

Used by `/work decompose <id>` (without `--file`). Creates items one-at-a-time via shell scripts.

1. **Create each Detail**:
   ```bash
   bash .claude/scripts/ado/ado-create-item.sh "Detail" "{scenario_name}" --parent {pw_ado_id}
   ```
   The script handles creation + parent linking in one call. Parse stdout JSON for the new ID.

2. **Create Tasks under each Detail** (one per Then/And clause):
   ```bash
   bash .claude/scripts/ado/ado-create-item.sh "Task" "{assertion_text}" --parent {detail_id}
   ```

3. **Post summary comment** on parent PW/UW item (per Comment Protocol)

### Batch Mode (Template)

Used by `/work decompose <id> --file` (ingest phase). Uses MCP batch tools for significantly faster creation.

**Prerequisite**: Template has been parsed and validated by `ado-parse-decompose-template.sh`, producing structured JSON with `parentAdoId`, `details[]` (each with `title`, `description`, `tasks[]`).

1. **Batch create all Details** — Single MCP call:
   ```
   wit_add_child_work_items(
     parentId: {pw_ado_id},
     project: "{project}",
     workItemType: "Detail",
     items: [
       { title: "{detail_1_title}", description: "{detail_1_desc}" },
       { title: "{detail_2_title}", description: "{detail_2_desc}" },
       ...
     ]
   )
   ```
   Parse the response to extract created Detail ADO IDs. Map them by array position to the Detail index from the template.

2. **Batch create Tasks per Detail** — One MCP call per Detail:
   ```
   wit_add_child_work_items(
     parentId: {detail_N_ado_id},
     project: "{project}",
     workItemType: "Task",
     items: [
       { title: "{task_title}", description: "{task_desc}" },
       ...
     ]
   )
   ```
   This is N calls total (one per Detail), not one per Task.

3. **Post summary comment** on parent PW/UW item (per Comment Protocol)

**Performance comparison** (5 Details, 15 Tasks):

| Mode | API Calls | Mechanism |
|------|-----------|-----------|
| Serial | ~20 shell scripts (40+ `az` CLI calls) | `ado-create-item.sh` per item |
| Batch | ~6 MCP calls | 1 for Details + 1 per Detail for Tasks |

### Partial Failure Handling (both modes)

If creation fails mid-batch:
- Report what was created and what failed
- Created items remain (don't roll back)
- Offer retry for failed items only
- In template mode: keep the template file with a `# PARTIAL: N of M created` comment so the user can retry

---

## Operations

### add

Create a work item in ADO and a local mirror.

1. **Parse description** and detect category (same as current `work.md` step 1-4)
2. **Detect ADO type** using keyword matching:

   | Keywords | ADO Type | Hierarchy Level |
   |----------|----------|-----------------|
   | Default (no match) | Task | Leaf |
   | "requirement", "spec", "acceptance", "gherkin" | Requirement | Project child |
   | "detail", "work breakdown", "feature" | Detail | PW/UW child |
   | "project", "initiative", "epic" | Project | Product child |
   | "discovery", "research", "investigate", "explore", "feasibility" | Discovery | Product child |
   | "scope change", "change order", "added scope" | Change Order | Project child |
   | "constraint", "blocker", "blocked" | Constraint | Detail child |
   | "bug", "defect", "broken" | Bug | Issue child |
   | "issue", "problem", "outage" | Issue | Product child |
   | "request", "intake", "department" | Request | Product child |
   | "maintenance", "recurring", "operational" | Maintenance | Product child |

   > **Type name precision (AAR #20)**: ADO type names must match exactly. The root type is **"Products"** (plural, not "Product"). The execution-level type is **"Detail"** (singular, not "Details"). "Planned Work" is a **Project child** (sibling of Requirement), not a Requirement child. Always verify type names against the Parent-Child Type Validation table in CONTEXT.md.

   **Auto-created types** — Do NOT create directly:
   | Type | Created By | Trigger |
   |------|-----------|---------|
   | Planned Work | System | Requirement reaches Approved state |
   | Unplanned Work | System | Change Order reaches Approved state |

   If a user attempts to create a Planned Work or Unplanned Work item directly, explain:
   "Planned Work is auto-created when a Requirement is approved. Use `/work ready` on the Requirement instead."

3. **Confirm type** via AskUserQuestion:

   ```javascript
   {
     question: "Create this as a '{detected_type}' in ADO?",
     header: "ADO Type",
     options: [
       { label: "Yes — {detected_type}", description: "Create as {detected_type} in ADO" },
       { label: "Change type", description: "Pick a different work item type" }
     ],
     multiSelect: false
   }
   ```

   If "Change type", ask conversationally (too many ADO types for a menu).

4. **Look up initial state** — Read the type→state mapping from CONTEXT.md. Use the ADO state mapped to `Captured` as the initial state.

5. **Resolve parent** — Read the Parent-Child Type Validation table from CONTEXT.md:
   - Look up the detected type's valid parent types
   - If the type has valid parent types listed (not `(root)` or `(standalone)`), ask conversationally:
     "This {type} needs a parent {valid_parent_types}. What's the ADO ID of the parent? (or 'skip' to create unlinked)"
   - Store the parent ADO ID for linking in step 7

6. **Create in ADO**:

   ```bash
   bash .claude/scripts/ado/ado-create-item.sh "{type}" "{title}" --parent {parent_ado_id}
   ```

   The script handles creation + parent linking in one call. Parse stdout JSON for `id` and `url`. Omit `--parent` if no parent ADO ID was provided in step 5.

   **Important**: The relation script uses display names (`"Parent"`, `"Child"`, `"Related"`, `"Duplicate"`, `"Duplicate Of"`), NOT reference names. This is handled automatically by the scripts.

8. **Create local mirror** — Standard item file in `.claude/work/items/W-NNN.md` with:
   - All standard fields (status: captured, category, project, etc.)
   - `**ADO Parent ID**: {parent_ado_id}` (if linked)
   - `**Frozen**: false`
   - `## Provider Integration` section with: Provider: ado, External ID: {ado_id}, URL: {ado_url}, Type: {type}, Sync: current, Last Synced: {now}

9. **Confirm**: "Added W-NNN: '{title}' to {category} (captured) — ADO {type} #{ado_id}" + " (child of #{parent_ado_id})" if linked

**On CLI failure**: Fall back to Offline Fallback Protocol — create local item with `**Sync**: pending`, warn user.

### Known MCP Behavior: System.Parent Does Not Create Links (AAR #38)

The ADO MCP tool `wit_create_work_item` accepts `System.Parent` in the `fields` array but **does NOT create the actual parent-child link**. The field is silently ignored.

**Workaround**: Always use a two-step process when creating child items via MCP:

1. **Create the item** via `wit_create_work_item` (without `System.Parent`)
2. **Link to parent** via `wit_work_items_link`:
   ```
   wit_work_items_link({
     project: "{project}",
     updates: [{ id: {child_id}, linkToId: {parent_id}, type: "parent" }]
   })
   ```

**Or use the shell script** which handles both in one call:
```bash
bash .claude/scripts/ado/ado-create-item.sh "{type}" "{title}" --parent {parent_id}
```

**When using MCP batch creation** (`wit_add_child_work_items`): This tool DOES handle parent linking correctly — the `parentId` parameter creates the link. The issue is only with `wit_create_work_item` + `System.Parent` field.

### list

Query ADO and merge with the local board.

1. **Build WIQL query**:

   ```bash
   bash .claude/scripts/ado/ado-query.sh "[System.State] <> 'Archived'"
   ```

   The script auto-generates SELECT/FROM/ORDER BY clauses and reads project/org from CONTEXT.md.

2. **Map ADO states to our stages** — For each result, look up `(type, ado_state) → our_stage` using the CONTEXT.md mappings. Items with unmapped states are shown with their raw ADO state.

3. **Merge with local item data** — Local items are authoritative for display. ADO results can surface items not yet tracked locally (created outside Claude) or update stale local states.

4. **Check for pending sync** — Scan item files for `**Sync**: pending`. If found, append reminder: "N items pending sync to ADO. Run `/work sync` to push."

5. **Display merged board**

### view

Show merged local + ADO details for an item.

1. **Read local item file** from `.claude/work/items/<id>.md`
2. **Extract ADO ID** from `## Provider Integration` section
3. **Fetch from ADO** (if Provider Integration section exists):

   ```bash
   bash .claude/scripts/ado/ado-get-item.sh {ado_id}
   ```

4. **Merge and display** — Show local content with ADO state, comments, and links overlaid

### move

Transition state in ADO and locally.

1. **Read item file** — Extract ADO ID and Type from Provider Integration section
2. **Look up target ADO state** — Use `(type, target_stage) → ado_state` from CONTEXT.md mappings
3. **Validate transition** — If no mapping exists for this type + target stage combination, report as blocking error:
   "Cannot move {type} to {target_stage}. Valid stages for {type}: {list of mapped stages}"
4. **Check freeze semantics** — If the type is Requirement or Change Order and the target ADO state is "Approved":
   a. This is a freeze transition — warn: "This will freeze {type} #{id}. Content becomes immutable."
   b. Validate Gherkin acceptance criteria format before proceeding (see Acceptance Criteria Format table in CONTEXT.md)
   c. If Gherkin validation fails, block: "Cannot approve — acceptance criteria must be in Gherkin format (Given/When/Then). Run `/work refine {id}` to restructure."
5. **Update in ADO**:

   ```bash
   bash .claude/scripts/ado/ado-update-state.sh {ado_id} "{ado_state}"
   ```

6. **Update locally** — Standard item file status update, then regenerate board
7. **Update sync metadata** — Set `**Sync**: current`, update `**Last Synced**:`
8. **If freeze transition** (step 4 triggered):
   a. Set `**Frozen**: true` and `**Frozen Date**: YYYY-MM-DD` in item file
   b. Trigger Planned Work / Unplanned Work creation (see below)

**On invalid ADO state transition**: ADO may reject transitions that skip intermediate states. If the API returns an error, report the error and show the valid transitions for the current state.

### Freeze Semantics

Requirements and Change Orders freeze when moved to ADO state "Approved". Once frozen:
- Content is immutable — preserves the original scope record
- Local item gets `**Frozen**: true` and `**Frozen Date**: YYYY-MM-DD`
- A mutable execution copy is created (see below)

If someone attempts to edit a frozen item locally, warn:
"This {type} is frozen (approved on {date}). Changes should be made to the corresponding {Planned Work / Unplanned Work} item instead."

### Planned Work / Unplanned Work Creation

Triggered after a Requirement or Change Order reaches "Approved" state, or when `/work ready` is called on an already-frozen Requirement/Change Order that has no execution copy yet.

| Frozen Type | Execution Copy Type |
|-------------|-------------------|
| Requirement | Planned Work |
| Change Order | Unplanned Work |

1. **Prompt**: "{Requirement/Change Order} #{id} is now approved and frozen. Create a {Planned Work/Unplanned Work} item as the execution copy?"
   For batch operations: show a summary table of all items needing execution copies, then a single Yes/No.

2. **If yes — Create in ADO**:

   ```bash
   bash .claude/scripts/ado/ado-create-item.sh "{Planned Work | Unplanned Work}" "{original_title}" \
     --parent {project_ado_id} --assigned-to "{assignee}"
   ```

   The script handles creation + parent linking. `--parent` links to the Project (NOT the Requirement/Change Order — the execution copy is a sibling under the same Project).

   The `{project_ado_id}` is the ADO ID of the Project that parents the frozen Requirement/Change Order (read from `**ADO Parent ID**` on the frozen item).

4. **Link back to frozen source** — Use `Duplicate Of` to trace the execution copy back to its origin:

   ```bash
   bash .claude/scripts/ado/ado-add-relation.sh {new_item_id} "Duplicate Of" {frozen_item_ado_id}
   ```

   This creates a bidirectional link: the execution copy shows "Duplicate Of → Requirement #{id}", and the frozen Requirement shows "Duplicate → Planned Work #{new_id}".

5. **Copy content from frozen source**:
   - **Description**: Copy `System.Description` from the frozen item
   - **Gherkin fields**: Copy `Custom.Scenario`, `Custom.Given`, `Custom.When`, `Custom.Then` from the frozen item (fetch fresh from ADO, not from cached data)
   - **Tags**: Copy `System.Tags` from the frozen item

   ```bash
   bash .claude/scripts/ado/ado-update-fields.sh {new_item_id} \
     "Custom.Scenario={scenario}" "Custom.Given={given}" \
     "Custom.When={when}" "Custom.Then={then}"
   ```

   The script handles `MSYS_NO_PATHCONV=1` automatically for Windows/Git Bash path safety.

6. **Create local mirror** in `.claude/work/items/W-{new_id}.md` with:
   - Status: `ready`
   - ADO Type: `Planned Work` or `Unplanned Work`
   - ADO Parent ID: `{project_ado_id}`
   - `**Execution Copy Of**: W-{frozen_id}`
   - Acceptance criteria reference: "Inherited from frozen {Requirement/Change Order} W-{frozen_id}"
   - Blocked By: carry over blocking dependencies from the frozen source (remapped to PW/UW IDs if those blockers also have execution copies)

7. **Record link on the frozen item**: Add `**Execution Copy**: W-{new_id} (ADO #{new_ado_id})` to the frozen item's local file

8. **Confirm**: "Created {Planned Work/Unplanned Work} #{new_ado_id} as execution copy of {Requirement/Change Order} #{frozen_id} (child of Project #{project_ado_id})"

### Constraint Escalation (AAR #22)

Constraints are development-found blockers that attach to Detail items. When a Constraint cannot be resolved at the Detail level, it escalates upward.

#### Constraint Creation Flow

When `/work add` detects a Constraint type (keywords: "constraint", "blocker", "blocked"):

1. **Prompt for parent Detail**: "Which Detail is this Constraint blocking? Provide the ADO ID."
2. **Prompt for severity** via AskUserQuestion:
   ```javascript
   {
     question: "What is the severity of this constraint?",
     header: "Severity",
     options: [
       { label: "Critical", description: "Blocks all progress on the parent Detail — may need escalation to PW/UW level" },
       { label: "High", description: "Blocks progress on key aspects — should be escalated for visibility" },
       { label: "Medium", description: "Workaround exists but adds risk or effort" },
       { label: "Low", description: "Minor inconvenience, can be resolved in normal course" }
     ],
     multiSelect: false
   }
   ```
3. **Prompt for impact description**: "Describe the impact on the parent work item."
4. **Create Constraint in ADO**: `ado-create-item.sh "Constraint" "{title}" --parent {detail_ado_id}`
5. **Set severity field** (if ADO has a severity field for Constraints): `ado-update-fields.sh {id} "Microsoft.VSTS.Common.Severity={severity}"`

#### Escalation Protocol

When a Constraint has severity **Critical** or **High**:

1. **Identify the escalation target** — Traverse upward: Constraint → parent Detail → parent Planned Work / Unplanned Work
2. **Post escalation comment** on the PW/UW item:
   ```html
   <div>
     <b>⚠️ Constraint Escalation</b><br/>
     <b>Constraint</b>: #{constraint_id} — {title}<br/>
     <b>Severity</b>: {severity}<br/>
     <b>Affected Detail</b>: #{detail_id} — {detail_title}<br/>
     <b>Impact</b>: {impact_description}<br/>
     <b>Status</b>: Investigating
   </div>
   ```
3. **Add Predecessor link** — Link the PW/UW item as blocked-by the Constraint:
   ```bash
   bash .claude/scripts/ado/ado-add-relation.sh {pw_ado_id} "Predecessor" {constraint_ado_id}
   ```
4. **Update local item** — Add `**Blocked By**: {constraint_work_item_id}` to the PW/UW local item file
5. **Report**: "Constraint #{id} escalated to {Planned Work/Unplanned Work} #{pw_id}"

#### Constraint Resolution

When a Constraint moves to terminal state (`Solution Found` or `Closed - Will Not Fix`):

1. **Remove Predecessor link** from parent PW/UW (if escalation created one)
2. **Post resolution comment** on the PW/UW item:
   ```html
   <div>
     <b>✓ Constraint Resolved</b><br/>
     <b>Constraint</b>: #{constraint_id} — {title}<br/>
     <b>Resolution</b>: {Solution Found | Closed - Will Not Fix}<br/>
     <b>Notes</b>: {resolution_notes}
   </div>
   ```
3. **Update local blocker** — Remove constraint from `**Blocked By**:` field on PW/UW item

#### Low/Medium Severity Constraints

For Low and Medium severity, do NOT escalate to the PW/UW level. The Constraint stays attached to its parent Detail and is resolved there. Only post a comment on the Detail item:
```html
<div>
  <b>Constraint Filed</b><br/>
  <b>Constraint</b>: #{constraint_id} — {title}<br/>
  <b>Severity</b>: {severity}<br/>
  Resolution tracked at Detail level.
</div>
```

### start

Delegate to **move** with target stage `in-progress`. Additionally:

1. Resolve provider and execute move to In Progress
2. Prompt for assignment (if Team Members configured)
3. Suggest branch name (same as current `work.md`)
4. Record branch in item file

### review

Delegate to **move** with target stage `in-review`. Additionally:

1. Resolve provider and execute move to In Review
2. Record PR link if provided

### done

Delegate to **move** with target stage `done`. Additionally:

1. Resolve provider and execute move to Done
2. **Resolve predecessor links** — Query ADO for items linked to this one:

   ```bash
   bash .claude/scripts/ado/ado-get-item.sh {ado_id} --expand relations
   ```

   Parse the `relations` array for Predecessor links (`System.LinkTypes.Dependency-Reverse` in the JSON response). For each linked item, check if the completion of this item unblocks it.

3. **Child Cascade (Batch Mode)** — If the parent item was decomposed (has `## Decomposition` section), cascade completion to all children using MCP batch tools:

   a. **Collect child IDs** — Read Detail ADO IDs from the Decomposition table. For each Detail, query its child Tasks via `wit_get_work_item` (expand=relations).
   b. **Batch transition** — Execute 4 `wit_update_work_items_batch` calls (see `work.md` Child Cascade steps for exact payloads):
      1. Tasks: To Do → Doing (+ set RemainingWork=0, DueDate=today)
      2. Tasks: Doing → Done
      3. Details: To do → Developing
      4. Details: Developing → Completed
   c. **Post summary comment** on parent: "Cascaded completion: N Details → Completed, M Tasks → Done"

   **Performance**: 4 batch MCP calls replaces ~33 serial `ado-update-state.sh` invocations.

   **Partial failure**: Report which items succeeded/failed. Do not roll back successes. Failed items stay in current state.

### Batch Response Handling (AAR #31)

`wit_update_work_items_batch` and similar MCP batch tools return the **full work item JSON** for every item in the response. A batch of 10-25 items can produce 50-160KB of response data, which risks exceeding context limits and triggers file-based output.

**Response processing protocol**:

1. **Extract only status** — For each item in the response, extract only: `id`, whether it succeeded or failed, and the error `message` (if failed)
2. **Discard full payloads immediately** — Do NOT retain the full work item JSON from batch responses in context. The full payloads contain all fields, relations, HTML descriptions, and Gherkin content that are irrelevant to the operation's outcome
3. **Report summary only** — Output: "Batch update: N succeeded, M failed" with failed item IDs and error messages listed
4. **On file-based output** — If the MCP response exceeds context limits and is saved to a temp file, parse the file with a minimal extraction (e.g., `node -e` or `jq`) to extract just success/failure counts, then discard the file reference
5. **Never log full batch response** to conversation context — summarize immediately upon receipt

**Example summary output**:
```
Batch update (Tasks → Done): 15 succeeded, 0 failed
Batch update (Details → Completed): 10 succeeded, 1 failed
  Failed: #12045 — "Field 'DueDate' is required for state 'Done'"
```

4. **Archive locally** — Move item file to `.claude/work/archive/`
5. **Check for locally unblocked items** — Same as current `work.md` step 5

### block

Create a dependency link in ADO and update locally.

1. **Read item file** — Get ADO ID for the item being blocked
2. **Resolve blocker** — If blocker is a `W-NNN` ID, read its item file to get the ADO ID. If blocker is free text, skip ADO link creation (local-only block).
3. **Create ADO link** (if both items have ADO IDs):

   ```bash
   az boards work-item relation add \
     --id {blocked_ado_id} \
     --relation-type "Predecessor" \
     --target-id {blocker_ado_id} \
     --org "{ORG}" \
     --output json
   ```

   `"Predecessor"` means "this item is blocked by the target". Note: in the JSON response from `--expand relations`, the `rel` field shows the reference name (`System.LinkTypes.Dependency-Reverse`), but when creating/removing links via CLI, use the display name (`"Predecessor"`).

4. **Update locally** — Standard `**Blocked By**:` field update, then regenerate board

### unblock

Remove a dependency link in ADO and update locally.

1. **Read item file** — Get ADO ID for the blocked item
2. **Resolve blocker** — Get the blocker's ADO ID (if it's a `W-NNN` with Provider Integration)
3. **Remove ADO link** (if both items have ADO IDs):

   ```bash
   az boards work-item relation remove \
     --id {blocked_ado_id} \
     --relation-type "Predecessor" \
     --target-id {blocker_ado_id} \
     --org "{ORG}" \
     --yes \
     --output json
   ```

4. **Update locally** — Remove blocker from `**Blocked By**:` field, then regenerate board

### sync

Push pending local items and pull external changes.

1. **Scan for pending items** — Read all item files in `.claude/work/items/`, find those with `**Sync**: pending`
2. **For each pending item**:
   - If no External ID: Create in ADO (same as `add` step 5), update Provider Integration with new ID
   - If has External ID: Update in ADO with current local state
   - On success: Set `**Sync**: current`, update `**Last Synced**:`
   - On failure: Keep as pending, report the error
3. **Report summary**: "Synced N items. M still pending. K failed."

### import

Import an ADO work item as a local item.

1. **Fetch from ADO**:

   ```bash
   az boards work-item show --id {ado_id} --org "{ORG}" --output json
   ```

2. **Check if already imported** — Scan item files for matching External ID in Provider Integration section
3. **Map ADO state to our stage** — Use `(type, ado_state) → our_stage`
4. **Detect category** from ADO fields or keywords
5. **Confirm category** with AskUserQuestion
6. **Create local item file** with Provider Integration section
7. **Regenerate board** (see Board Generation in `work.md`)
8. **Confirm**: "Imported ADO #{ado_id} as W-NNN: '{title}'"

### export

Push a local-only item to ADO.

1. **Read item file** — Verify no Provider Integration section exists (not already linked)
2. **Detect ADO type** — Use keyword matching (same as `add` step 2)
3. **Confirm type** with AskUserQuestion
4. **Create in ADO** — Same as `add` step 5
5. **Update item file** — Add Provider Integration section with new ADO ID
6. **Update sync metadata** — `**Sync**: current`
7. **Confirm**: "Exported W-NNN as ADO {type} #{ado_id}: {url}"

### Gherkin Field Sync

When a Requirement or Change Order has Gherkin acceptance criteria in the local item file, the four ADO Gherkin fields must be populated. Read the field reference names from CONTEXT.md `#### ADO Gherkin Field References`.

**When to sync**: After `/work refine` writes Gherkin acceptance criteria, and before `/work ready` advances beyond Scoping.

**How to sync**:

1. Parse the local item's `## Acceptance Criteria` section into individual scenarios
2. For each scenario, extract the Scenario name, Given, When, Then (including And clauses)
3. Build numbered entries for each field:
   - `Custom.Scenario`: `1. {name}\n2. {name}\n...`
   - `Custom.Given`: `1. {given text}\n2. {given text}\n...`
   - `Custom.When`: `1. {when text}\n2. {when text}\n...`
   - `Custom.Then`: `1. {then text}; {and clause}; {and clause}\n2. ...`
4. Update ADO:

   ```bash
   MSYS_NO_PATHCONV=1 az boards work-item update \
     --id {ado_id} \
     --org "{ORG}" \
     -f "Custom.Scenario={scenarios}" \
        "Custom.Given={givens}" \
        "Custom.When={whens}" \
        "Custom.Then={thens}" \
     -o json
   ```

5. Report: "Synced Gherkin acceptance criteria to ADO #{ado_id}"

### Local-Only Operations

The following operations do not route to ADO. They execute locally using the same behavior as the local provider (see `local.md`):

- **skip** — Local-only terminal state management
- **revive** — Local-only reactivation from Skipped

## Windows CLI Notes

The `az` CLI on Windows (especially under MSYS/Git Bash) has common gotchas:

| Issue | Workaround |
|-------|------------|
| `az` not found in PATH | Try full path: `"/c/Program Files/Microsoft SDKs/Azure/CLI2/wbin/az.cmd"` or ensure `az` is in PATH |
| Unicode output garbled | Set `PYTHONIOENCODING=utf-8` before az commands |
| Project names with spaces | URL-encode spaces in `--project` values: `"Digital%20-%20Product%20Portfolio"` or use `--detect true` if defaults are configured |
| JSON output required | Always use `--output json` for machine-parseable results |
| Long commands | Use `--detect true` to inherit defaults from `az devops configure` instead of passing `--org` and `--project` on every call |
| **MSYS path expansion** | Wiki paths starting with `/` get expanded to `C:/Program Files/Git/...` under Git Bash. **Always** prefix wiki commands with `MSYS_NO_PATHCONV=1` |
| **Task state → Done** | Tasks require **both** a non-empty `Description` **and** `Microsoft.VSTS.Scheduling.DueDate` to transition to Done. Include `--description` and `--fields "Microsoft.VSTS.Scheduling.DueDate=YYYY-MM-DD"` |
| **Relation type names** | `--relation-type` requires **display names** ("Parent", "Child", "Duplicate Of"), NOT reference names ("System.LinkTypes.Hierarchy-Reverse"). See Relation Type Reference table above |
| **Empty ADO repos** | New repos have no branch — can't be published as wikis. Use `az rest` to POST to `_apis/git/repositories/{repo}/pushes` to create an initial commit without git auth |
| **Wiki ancestor pages (AAR #18)** | Ancestor pages must exist before creating child pages. Create top-down: `/Project` → `/Project/Reviews` → `/Project/Reviews/W-NNN-quiz`. If a parent page is missing, the REST API returns a 404 |
| **Code wiki vs project wiki (AAR #18)** | Code wikis are backed by git repos and require REST API for updates (use `ado-wiki-publish.sh`). Project wikis use `az` CLI directly. The `az devops wiki page update` command **fails on code wikis** with "versionType should be 'branch'" — always route code wiki operations through `ado-wiki-publish.sh` |
| **Wiki type detection (AAR #18)** | Check wiki type before operations: `az devops wiki show --wiki "{name}" -o json` → look at `type` field (`"codeWiki"` vs `"projectWiki"`). Route accordingly: code wikis → REST API script, project wikis → `az` CLI |

### Recommended pattern

```bash
PYTHONIOENCODING=utf-8 az boards work-item create \
  --type "Task" \
  --title "My task" \
  --detect true \
  --output json
```

Using `--detect true` reads org and project from `az devops configure` defaults, avoiding repeated long arguments and space-encoding issues.

## Required Fields by Type and State Transition (AAR #28, #17)

Not all state transitions require only the `System.State` field. Some ADO types in the Digital Product Portfolio process template have mandatory field requirements that must be set **in the same update call** as the state change, or the transition will fail with a validation error.

### Task

| Transition | Required Fields | Notes |
|-----------|----------------|-------|
| Any → Doing | (none beyond State) | |
| Doing → Testing | (none beyond State) | |
| Testing → Done | `Microsoft.VSTS.Scheduling.DueDate` (valid date), `System.Description` (non-empty), `Microsoft.VSTS.Scheduling.RemainingWork` (set to 0) | All three must be non-null. If a Task was created without a Description, it must be set before completing. |
| Any → Done (skip) | Same as Testing → Done | Same requirements apply even when force-skipping intermediate states |

### Detail

| Transition | Required Fields | Notes |
|-----------|----------------|-------|
| Any → Developing | (none beyond State) | |
| Developing → Completed | (none beyond State) | |
| Any → Canceled | (none beyond State) | |

### Planned Work / Unplanned Work

| Transition | Required Fields | Notes |
|-----------|----------------|-------|
| To do → In Progress | (none beyond State) | |
| In Progress → Testing | (none beyond State) | |
| Testing → Completed | (none beyond State) | |

### Requirement

| Transition | Required Fields | Notes |
|-----------|----------------|-------|
| To Do → Scoping | (none beyond State) | |
| Scoping → Signing | Gherkin fields must be populated (Custom.Scenario, Custom.Given, Custom.When, Custom.Then) | Validate Gherkin format locally before transitioning |
| Signing → Approved | (none beyond State) | **Freeze point** — triggers PW/UW creation |

### Change Order

| Transition | Required Fields | Notes |
|-----------|----------------|-------|
| To do → Viable | (none beyond State) | |
| Viable → Approved | Gherkin fields must be populated | **Freeze point** — triggers PW/UW creation |

### Bug / Issue / Constraint / Discovery / Request / Maintenance

No additional required fields beyond `System.State` for any transition in these types. Refer to the Type → State Mappings in CONTEXT.md for valid transitions.

> **Pattern**: When `ado-update-state.sh` or `wit_update_work_items_batch` fails with a field validation error, check this table first. The error message typically includes the field name that's missing or invalid.

## Error Handling

| Error | Severity | Action |
|-------|----------|--------|
| `az` CLI not found | **Blocking** | Stop. Report install instructions. Cannot proceed without CLI. |
| `azure-devops` extension missing | **Blocking** | Stop. Report: `az extension add --name azure-devops` |
| Auth expired (`AADSTS` error) | **Blocking** | Stop. Report: "Azure auth expired. Run `az login` to re-authenticate." |
| Network timeout | **Transient** | Retry once. If still failing, fall back to Offline Fallback Protocol. |
| Rate limited (429) | **Transient** | Wait briefly, retry once. If still failing, fall back to Offline Fallback Protocol. |
| Invalid state transition | **Blocking** | Report the error with valid transitions for the current type and state. Ask user for direction. |
| Project not found | **Blocking** | Report: "ADO project '{PROJECT}' not found. Check the **Project** field in CONTEXT.md `## Work Provider`." |
| Work item not found | **Blocking** | Report: "ADO work item #{id} not found. It may have been deleted or moved." |
| Permission denied | **Blocking** | Report: "Insufficient permissions for this ADO operation. Check your access level in the ADO project." |

## Doc Operations

Routes `/doc` commands to ADO Wiki. Requires a `## Doc Provider` section in CONTEXT.md with `**Provider**: ado` and `**Target**: <wiki-name>`.

### Prerequisites

Same Azure CLI requirements as work operations. Additionally:

```bash
az devops wiki list --org "{ORG}" --project "{PROJECT}" --output json
```

If this fails, report: "Cannot access ADO Wiki. Verify wiki exists and you have permissions."

### Reading Doc Configuration

Extract doc config from the `## Doc Provider` section in CONTEXT.md:

| Field | Variable | Example |
|-------|----------|---------|
| `**Target**:` | `WIKI` | `MyProject.wiki` |
| `**Auto-route**:` | `AUTO_ROUTE` | `true` |

### Code Wiki Creation (Per-Product)

Each ADO Product gets its own **code wiki** — a separate entry in the wiki dropdown, backed by a git repo. This is distinct from the project wiki (auto-created, shared by all products).

1. **Create backing repo**:
   ```bash
   az repos create --name "{Product-Name}.wiki" --org "{ORG}" --project "{PROJECT}" -o json
   ```

2. **Initialize the repo** — Empty repos can't be published as wikis. Use REST API to push an initial commit:
   ```bash
   az rest --method post --resource "499b84ac-1321-427f-aa17-267ca6975798" \
     --uri "https://dev.azure.com/{org}/{project}/_apis/git/repositories/{repo}/pushes?api-version=7.0" \
     --body @init-body.json
   ```

3. **Create the code wiki**:
   ```bash
   MSYS_NO_PATHCONV=1 az devops wiki create \
     --name "{Product-Name}" \
     --type codewiki \
     --repository "{Product-Name}.wiki" \
     --mapped-path "/" \
     --version main \
     --org "{ORG}" --project "{PROJECT}" -o json
   ```

4. **Create ancestor pages** before publishing child content. Wiki pages require parent pages to exist first. Either:
   - Use the REST API push to create multiple pages in a single git commit
   - Or create pages top-down: `/Project` → `/Project/Reviews` → `/Project/Reviews/artifact`

### Wiki Cross-Linking Pattern

Bidirectional linking between wiki and ADO work items:
- **Wiki → ADO**: Include `**ADO Work Item**: [PW #NNN](work_item_url)` in wiki page metadata
- **ADO → Wiki**: Add hyperlink relation + companion discussion comment (see Hyperlink Companion Pattern below)

### Hyperlink Companion Pattern

ADO hyperlinks appear in the Links tab but are not easily discoverable. Always post a companion discussion comment when adding a hyperlink:

```html
<div><b>Wiki Link: {description}</b><br/>
View: <a href='{url}'>{display text}</a><br/>
{optional context: score, review type, etc.}</div>
```

### doc_publish

Push a local document to ADO Wiki.

1. **Read the local file** at `<path>`
2. **Determine wiki path** — Map local path to wiki page path:
   - `docs/api/endpoints.md` → `/api/endpoints`
   - `docs/guides/getting-started.md` → `/guides/getting-started`
3. **Check if page exists**:

   ```bash
   az devops wiki page show \
     --wiki "{WIKI}" \
     --path "{wiki_path}" \
     --org "{ORG}" \
     --project "{PROJECT}" \
     --output json 2>/dev/null
   ```

4. **Create or update** — Use the wiki publish script (handles code wiki REST API workaround):

   ```bash
   bash .claude/scripts/ado/ado-wiki-publish.sh "{WIKI}" "{wiki_path}" "{local_path}"
   ```

   > The `az devops wiki page create/update` CLI commands have bugs with code wikis. The publish script uses the REST API directly. See [AAR #13](https://github.com/southbendin/WorkSpaceFramework/issues/13).

5. **Report**: "Published `<path>` to ADO Wiki at `{wiki_path}`"

### doc_list

List wiki pages from ADO.

1. **Query wiki pages**:

   ```bash
   az devops wiki page show \
     --wiki "{WIKI}" \
     --path "/" \
     --include-content false \
     --recurse \
     --org "{ORG}" \
     --project "{PROJECT}" \
     --output json
   ```

2. **Parse response** — Extract page paths and metadata
3. **Display as table**:

   ```
   ADO Wiki: {WIKI}

   | Wiki Path | Last Modified |
   |-----------|--------------|
   | /api/endpoints | 2026-03-01 |
   | /guides/getting-started | 2026-02-15 |

   N pages found
   ```

### doc_sync

Bidirectional sync between local `docs/` and ADO Wiki.

1. **List local docs** — Scan `docs/` directory
2. **List wiki pages** — Execute `doc_list`
3. **Compare** — Map local paths to wiki paths, identify differences
4. **Present sync plan** to user (same pattern as `/doc sync` in `doc.md`)
5. **Execute** — Publish or import based on user choice

### doc_import

Pull a wiki page to local.

1. **Fetch page content**:

   ```bash
   az devops wiki page show \
     --wiki "{WIKI}" \
     --path "{wiki_path}" \
     --include-content true \
     --org "{ORG}" \
     --project "{PROJECT}" \
     --output json
   ```

2. **Parse content** from the JSON response
3. **Write locally** — Save to `docs/` with path matching the wiki structure
4. **Report**: "Imported `{wiki_path}` to `<local_path>`"

### doc_review

Check ADO Wiki pages for staleness compared to local docs.

1. **Fetch wiki page** for the target path
2. **Compare content** with local version (if exists)
3. **Flag differences** — content drift, missing pages, stale references
