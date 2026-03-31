# Rapid-Cycle Development Workflow

## Core Principle

**Build, then refine.** Claude gets full autonomy during the build phase. The human reviews working output — not intermediate approvals. Feedback flows back as tracked change orders, creating a tight agile cycle.

## Phases

```
Discovery → Decomposition → Build → Review → Change Orders → Build → ...
```

| Phase | Who Drives | What Happens |
|-------|-----------|--------------|
| **Discovery** | Human + Claude | Problem shaping, requirements gathering, visual artifacts (pencil.dev mockups for UI, process maps for all projects) |
| **Decomposition** | Claude (auto) | Requirements → fully decomposed ADO work items. No per-item approval needed. |
| **Build** | Claude (full autonomy) | MVP built end-to-end. Work items auto-updated. Constraints captured as ADO Constraint items. `/settings` page scaffolded. |
| **Review** | Human | Interact with the output. Tweak settings page variables. Conversational feedback. End-of-phase quiz (planned work scope). |
| **Change Orders** | Human → Claude | Feedback batched into a single ADO Change Order per review cycle. Claude implements. Cycle repeats. |

## Phase Transitions

### Discovery → Decomposition
**Trigger**: Claude proposes readiness.

Claude assesses whether enough context exists — requirements documented, visual artifacts reviewed, key decisions made — and presents a summary:

> "I have enough context to build. Here's what I plan to create: [summary]. Ready to proceed?"

Human approves once. Build phase begins.

### Decomposition → Build
**Trigger**: Automatic after decomposition completes.

Claude fully decomposes requirements into ADO work items (Detail → Task), then begins building without further approval.

### Build → Review
**Trigger**: MVP delivered.

Claude reports what was built, including any scope drift with justification. Delivers a working output the human can interact with.

### Review → Change Orders
**Trigger**: Human provides feedback through any channel:
- Settings page variable tweaks (exported config)
- Conversational feedback in session
- End-of-phase quiz results

All feedback from one review session is batched into a single Change Order work item in ADO.

### Change Orders → Build
**Trigger**: Change Order created and decomposed.

Claude implements the changes. Another review cycle follows.

## Discovery Phase Artifacts

During discovery, Claude creates visual artifacts to give the human concrete material to react to.

### UI Projects
Use pencil.dev (via `/sketch` or direct MCP tools):
- UI mockups showing proposed layouts, components, interactions
- Design system tokens (colors, typography, spacing) that carry into build
- Screen flows showing navigation and user journeys

### All Projects
Use Mermaid process maps:
- Technical process maps showing system interactions and data flow
- Workflow diagrams showing user journeys and decision points
- Architecture maps showing component relationships

These artifacts — along with requirements and work items — form the **context mass** that Claude uses to build the MVP.

## Build Phase Rules

During the build phase, Claude operates with full autonomy:

1. **No pausing for approval** — Claude makes all technical decisions and implements
2. **Work items auto-updated** — Status moves through the lifecycle as work completes
3. **Constraints documented** — When Claude encounters a constraint (technical limitation, dependency issue, design conflict), it creates an ADO Constraint work item immediately
4. **Scope drift communicated** — If implementation diverges from requirements, Claude documents where, why, and how. Big swings away from requirements are NOT acceptable — drift must be incremental and justified.
5. **Settings page scaffolded** — Every MVP includes a `/settings` route (see below)

### What Claude Does NOT Do During Build
- Ask permission for individual implementation decisions
- Create approval-gate artifacts
- Pause for consultation on technical approach
- Wait for feedback between work items

## Settings Page Scaffold

Every MVP includes an auto-scaffolded `/settings` route:

### Standard Variables (always included)
- Colors, spacing, typography values from the design system
- Feature flags for major functionality
- Configuration values that affect behavior

### Project-Specific Variables
- Added during build based on what matters for the specific project
- Labeled clearly so the human understands what each variable controls

### Export/Import
- **API-first**: Settings can be read and written via API when available
- **Copy/paste fallback**: JSON export/import for when APIs aren't practical
- Human tweaks values → exports config → Claude reads config and implements changes

## Quiz System

Quizzes happen **after the review phase**, not before `/work done`. They test **planned work outcomes**, not implementation details.

### Good Quiz Questions (Planned Work Scope)
- "Does the submission form validate song URLs?"
- "Can users see the leaderboard update in real time?"
- "Does the voting deadline enforce correctly?"

### Bad Quiz Questions (Implementation Details)
- "What CSS selector targets the submit button?"
- "How many salt rounds does bcrypt use?"
- "What's the JWT expiry duration?"

## Change Order Tracking

Feedback from a review cycle is batched into a single ADO Change Order:

1. Human reviews the MVP output
2. Provides feedback via settings tweaks, conversation, or quiz
3. All feedback from that session becomes one Change Order work item
4. Change Order is decomposed into Detail → Task items
5. Claude implements in the next build cycle

## Scope Drift Protocol

Scope drift during build is inevitable. The protocol:

1. **Document it** — Claude notes what drifted and why in the work item
2. **Justify it** — Every drift has a reason (constraint, better approach discovered, dependency)
3. **Report it** — At build completion, Claude includes a "Scope Drift Summary" listing all deviations
4. **Small drifts are expected** — Implementation details that don't change outcomes
5. **Big swings are not** — If the fundamental approach changes, Claude should have flagged it during discovery

## How Other Rules Behave Per Phase

| Rule | Discovery | Build | Review |
|------|-----------|-------|--------|
| `consultation-first` | Active — discuss and confirm | **Suspended** — Claude proceeds autonomously | Active — respond to human feedback |
| `artifact-first` | Active — create mockups and process maps | Documentation only — no approval gates | Captures change order feedback |
| `roles-and-governance` | Human = architect | Claude = autonomous builder (reports drift) | Human = reviewer, Claude = implementer |
| `work-system` gates | Normal gates apply | **Relaxed** — Claude moves items freely | Review gate applies (quiz at end) |
| `user-interaction` | AskUserQuestion for choices | **Minimal** — make decisions, document rationale | Conversational feedback is primary |

## After-Action Reports

After each rapid cycle (build → review → change order → build), file an AAR capturing:
- What worked well in the cycle
- What friction points emerged
- What rules or processes need adjustment
- Lessons for framework generalization

## Integration with Other Rules

- **`consultation-first.md`** — Phase-dependent; suspended during build
- **`artifact-first.md`** — Discovery artifacts build context mass; build artifacts are documentation
- **`roles-and-governance.md`** — Autonomy model shifts per phase
- **`work-system.md`** — Gates relaxed during build; auto-tracking active
- **`user-interaction.md`** — Minimal questioning during build
- **`after-action-trigger.md`** — AARs filed after each cycle
