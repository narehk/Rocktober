# Patterns Command

Capture prompt patterns and interaction outcomes for meta-learning about effective Claude interactions. Two-layer architecture: raw telemetry events + derived pattern insights.

## Usage

```bash
/patterns analyze [--focus <topic>]    # Generate pattern insights from accumulated events
/patterns report [--period <week|month|all>]  # Produce formatted report
/patterns summary                      # Quick stats — event count, top commands, recent insights
/patterns export                       # Export events and insights for external analysis
/patterns reset                        # Clear session data (with confirmation)
```

## Arguments

- `$ARGUMENTS` — A subcommand (`analyze`, `report`, `summary`, `export`, `reset`) with optional flags

## Subcommand Routing

1. **If `$ARGUMENTS` starts with `analyze`**: Route to `/patterns analyze`
2. **If `$ARGUMENTS` starts with `report`**: Route to `/patterns report`
3. **If `$ARGUMENTS` starts with `summary`**: Route to `/patterns summary`
4. **If `$ARGUMENTS` starts with `export`**: Route to `/patterns export`
5. **If `$ARGUMENTS` starts with `reset`**: Route to `/patterns reset`
6. **Otherwise**: Display usage help

---

## Architecture

### Two-Layer Design

**Layer 1: Interaction Events** — Raw telemetry captured as side effects during normal framework usage. Lightweight JSONL append-only logs.

**Layer 2: Pattern Insights** — Derived analysis generated on-demand or at thresholds. Stored as W-021-compatible artifacts with `.meta.json` sidecars.

### Directory Structure

```
.claude/patterns/
├── sessions/                          # Raw JSONL event logs (gitignored)
│   ├── 2026-03-04-a1b2c3.jsonl
│   └── 2026-03-05-d4e5f6.jsonl
├── insights/                          # Derived analysis (committed)
│   ├── 2026-03-W1-weekly.md
│   └── 2026-03-W1-weekly.meta.json
└── PATTERNS.md                        # Generated summary (gitignored)
```

- **sessions/**: Gitignored. Raw event data is transient — useful for analysis but not version-controlled.
- **insights/**: Committed. Derived insights are valuable artifacts tracked via W-021's registry.
- **PATTERNS.md**: Gitignored. Generated summary rebuilt by `/patterns analyze`.

---

## Layer 1: Interaction Events

### Event Schema

Each event is one JSON line appended to the session file:

```json
{
  "ts": "2026-03-04T14:30:00Z",
  "type": "command | skill | interaction | decision",
  "command": "/work refine",
  "skill": "ideate",
  "item": "W-020",
  "project": "WorkSpaceFramework",
  "duration": 480,
  "outcome": "completed | skipped | failed | partial",
  "decisions": ["hybrid-sidecar", "standalone-command"],
  "user": "KJ",
  "context": {}
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ts` | ISO 8601 | Yes | Timestamp when the event occurred |
| `type` | string | Yes | Event category: `command`, `skill`, `interaction`, or `decision` |
| `command` | string | No | Slash command that triggered this event (e.g., `/work add`, `/review`) |
| `skill` | string | No | Skill name if a skill was invoked (e.g., `ideate`, `expert-architect`) |
| `item` | string | No | Work item ID if this event relates to one (e.g., `W-020`) |
| `project` | string | No | Project name from CONTEXT.md or item file |
| `duration` | number | No | Duration in seconds (for timed interactions like refinement sessions) |
| `outcome` | string | Yes | Result: `completed`, `skipped`, `failed`, or `partial` |
| `decisions` | array | No | Choices made at decision points (e.g., category selected, quiz taken). Default `[]`. |
| `user` | string | No | User initials from Team Members (if configured). Empty if solo. |
| `context` | object | No | Type-specific data. Default `{}`. |

### Session File Naming

```
YYYY-MM-DD-<session-id>.jsonl
```

The session ID is a short random hex string (6 characters). One file per session. If the session spans midnight, continue in the same file.

### Capture Points

Commands and skills that should emit events when they adopt this contract:

| Source | Event Type | When | What's Logged in `context` |
|--------|-----------|------|---------------------------|
| `/work add` | `command` | Item created | `{ "category": "backend", "type": "feature", "provider": "local" }` |
| `/work refine` | `command` | Shaping session ends | `{ "questions": 3, "statusOutcome": "ready" }` |
| `/work review` | `command` | Review transition | `{ "quizTaken": true, "quizScore": "4/5" }` |
| `/work done` | `command` | Completion | `{ "itemsUnblocked": 2, "lifecycleDays": 5 }` |
| `/review` | `command` | Code review | `{ "critical": 0, "errors": 1, "warnings": 3 }` |
| `/commit` | `command` | Commit created | `{ "filesChanged": 5, "commitType": "feat" }` |
| `/doc generate` | `command` | Doc produced | `{ "docType": "api", "pages": 3 }` |
| `/artifacts *` | `command` | Artifact operation | `{ "subcommand": "list", "resultsCount": 12 }` |
| Expert skills | `skill` | Consultation | `{ "expertName": "expert-architect", "outputType": "design" }` |
| AskUserQuestion | `decision` | User makes choice | `{ "question": "Category?", "choice": "infrastructure" }` |
| `/patterns analyze` | `command` | Analysis run | `{ "eventsProcessed": 847, "insightsGenerated": 6 }` |

### Emitting Events — Integration Contract

Commands and skills emit events by appending a JSON line to the current session file. The emit function follows this pattern:

1. **Determine session file path**: Check `.claude/patterns/sessions/` for a file matching today's date (`YYYY-MM-DD-*.jsonl`). If found, use it. If not, create a new one with a random 6-character hex ID.
2. **Construct the event object** using the schema above.
3. **Append one JSON line** to the session file (no trailing comma, newline-terminated).

**Important**: Event emission is a **fire-and-forget side effect**. It must never block the primary operation. If the file write fails (permissions, disk full), silently skip — never surface event logging failures to the user.

### Adoption Status

The following commands emit events per this contract (wired in W-029):

| Command | Event Type | Context Fields |
|---------|-----------|----------------|
| `/setup` | `command` | provider, categoriesCustomized, skillsInstalled, projectRulesGenerated, interviewDuration |
| `/work add` | `command` | category, type, provider |
| `/work refine` | `command` | questions, statusOutcome |
| `/work start` | `command` | branchCreated, assigned |
| `/work done` | `command` | itemsUnblocked, lifecycleDays |
| `/commit` | `command` | filesChanged, commitType |

Remaining capture points (`/work review`, `/review`, `/doc generate`, `/artifacts`, expert skills, AskUserQuestion decisions) will adopt the contract in future updates.

---

## Layer 2: Pattern Insights

Derived analysis stored as artifacts in `.claude/patterns/insights/` with `.meta.json` sidecars (W-021 compatible).

### Insight Types

| Insight | Description | Example Output |
|---------|-------------|----------------|
| **Command effectiveness** | Which commands produce best outcomes | "/review catches 2.3 critical issues per invocation on average" |
| **Skill usage heatmap** | Which experts are consulted most/least | "expert-architect: 12x, expert-security: 2x" |
| **Decision correlation** | How choices affect downstream results | "Items where quiz was completed had 40% fewer post-merge issues" |
| **Refinement quality** | What shaping approaches produce best items | "Items with 3+ questions during refine reached Done 2x faster" |
| **Prompt template library** | Reusable prompts that consistently work | "Starting refinement with 'what triggers this' produces clearer scope" |
| **Lifecycle velocity** | How long items spend in each stage | "Average: 2d in Shaping, 3d in Progress, 1d in Review" |

### Insight Artifact Format

```markdown
# Pattern Insight: {title}

**Generated**: YYYY-MM-DD
**Period**: YYYY-MM-DD to YYYY-MM-DD
**Events analyzed**: N
**Focus**: all | command-effectiveness | skill-usage | decision-correlation | refinement-quality | lifecycle-velocity

## Key Findings

1. {Finding 1}
2. {Finding 2}
3. {Finding 3}

## Data

{Tables, charts, or breakdowns supporting the findings}

## Recommendations

- {Actionable recommendation 1}
- {Actionable recommendation 2}
```

### Insight `.meta.json` Sidecar

```json
{
  "type": "prompt-pattern",
  "workItem": "",
  "project": "ProjectName",
  "created": "YYYY-MM-DD",
  "source": "/patterns analyze",
  "status": "completed",
  "tags": ["patterns", "analysis"],
  "summary": "Weekly interaction pattern analysis — 847 events",
  "extra": { "eventsAnalyzed": 847, "period": "2026-03-01 to 2026-03-07", "focus": "all" }
}
```

---

## `/patterns analyze [--focus <topic>]` — Generate Insights

Scan accumulated session events and produce pattern insights.

### Steps

1. **Scan session files** in `.claude/patterns/sessions/*.jsonl`
2. **If no session files**: "No interaction events found. Events are captured automatically during framework usage. Run some `/work`, `/review`, or `/commit` commands first."
3. **Parse all events** — read each JSONL file, parse each line. Skip malformed lines with a warning count.
4. **Apply focus filter** (if `--focus` provided):
   - `command-effectiveness`: Analyze command outcomes and frequency
   - `skill-usage`: Analyze expert skill consultations
   - `decision-correlation`: Analyze decision points and downstream effects
   - `refinement-quality`: Analyze `/work refine` sessions and item outcomes
   - `lifecycle-velocity`: Analyze time between lifecycle stages
   - No `--focus`: Generate all insight types
5. **Generate analysis** — For each insight type, calculate aggregates and produce findings.
6. **Write insight artifact** to `.claude/patterns/insights/YYYY-MM-DD-<focus>.md`
7. **Write `.meta.json` sidecar** alongside the insight artifact
8. **Regenerate PATTERNS.md** (see Generated PATTERNS.md below)
9. **Display key findings** to the user
10. **Emit own event**: `{ "type": "command", "command": "/patterns analyze", "outcome": "completed", "context": { "eventsProcessed": N, "insightsGenerated": M } }`

### Analysis Calculations

**Command effectiveness:**
- Count by command name → frequency table
- Group by outcome → success rate per command
- Calculate context aggregates (e.g., average review severity counts)

**Skill usage heatmap:**
- Count by skill name → frequency table
- Compare skill usage against work item categories (are security items using expert-security?)

**Decision correlation:**
- Extract decision events → group by command
- Correlate choices with downstream outcomes (e.g., quiz taken vs skipped → post-merge issues)

**Refinement quality:**
- Extract `/work refine` events → analyze duration, question count
- Correlate with item lifecycle (did well-refined items move faster?)

**Lifecycle velocity:**
- Extract `/work` stage transition events → calculate time per stage
- Identify bottlenecks (which stage takes longest?)

---

## `/patterns report [--period <week|month|all>]` — Formatted Report

Produce a human-readable report from insights.

### Steps

1. **Determine period**:
   - `week`: Last 7 days
   - `month`: Last 30 days
   - `all`: All available data
   - Default: `all`
2. **Scan session files** within the period
3. **If no data in period**: "No events found for the selected period."
4. **Scan existing insights** in `.claude/patterns/insights/`
5. **Generate report** combining raw event stats with existing insights:

   ```
   Interaction Pattern Report
   Period: 2026-03-01 to 2026-03-07

   ## Usage Summary

   | Command | Invocations | Success Rate |
   |---------|-------------|--------------|
   | /work   | 45          | 98%          |
   | /commit | 22          | 100%         |
   | /review | 8           | 100%         |

   ## Expert Consultations

   | Skill | Invocations | Avg Duration |
   |-------|-------------|--------------|
   | expert-architect | 5 | 8 min |
   | ideate | 3 | 12 min |

   ## Decision Patterns

   - Category selections: infrastructure (45%), backend (30%), ui (25%)
   - Review quiz: 75% taken, avg score 3.8/5

   ## Lifecycle Velocity

   | Stage | Avg Time |
   |-------|----------|
   | Captured → Shaping | 1.2 days |
   | Shaping → Ready | 2.5 days |
   | Ready → In Progress | 0.5 days |
   | In Progress → In Review | 3.1 days |
   | In Review → Done | 0.8 days |

   ## Insights

   {Include most recent insight findings}
   ```

6. **Consumer focus** — The report adapts based on available data:
   - **Individual**: Filtered to the current user's events (if `user` field populated)
   - **Team**: Aggregate across all users, compare patterns
   - **Framework**: Focus on command/skill effectiveness and prompt patterns

---

## `/patterns summary` — Quick Stats

Show a compact overview of accumulated event data.

### Steps

1. **Scan session files** in `.claude/patterns/sessions/*.jsonl`
2. **If no session files**: "No interaction events found yet."
3. **Calculate quick stats**:
   - Total session files
   - Total events
   - Date range (earliest to latest event)
   - Top 5 commands by frequency
   - Top 3 skills by frequency
   - Most recent insight (if any exist in `insights/`)
4. **Display**:

   ```
   Interaction Patterns — Quick Summary

   Sessions: 42 | Events: 847 | Period: 2026-02-15 to 2026-03-04

   Top Commands:
     /work      234 invocations
     /commit     98
     /review     45
     /test       38
     /doc        22

   Top Skills:
     expert-architect  18 consultations
     ideate            12
     expert-security    8

   Latest Insight: 2026-03-01 — "Items refined with 3+ questions reach Done 2x faster"

   Run /patterns analyze to generate fresh insights.
   ```

---

## `/patterns export` — Export for External Analysis

Bundle events and insights into a single exportable format.

### Steps

1. **Scan session files and insight files**
2. **If no data**: "Nothing to export."
3. **Create export directory** at `.claude/temp/patterns-export-YYYY-MM-DD/`
4. **Copy files**:
   - All `.jsonl` session files → `export/sessions/`
   - All insight `.md` and `.meta.json` files → `export/insights/`
   - Current `PATTERNS.md` → `export/`
5. **Generate `export/summary.json`** with aggregate stats:
   ```json
   {
     "exported": "2026-03-04",
     "sessions": 42,
     "events": 847,
     "insights": 6,
     "dateRange": { "from": "2026-02-15", "to": "2026-03-04" },
     "project": "ProjectName"
   }
   ```
6. **Report**: "Exported to `.claude/temp/patterns-export-YYYY-MM-DD/` — {N} sessions, {M} events, {K} insights. Copy this directory for external analysis."

---

## `/patterns reset` — Clear Session Data

Clear accumulated session events (with confirmation). Insights are preserved.

### Steps

1. **Count session files and events**
2. **If no session files**: "No session data to clear."
3. **Confirm via AskUserQuestion**:
   ```javascript
   {
     question: "Clear all session event data? (N sessions, M events). Insights in insights/ will be preserved.",
     header: "Clear Data",
     options: [
       { label: "Clear sessions", description: "Delete all .jsonl files in sessions/. Insights are preserved." },
       { label: "Clear everything", description: "Delete sessions AND insights. Start completely fresh." },
       { label: "Cancel", description: "Keep all data" }
     ],
     multiSelect: false
   }
   ```
4. **If Clear sessions**: Delete all `.jsonl` files in `sessions/`. Keep `insights/` intact.
5. **If Clear everything**: Delete all files in both `sessions/` and `insights/`. Regenerate empty `PATTERNS.md`.
6. **If Cancel**: "Reset cancelled. Data preserved."
7. **Report**: "Cleared {N} session files ({M} events). Insights {preserved|cleared}."

---

## Generated PATTERNS.md

A browsable summary regenerated by `/patterns analyze`. Gitignored — not committed.

```markdown
# Interaction Patterns

**Generated**: YYYY-MM-DD — rebuild with `/patterns analyze`

## Quick Stats

| Metric | Value |
|--------|-------|
| Total sessions | 42 |
| Total events | 847 |
| Most used command | /work (234) |
| Most consulted expert | expert-architect (18) |
| Avg refinement duration | 12 min |

## Top Insights

1. Items refined with 3+ questions reach Done 2x faster
2. Review quiz completion correlates with fewer post-merge issues
3. expert-security is underutilized relative to security-category items

## Recent Trends

- Command usage up 15% this week
- /doc generate adopted in 3 projects
- Average quiz score improving (3.2 → 4.1 over 4 weeks)

## Command Breakdown

| Command | Count | Success Rate | Avg Context |
|---------|-------|-------------|-------------|
| /work add | 45 | 100% | category: infrastructure (40%) |
| /work refine | 12 | 92% | avg questions: 3.2 |
| /review | 8 | 100% | avg findings: 4.1 |

## Skill Heatmap

| Skill | Count | Avg Duration |
|-------|-------|-------------|
| expert-architect | 18 | 8 min |
| ideate | 12 | 15 min |
| expert-security | 2 | 5 min |
```

---

## Analysis Triggers

### Periodic Trigger

After a configurable number of sessions (default: 10) without an analysis run, the next command invocation should suggest:

"You have {N} sessions ({M} events) since the last analysis. Run `/patterns analyze` for fresh insights."

This is a **suggestion only** — never auto-analyze. The nudge fires once, then waits for the next threshold.

### Threshold Trigger

When a single session accumulates 50+ events without an analysis, suggest:

"This session has {N} events. Consider running `/patterns analyze` to capture insights."

Same rules: suggestion only, fires once per threshold crossing.

### Configuration

Trigger thresholds can be configured in CONTEXT.md under a `## Patterns` section (optional):

```markdown
## Patterns

- **Session threshold**: 10 (suggest analysis after N sessions)
- **Event threshold**: 50 (suggest analysis after N events in one session)
- **Auto-analyze**: false (never auto-run analysis)
```

When no configuration exists, use defaults. `Auto-analyze` is always false — patterns are opt-in and non-intrusive.

---

## Consumer Views

The three consumers see different perspectives from the same data:

### Individual Developer

Filtered to a single user's events (when `user` field is populated via Team Members):
- Personal command usage patterns
- Effective approaches that worked for this developer
- Skills consulted and outcomes
- Areas for improvement (e.g., "You skip review quizzes 60% of the time")

### Team

Aggregated across all users (when multiple users captured):
- Shared patterns and divergences
- Skill gaps (are certain experts underused?)
- Process improvements (which stage is the bottleneck?)
- Knowledge distribution (who consults which experts?)

### Framework

Meta-analysis of the framework itself:
- Which commands/skills produce the best outcomes
- Prompt template effectiveness
- Integration contract adoption (which commands emit events?)
- Suggestions for framework improvements

---

## Integration with Other Systems

### W-021 Artifact Registry

Insight artifacts in `insights/` use `.meta.json` sidecars with `type: "prompt-pattern"`. They appear in `/artifacts list --type prompt-pattern` and are included in `/artifacts stats`.

### W-020 Review Quiz

Quiz events capture scores and completion/declination, enabling correlation analysis between quiz engagement and downstream code quality.

### W-019 Doc Generation

Doc generation events capture types and page counts, enabling analysis of documentation coverage patterns.

### documentation-standards.md

Pattern insights can inform documentation review cadence — if analysis shows docs going stale faster in certain areas, suggest more frequent reviews.

---

## Important

- **Privacy by default**: Session files are gitignored. Raw interaction data never leaves the local machine unless explicitly exported.
- **Fire-and-forget**: Event emission never blocks the primary operation. Failures are silent.
- **Suggestion, not automation**: Triggers suggest analysis — they never auto-run. The user controls when insights are generated.
- **Incremental adoption**: Existing commands are not modified. They adopt the event contract at their own pace in future updates.
- **Consumer views are perspectives, not separate systems**: The same data is sliced differently for individual, team, and framework consumers.
- **PATTERNS.md is gitignored**: Like BOARD.md, it's a generated view — not a source of truth.
