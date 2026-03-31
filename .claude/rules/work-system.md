# Unified Work System

## Core Principle

**One system. One command. One place to look.**

All work — from fleeting ideas to active implementation — lives in a single unified system. No separate "idea" vs "work item" distinction. No graduation ceremony. Items grow richer as they progress through lifecycle stages.

## Lifecycle Stages

```
Captured → Shaping → Ready → In Progress → In Review → Done
                                                        ↓
Any stage ───────────────────────────────────────→ Skipped
```

| Stage | Description | What's in the item |
|-------|-------------|--------------------|
| **Captured** | Raw thought, voice memo, one-liner | Title + one-liner |
| **Shaping** | Being refined, discussed, designed | + problem statement, proposed solution, suggested experts, open questions |
| **Ready** | Fully shaped with acceptance criteria | + acceptance criteria, design artifacts, estimated effort |
| **In Progress** | Actively being built | + branch, PR link, implementation notes |
| **In Review** | PR open, testing, code review | + review feedback |
| **Done** | Shipped and archived | + completion notes, lessons learned |
| **Skipped** | Won't be completed | + resolution reason, resolution category |

## Backward Transitions

Items can move backward through the lifecycle when development reveals problems. Backward movement is a normal part of iterative development — not a failure.

| From → To | Trigger | What Happens |
|-----------|---------|--------------|
| In Review → In Progress | Review requests significant changes | Keep branch, keep review request open (mark draft if supported), record review feedback |
| In Review → Shaping | Fundamental approach rejected | Close review request, keep branch for reference, item needs redesign |
| In Progress → Ready | Scope needs adjustment | Keep branch, update acceptance criteria, re-approve before continuing |
| In Progress → Shaping | Discovery reveals design gaps | Keep branch (if useful), add open questions |
| Ready → Shaping | Acceptance criteria incomplete | Update item with new questions |

### Backward Move Warning

After 2+ backward moves on the same item, show a nudge: "This item has moved backward N times — consider splitting it." No hard limit — just a signal to reconsider scope.

### Stage History

When an item moves backward, a `## Stage History` section is added to the item file. Stage history is also recorded on any `--force` override of a lifecycle gate (see below). Normal forward transitions are NOT recorded, to keep items lean.

```markdown
## Stage History

| Date | From | To | Reason |
|------|------|----|--------|
| 2026-02-24 | in-review | in-progress | Code review: auth middleware needs refactoring |
| 2026-02-26 | in-progress | shaping | Discovery: need to rethink token storage approach |
| 2026-02-27 | in-progress | done | **FORCE**: combined with W-002 in same PR |
```

## Valid Transition Matrix

Each `/work` command that changes state has a required source status. Transitions that skip stages are **blocked** unless `--force` is used.

### Standard Mode (Discovery & Review Phases)

| Command | Required Source Status | Prerequisites | ADO Comment? |
|---------|----------------------|---------------|-------------|
| `/work start` | ready | Shaping gate + Decomposition gate (PW/UW types) | Yes |
| `/work review` | in-progress | — | Yes |
| `/work done` | in-review | Review gate (quiz artifact exists — planned work scope) | Yes |
| `/work move` | (any) | Target-specific gates apply | Yes |
| `/work skip` | (any except done) | — | Yes |

### Build Phase — Relaxed Gates

During the build phase (see `rapid-cycle.md`), Claude moves work items through the lifecycle **automatically**:

- **Status transitions are unrestricted** — Claude moves items forward as work completes
- **Shaping gate still applies** — requirements must be understood before build begins (enforced at phase transition, not per item)
- **Decomposition gate still applies** — work must be broken down before build begins
- **Review gate moves to end** — quiz happens after MVP delivery, scoped to planned work outcomes (not implementation details)
- **Auto-update**: Claude updates ADO work item status as each component is completed

### Blocked Transitions (require --force) — Standard Mode Only

These transitions skip one or more lifecycle stages. They are **blocked by default** and require `--force "reason"`:

- `captured` → `in-progress` (must pass through `shaping` and `ready`)
- `in-progress` → `done` (must pass through `in-review`)
- `ready` → `done` or `in-review` (must pass through `in-progress`)
- Any transition that skips a required gate

**Note**: During build phase, Claude is exempt from blocked transitions. Items move freely as implementation progresses.

## Lifecycle Gates

Gates are hard prerequisites checked by `/work` commands. They **block execution** unless the prerequisite is met or `--force` is used with a mandatory reason.

| Gate | Checked By | Prerequisite | Build Phase Behavior |
|------|-----------|-------------|---------------------|
| **Status Gate** | All transitions | Source status matches the command's required source | **Relaxed** — Claude moves items freely |
| **Shaping Gate** | Phase transition (discovery → build) | Requirements documented with problem statement and acceptance criteria | **Enforced** — must be met before build begins |
| **Decomposition Gate** | Phase transition (discovery → build) | If ADO type is Planned Work or Unplanned Work: child Detail items exist in ADO | **Enforced** — must be met before build begins |
| **Review Gate** | `/work done` | Quiz artifact exists in `.claude/artifacts/reviews/` — scoped to planned work outcomes (not implementation details) | **Moved to end** — quiz happens after MVP delivery and review feedback, required before `/work done` closes the item |

### --force Override Semantics

- **Syntax**: `/work <command> <id> --force "reason text"`
- **Reason is mandatory** — if `--force` is present but reason is empty or missing, reject: "The --force flag requires a reason."
- **Logged in three places**:
  1. Item file `## Stage History` section (with `**FORCE**:` prefix in reason column)
  2. ADO discussion comment (with bold **FORCE OVERRIDE** label)
  3. Telemetry event with `"forced": true, "forceReason": "..."` fields
- **Board indicator**: Items that have been force-overridden show `[F]` marker on the board

### Gate Philosophy

Gates exist to make skipping **explicit and auditable**, not to prevent it entirely. During the build phase, gates are relaxed because Claude has full autonomy — but the audit trail is maintained through work item updates and scope drift documentation.

## Constraint Tracking

When Claude encounters constraints during the build phase — technical limitations, dependency issues, design conflicts — they are captured as **ADO Constraint work items** (not comments).

Constraints attach to the relevant Detail item and can escalate to Planned/Unplanned Work if severe. See CONTEXT.md for Constraint state mappings.

## Blocked Items

Items can be blocked by other work items or external dependencies. Blocked is a **modifier on existing state**, not a separate stage — items stay in their current lifecycle stage.

### `Blocked By` Field

The `**Blocked By**:` field is added to item file metadata when an item is blocked (empty by default, only populated when blocked).

Blockers can be:
- **Work item IDs**: `W-001` — resolved automatically when that item completes
- **Free-text external blockers**: `"Waiting for API access"` — resolved manually via `/work unblock`

```markdown
**Blocked By**: W-001, "Waiting for API access"
```

### Board Display

The `Blocked` column appears on the **In Progress** and **In Review** board sections. Items in earlier stages (Captured, Shaping, Ready) aren't actively being worked, so blocking semantics don't apply there.

### Auto-Unblock on Completion

When `/work done <id>` completes an item, the system scans all active items for `**Blocked By**:` fields referencing the completed item's ID. If found:
- The completed item is removed from their blocker lists
- A report is shown: "Completing W-{id} unblocks: W-003, W-010"
- If removing the blocker leaves `**Blocked By**:` empty, the Blocked column is cleared on the board

## Board Structure

BOARD.md is a **generated file**. It is gitignored and regenerated lazily — only on `/work board` and `/work list`, not on every mutation. Board generation is performed by `.claude/scripts/generate-board.sh` for efficiency. Item files in `.claude/work/items/` and `.claude/work/archive/` are the sole source of truth.

All items live in `BOARD.md` — a single Kanban board with columns matching lifecycle stages.

**BOARD.md format:**

```markdown
# Work Board

## Captured
| ID | Title | Category | Project | Assigned | Added |
|----|-------|----------|---------|----------|-------|
| W-003 | Add dark mode toggle | ui | MyApp | | 2026-02-20 |

## Shaping
| ID | Title | Category | Project | Assigned | Added |
|----|-------|----------|---------|----------|-------|
| W-002 | Redesign settings page | ui | MyApp | NH | 2026-02-18 |

## Ready
| ID | Title | Category | Project | Assigned | Added |
|----|-------|----------|---------|----------|-------|

## In Progress
| ID | Title | Category | Project | Assigned | Added | Blocked |
|----|-------|----------|---------|----------|-------|---------|
| W-001 | User authentication | backend | MyApp | NH | 2026-02-15 | |
| W-003 | Work provider abstraction | infrastructure | MyApp | | 2026-02-23 | W-001 |

## In Review
| ID | Title | Category | Project | Assigned | Added | Blocked |
|----|-------|----------|---------|----------|-------|---------|

## Done (Recent)
| ID | Title | Category | Project | Assigned | Completed |
|----|-------|----------|---------|----------|-----------|

## Skipped
| ID | Title | Category | Project | Assigned | Resolution |
|----|-------|----------|---------|----------|------------|
```

## Item Files

Each item has a file in `.claude/work/items/` that grows richer over its lifecycle.

**Filename format:** `W-NNN.md` (e.g., `W-001.md`)

**Minimal item (Captured stage):**

```markdown
# W-001: User authentication

**Status**: captured
**Category**: backend
**Project**: MyApp
**Added**: 2026-02-15
**Type**: feature
**Assigned**:
**Blocked By**:

## One-Liner

Add JWT-based auth with login/register flows.
```

**Full item (Ready stage):**

```markdown
# W-001: User authentication

**Status**: ready
**Category**: backend
**Project**: MyApp
**Added**: 2026-02-15
**Type**: feature
**Assigned**: NH
**Blocked By**:

## One-Liner

Add JWT-based auth with login/register flows.

## Problem Statement

The app currently has no authentication. All endpoints are public and any user can access any data.

## Proposed Solution

JWT-based authentication with bcrypt password hashing, refresh token rotation, and role-based access control.

## Acceptance Criteria

- [ ] Users can register with email/password
- [ ] Users can log in and receive JWT
- [ ] Protected routes require valid token
- [ ] Refresh token rotation works
- [ ] Passwords are bcrypt-hashed

## Suggested Experts

- expert-security (auth patterns, JWT best practices)
- expert-backend (API route design)
- expert-testing (auth test strategies)

## Design Artifacts

- `.claude/artifacts/auth/2026-02-15-auth-flow.md`

## Open Questions

None — ready for implementation.
```

**In Progress item adds:**

```markdown
**Assigned**: NH

## Implementation

- **Branch**: `feat/user-auth`
- **PR**: #42
- **Notes**: Using bcrypt with 12 salt rounds, JWT expiry 24h
```

## Default Categories

- `ui` — User interface and visual design
- `backend` — Server-side logic and APIs
- `infrastructure` — Build, deploy, CI/CD, tooling
- `performance` — Speed, optimization, caching
- `security` — Auth, permissions, vulnerability fixes
- `docs` — Documentation and developer experience

Projects can customize categories during `/setup`.

## Global Board with Project Filtering

The board is **global** — all projects share one BOARD.md. Each item has a `Project` field for filtering:

- `/work list` — Show full board across all projects
- `/work list [project]` — Filter by project
- `/work list [stage]` — Filter by lifecycle stage

## GitHub Integration

Items can sync with GitHub Issues:

```markdown
## GitHub Integration

- **Issue**: #45
- **URL**: https://github.com/user/repo/issues/45
- **State**: open
- **Direction**: imported | exported | linked
- **Synced**: 2026-02-20T14:30:00Z
```

## Skipped Items

Items can move to Skipped from any stage. Skipped is a terminal state — the item won't be completed.

### Resolution Categories

| Category | Meaning | Example |
|----------|---------|---------|
| `wont-fix` | Decided not to do this | "Not worth the complexity" |
| `superseded` | Another item replaces this | "Replaced by W-003" |
| `duplicate` | Same as another item | "Duplicate of W-005" |
| `obsolete` | No longer relevant | "Feature removed from scope" |
| `deferred` | Will reconsider later | "Revisit after v2 launch" |

### Transitions

- **Any stage → Skipped**: Via `/work skip <id> [reason]`
- **Skipped → Captured**: Via `/work revive <id>` (for reconsideration)

### Item File Format (Skipped)

When an item is skipped, these fields are added:

```markdown
**Status**: skipped
**Resolution**: wont-fix | superseded | duplicate | obsolete | deferred
**Resolution Note**: Free-text explanation
**Skipped**: 2026-02-24
```

## Team Assignment (Optional)

The `Assigned` field is always present on items and board rows but can be left empty. Team assignment features activate only when CONTEXT.md includes a `## Team Members` section.

### Rules

- **Always present, opt-in behavior**: The `Assigned` column appears on the board and the `**Assigned**:` field appears in item files regardless of team configuration. When no Team Members section exists in CONTEXT.md, the field is simply left empty and no assignment prompts appear.
- **Initials format**: Use the team member's initials from the Team Members table (e.g., `NH`, `JD`). This keeps the board compact.
- **Validation**: When Team Members are configured, validate assignee values against the table. Reject unknown initials with a helpful message listing valid options.
- **Self-assignment**: When a developer runs `/work start` on an unassigned item and Team Members are configured, prompt for assignment.

### Filtering

- `/work list @name` — Filter board to items assigned to a team member (match against Name or Initials from the Team Members table)
- `/work list unassigned` — Show only items with no assignee

## Expert Suggestions by Category

When shaping items, suggest experts based on category:

| Category | Suggested Experts |
|----------|------------------|
| **ui** | expert-frontend, expert-ux |
| **backend** | expert-backend, expert-architect |
| **infrastructure** | expert-devops, expert-architect |
| **performance** | expert-backend, expert-architect |
| **security** | expert-security, expert-backend |
| **docs** | expert-docs |

Projects can extend this mapping with domain-specific experts.

## Provider Integration

`/work` commands can route to external systems (Azure DevOps, GitHub) via the provider abstraction. When a provider is configured in CONTEXT.md's `## Work Provider` section, commands like `add`, `list`, `move`, `block`, and `sync` execute against the external system while maintaining local mirrors.

- **Provider files** live in `.claude/providers/` — see `provider.md` for the interface contract
- **Local is the default** — with no Work Provider config, all commands behave as documented above
- **Dual-write** — every external write also writes locally. Local files are authoritative for display.
- **Offline fallback** — if the external system is unreachable, items are created locally with `**Sync**: pending`

## Integration with Other Rules

- **rapid-cycle.md** — Defines phase-dependent gate behavior. Build phase relaxes status gates; shaping and decomposition gates are enforced at phase transition.
- **artifact-first.md** — Discovery artifacts build context mass. Build artifacts document decisions.
- **consultation-first.md** — Phase-dependent. Discovery = discuss. Build = Claude moves items autonomously. Review = human-driven.
- **roles-and-governance.md** — You shape requirements during discovery; Claude builds with full autonomy; you review output.
- **setup command** — `/setup` can seed the board with initial epics during project discovery. These arrive in Shaping stage with pre-populated content from the interview.
