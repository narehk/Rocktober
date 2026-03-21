---
paths:
  - "**/*"
priority: 5
---

# File Organization Guidelines

## Directory Purpose Map

| Directory | Purpose | When to Use |
|-----------|---------|-------------|
| `docs/` | User-facing documentation | Architecture guides, getting started, API docs, project plans |
| `docs/reviews/` | Code review log | Compressed quarterly review summaries |
| `.claude/artifacts/` | Implementation artifacts | Feature notes, fix logs, detailed reviews, implementation summaries |
| `.claude/temp/` | Scratch work | Temporary analysis files (gitignored - not persistent) |
| `.claude/memory/` | Architectural decisions | Team decisions, not personal preferences (ADR-style decision log) |
| `.claude/rules/` | Coding rules | Path-specific guidance for Claude Code |
| `.claude/skills/` | Expert skills | SKILL.md files for expert panel system |
| `.claude/commands/` | Slash commands | Workflow automation scripts |
| `.claude/providers/` | Work provider routing | Provider interface, ADO/GitHub/local routing instructions |
| `.claude/patterns/` | Interaction analytics | sessions/ (JSONL telemetry, gitignored), insights/ (derived analysis), PATTERNS.md (generated, gitignored) |
| `.claude/work/` | Work tracking | items/ (source of truth), archive/, BOARD.md (generated, gitignored) |

## File Placement Rules

### Never Place in Root

Do not place these in the repository root:
- Implementation notes
- Fix logs
- Code review reports
- Temporary files
- Backup files
- Feature documentation

Use the appropriate subdirectory as outlined below.

### Documentation (`docs/`)

**What goes here:** Developer onboarding guides, architecture overviews, project plans, specialized docs (standards, reviews, sessions).

**Who uses it:** Developers, stakeholders, new team members

**Lifecycle:** Long-term, versioned documentation

### Feature Artifacts (`.claude/artifacts/<feature>/`)

**What goes here:** Feature implementation summaries, detailed code review findings, bug fix logs, design decisions, migration guides.

**File naming:** `YYYY-MM-DD-<feature-slug>.md`

**Example:**
```
.claude/artifacts/
├── auth/
│   └── 2026-01-16-auth-implementation.md
└── dashboard/
    └── 2026-02-05-dashboard-redesign.md
```

**Lifecycle:** Created during feature development, archived when complete

**Metadata sidecar:** Artifacts can have a companion `.meta.json` file for registry tracking. The sidecar uses the same base name as the artifact:

```
.claude/artifacts/auth/
├── 2026-01-16-auth-implementation.md
└── 2026-01-16-auth-implementation.meta.json
```

Systems that produce artifacts (e.g., `/work review`, `/review`, `/sketch`) write the `.meta.json` automatically. For manually created artifacts, use `/artifacts tag <path>` to create metadata. See the `/artifacts` command for the full sidecar schema.

`INDEX.md` in `.claude/artifacts/` is a generated file — rebuilt by `/artifacts index`. Do not edit it manually.

### Temporary Files (`.claude/temp/`)

**What goes here:** Analysis scratch work, draft documents, comparison outputs, test result captures, work-in-progress notes.

**Important:**
- These files are gitignored - do not expect persistence across sessions
- Never put final work here - only use for scratch work
- Clean up after yourself when done

### Decisions & Memory (`.claude/memory/`)

**What goes here:** Project-level architectural decisions that affect the whole team. Use ADR (Architecture Decision Record) style entries.

**Structured format for decision entries:**

```markdown
### YYYY-MM-DD — Decision Title

**Context**: Why this decision was needed
**Decision**: What was decided
**Decided by**: Name or initials of the person who made the call
**Rationale**: Why this option was chosen over alternatives
**Alternatives considered**: What else was evaluated
```

**Correct memory entries** (team decisions):
- "Use PostgreSQL for the permit database because of GIS extensions"
- "Standardize on React for all citizen-facing apps"
- "JWT tokens expire after 24 hours with refresh rotation"

**Incorrect memory entries** (personal preferences):
- "I prefer tabs over spaces"
- "Dark mode is better"
- "Use Vim keybindings"

Personal preferences belong in individual developer settings, not in shared project memory.

### Code Reviews (`docs/reviews/`)

**File naming:** `YYYY-Q<N>.md`

**Format:**
```markdown
### YYYY-MM-DD - Feature Name Review
**Reviewer**: Claude Model Name
**Scope**: Brief description
**Summary**: X critical, Y important issues
**Full details**: `.claude/artifacts/<feature>/YYYY-MM-DD-<feature>.md`
```

## Naming Conventions

### Artifacts
**Format:** `YYYY-MM-DD-<feature-slug>.md`

### Review Logs
**Format:** `YYYY-Q<N>.md`

### Session Notes
**Format:** `YYYY-MM-DD-<topic-slug>.md`

## Cleanup Responsibilities

### When Completing a Feature

1. Move artifacts from root to `.claude/artifacts/<feature>/`
2. Consolidate related documents into single artifact file
3. Add review summary to `docs/reviews/YYYY-Q<N>.md`
4. Delete temporary files from `.claude/temp/`
5. Update user docs in `docs/` if needed

### Before Committing

1. Check git status for unexpected files in root
2. Verify .gitignore catches `.claude/temp/` contents
3. Remove backup files (*.backup, *.bak, etc.)
4. **CRITICAL - Handle unexpected changes properly**:
   - If files changed that were NOT part of your implementation scope:
   - **NEVER revert without asking the user first**
   - These are likely user-generated changes made during your work
   - Ask: "I see changes in [file] - should I include these in the commit or commit separately?"
   - Only revert automatically if: backup files (.bak, .backup), `.claude/temp/` scratch work, or files you created by mistake

## Agent Guidelines

### When Creating Files

1. Never use root directory for agent-generated content
2. Always check directory purpose before placing files
3. Follow naming conventions for consistency
4. Use `.claude/temp/` for scratch work during analysis
5. Create artifacts for implementation summaries

### When Cleaning Up

1. Delete temp files after complex operations complete
2. Consolidate multiple related files into single artifacts
3. Move root-level artifacts to proper locations
4. Suggest documentation updates when user-facing changes occur
