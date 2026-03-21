# Setup Command

Configure a new project through a discovery interview. Understands your project before recommending a tech stack or generating files.

## Usage

```bash
/setup                    # Run discovery interview + configure project
/setup update             # Pull framework updates into existing project
/setup context refresh    # Walk through CONTEXT.md sections, update what changed
/setup context check      # Report staleness and detect dependency mismatches
/setup extend <domain>    # Scaffold an optional domain extension skill
/setup remove             # Remove framework from project (preserves project content)
/setup remove --keep-work # Remove framework but preserve work items
```

## `/setup` — Install Framework

### Pre-flight: Resume Logic

Before starting, check for an existing discovery file at `.claude/artifacts/discovery/discovery.md`:

- **File does NOT exist**: Create the directory `.claude/artifacts/discovery/` if needed, then proceed directly to Step 1 (Discovery Interview).
- **File exists, Status is NOT `complete`**: Present a resume prompt:
  ```javascript
  {
    question: "Found an in-progress discovery session. How would you like to proceed?",
    header: "Existing Discovery",
    options: [
      { label: "Continue", description: "Pick up where we left off" },
      { label: "Review & update", description: "Walk through what we have and revise" },
      { label: "Start over", description: "Discard previous answers and begin fresh" }
    ],
    multiSelect: false
  }
  ```
  - **Continue**: Read discovery.md, identify the current Phase, and resume from the next unanswered section.
  - **Review & update**: Read discovery.md, present a summary of all captured answers, then walk through each section asking if updates are needed.
  - **Start over**: Archive the existing file to `.claude/artifacts/discovery/discovery-{timestamp}.md.bak`, then proceed to Step 1 with a fresh discovery.md.

- **File exists, Status IS `complete`**: Present a reconfigure prompt:
  ```javascript
  {
    question: "Discovery is already complete. What would you like to do?",
    header: "Existing Discovery",
    options: [
      { label: "Update sections", description: "Revise specific parts of the discovery" },
      { label: "Start over", description: "Discard everything and begin fresh" }
    ],
    multiSelect: false
  }
  ```
  - **Update sections**: Ask which section to revise, then walk through it.
  - **Start over**: Archive the existing file to `.claude/artifacts/discovery/discovery-{timestamp}.md.bak`, then proceed to Step 1 with a fresh discovery.md.

### Pre-flight: Template Cleanup

When a project is created from the framework's GitHub template, framework-internal content (work items, artifacts, memory) may carry over. Detect and clean this up before the interview begins.

**Run this cleanup only when ALL three conditions are true:**

1. Framework is installed (`.claude/rules/roles-and-governance.md` exists)
2. No discovery file exists (`.claude/artifacts/discovery/discovery.md` does NOT exist — this is a fresh project)
3. Framework-internal content detected (at least one match from the checks below)

**Detection and cleanup actions:**

1. **Work items**: Scan `.md` files (except `.gitkeep`) in `.claude/work/items/` and `.claude/work/archive/`. Delete any file where content contains `**Project**: WorkSpaceFramework`.
2. **Artifacts**: Scan files in `.claude/artifacts/` (recursively). Delete any file that contains `WorkSpaceFramework` references — but preserve directory structure, `.gitkeep` files, and the `discovery/` subdirectory.
3. **Memory**: Delete any files in `.claude/memory/` except `.gitkeep`.
4. **Pattern sessions**: Delete any `.jsonl` files in `.claude/patterns/sessions/`.
5. **Pattern insights**: Delete any files in `.claude/patterns/insights/` except `.gitkeep`.

**Reporting:**

- If files were deleted: Report "Cleaned up N framework template files. Starting with a clean slate."
- If no framework-internal content was found: Skip silently — no output.

### Step 1: Discovery Interview

Run a conversational discovery interview across five phases. The goal is to deeply understand the project before making any technology or architecture decisions.

#### Phase 1 — Vision & Purpose

Understand what the project is and why it exists. Ask about:

- **Project name** — What is this project called?
- **Elevator pitch** — In one or two sentences, what does it do?
- **Target users** — Who will use this? (developers, end users, internal team, etc.)
- **Problem solved** — What pain point or need does it address?
- **Success criteria** — How will you know this project is successful?

Ask one question at a time. Let the conversation flow naturally. If the user gives a rich answer that covers multiple points, acknowledge what was covered and move on.

#### Phase 2 — Existing Context & Artifacts

Find out what already exists. Ask about:

- Brand assets (logos, style guides, color palettes)
- Wireframes or mockups (Figma, pencil.dev, sketches, screenshots)
- Process maps or flowcharts
- User stories or requirements docs
- API specs or database schemas
- Competitor references or inspiration sites

For each artifact mentioned, record it by reference (file path or URL) in discovery.md. Do NOT copy file contents into discovery.md — just catalogue the reference and a brief note about what it contains.

#### Phase 3 — Constraints & Context

Understand the boundaries. Ask about:

- **Timeline** — Is there a deadline or launch target?
- **Team size** — Solo developer? Small team? Large organization?
- **Hosting preferences** — Cloud provider, self-hosted, serverless, etc.
- **Compliance requirements** — HIPAA, GDPR, SOC2, accessibility standards, etc.
- **Budget** — Free tier only? Enterprise budget? Somewhere in between?
- **Skill level** — Beginner learning, experienced developer, or mixed team?

**Team follow-up questions** (when team size > 1):

When the user indicates more than one person will be working on the project, ask follow-up questions to populate the Team Members and Git Workflow sections in CONTEXT.md:

- **Team members** — Who is on the team? For each person, capture: Name, GitHub username (if applicable), Role, and Initials (2-3 characters). Record in the Team Members table format.
- **Git workflow** — Does the team have branch naming conventions? What's the base branch (main/develop)? Merge strategy (squash, merge, rebase)? Any protected branches?

These are conversational — don't present a form. Ask naturally based on what the user shares. If the team is just "me and one other person," keep it brief.

**Work Provider questions** (always ask — after team/git questions):

Always ask about work tracking, regardless of team size or project type. Even solo developers may use GitHub Issues or ADO Boards.

- **Work tracking** — "Where do you track work items? Azure DevOps Boards, GitHub Issues, or just local tracking?" Ask this directly — don't infer or skip based on context.
- **If ADO**: What's the organization URL? Project name? Process template? Are there custom work item types or states?
- **If GitHub**: Is the repository the same as the code repo, or a separate tracking repo?
- **If local**: Confirm: "Got it — we'll use local-only tracking. You can add a provider later with `/setup context refresh`."

Record the provider choice and config details in discovery.md under Constraints & Context.

**Doc Provider follow-up questions** (after work provider questions):

Ask about documentation routing regardless of work provider choice. Projects may use local work tracking but publish docs externally, or vice versa.

- **Documentation system** — "Where does documentation live? ADO Wiki, GitHub Wiki/docs, or just a local `docs/` directory?"
- **If ADO Wiki**: What's the wiki name? (e.g., `MyProject.wiki`)
- **If GitHub**: Wiki pages or committed `docs/` directory?
- **Auto-routing**: Should Claude suggest doc generation when features are completed? (default: no)
- **If local or no preference**: Confirm: "Got it — docs will live in the local `docs/` directory."

Record the doc provider choice in discovery.md. If no preference, default to local.

**Extension skill hints** (during Phases 3-4):

When discovery surfaces domain needs that match optional extensions, mention them:
- Compliance requirements (HIPAA, GDPR, SOC2) → "Your project may benefit from an `expert-compliance` extension skill. You can add this after setup with `/setup extend compliance`."
- Data pipelines, ETL, or analytics → mention `expert-data`
- Native mobile development → mention `expert-mobile`
- LLM integration, RAG, or ML → mention `expert-ai`
- Multi-language or i18n needs → mention `expert-i18n`

These are informational hints, not blockers. Don't push — just mention once if relevant.

Skip questions that are clearly irrelevant to the project. A personal hobby project does not need compliance questions. A static site does not need hosting deep-dives.

#### Phase 4 — Domain Deep-Dive

Understand the problem domain. Ask about:

- **Key entities** — What are the main objects/concepts in the system? (users, orders, documents, etc.)
- **Core user journeys** — Walk through the 2-4 most important things a user will do.
- **Integrations** — Third-party services, APIs, payment processors, auth providers, etc.
- **Known risks** — What could go wrong? What are the hard parts?

#### Phase 5 — Synthesis & Confirmation

Present a structured summary of everything gathered. Ask the user to confirm accuracy or correct any misunderstandings. Use this format:

> Here's what I've captured about your project. Please review and let me know if anything needs correction:
>
> **[Project Name]** — [pitch]
> **For**: [target users]
> **Problem**: [problem statement]
> **Success looks like**: [criteria]
>
> **Constraints**: [timeline, team, hosting, etc.]
> **Key entities**: [list]
> **Core journeys**: [list]
> **Integrations**: [list]
> **Known risks**: [list]
> **Existing materials**: [count] referenced

Wait for confirmation before proceeding.

#### Behavior Guidelines

These are critical — follow them throughout the interview:

- **Do NOT robotically ask every question.** Phases are a guide, not a script. Adapt to what the user tells you.
- **Skip what's already answered.** If the user's elevator pitch covered the target users and problem, don't re-ask those.
- **Skip what's not relevant.** A weekend hackathon project doesn't need compliance or budget questions.
- **Be conversational.** React to answers. Ask follow-up questions when something is interesting or unclear.
- **Update discovery.md after each answered question.** Don't wait until the end of a phase. Write incrementally so progress is never lost.
- **One question at a time.** Never dump a list of five questions. Ask, listen, respond, then ask the next.

#### Discovery.md Format

Create and maintain `.claude/artifacts/discovery/discovery.md` with this structure:

```markdown
# Project Discovery

**Started**: {date}
**Status**: interviewing | recommending-stack | generating-epics | complete
**Phase**: 1-vision | 2-artifacts | 3-constraints | 4-domain | 5-synthesis

## Vision & Purpose
- **Name**: ...
- **Pitch**: ...
- **Users**: ...
- **Problem**: ...
- **Success**: ...

## Existing Materials
| Type | Reference | Notes |
|------|-----------|-------|

## Constraints & Context
- **Timeline**: ...
- **Team**: ...
- **Hosting**: ...
- **Compliance**: ...
- **Budget**: ...
- **Skill level**: ...
- **Work Provider**: local | ado | github
- **Provider Config**: (org, project, repo, etc.)

## Domain
- **Entities**: ...
- **Key journeys**: ...
- **Integrations**: ...
- **Risks**: ...

## Tech Stack
**Status**: pending | confirmed
| Layer | Choice | Rationale |
|-------|--------|-----------|

## Epics
**Status**: pending | approved | skipped
| ID | Title | Category |
|----|-------|----------|
```

Update the **Status** and **Phase** fields as the process progresses.

### Step 2: Tech Stack Recommendation

**Skip condition**: If the user already stated their preferred tech stack during the interview (e.g., "I'm building this in Next.js with Postgres"), confirm it and record it in discovery.md. Do not force a recommendation exercise when the user already knows what they want.

If the stack is NOT already decided, analyze the discovery answers using this signal table:

| Signal | Influences |
|--------|-----------|
| Project complexity | Framework weight, build tooling |
| User skill level & learning goals | Familiar vs. aspirational choices |
| Domain requirements (realtime, heavy data, media) | Backend language, database type |
| Integrations needed | API style, auth approach |
| Timeline pressure | Convention-over-config vs. flexible |
| Team size | Monolith vs. services, DX tooling |
| Existing artifacts | Frontend framework |

Present **one recommended stack** with a rationale for each layer, plus **one alternative** for contrast. Format as a clear table with reasoning.

Wait for the user to approve, modify, or reject. Once confirmed, update discovery.md:
- Fill in the Tech Stack table with choices and rationale
- Set Tech Stack Status to `confirmed`
- Set document Status to `generating-epics`

### Step 3: Generate Initial Epics

Derive 4-8 epic-level work items from the discovery. Follow these rules:

- **Core user journeys** from Phase 4 become epics
- **Non-trivial infrastructure** (auth, deployment, CI/CD) becomes an epic if substantial
- **Substantial integrations** (payment, email, third-party APIs) become epics
- **Project scaffolding** is always the first epic
- **Target 4-8 epics.** Fewer than 4 means the domain was under-explored — go back and ask more. More than 8 means consolidate related work.
- **Stay high-level.** No sub-tasks, no implementation details. Each epic is a meaningful chunk of user-facing or foundational work.

Each epic should be in the **Shaping** stage with:
- **One-liner**: Brief description of the epic
- **Problem statement**: What user need or technical need does this address?
- **Proposed solution**: High-level approach (not implementation details)
- **Suggested experts**: Which skill experts would be relevant (from the framework's skill registry)
- **Open questions**: What still needs to be figured out?

Present the list and ask for approval:

```javascript
{
  question: "Here are the initial epics I've derived from our discovery. How do you want to proceed?",
  header: "Initial Epics",
  options: [
    { label: "Approve", description: "Add these to the work board" },
    { label: "Adjust", description: "Let me modify the list before adding" },
    { label: "Skip", description: "Don't create epics now — I'll add work items manually" }
  ],
  multiSelect: false
}
```

- **Approve**: Create item files in `.claude/work/items/` and regenerate BOARD.md.
- **Adjust**: Ask what to change, revise, then re-present.
- **Skip**: Set Epics Status to `skipped` in discovery.md and move on.

Update discovery.md Epics section with the final list (or mark as skipped).

### Step 4: Work Categories

Present default work categories with the option to customize:

```javascript
{
  question: "Use default work categories or customize?",
  header: "Categories",
  options: [
    { label: "Defaults (Recommended)", description: "ui, backend, infrastructure, performance, security, docs" },
    { label: "Customize", description: "Add, remove, or rename categories" }
  ],
  multiSelect: false
}
```

Default categories: `ui`, `backend`, `infrastructure`, `performance`, `security`, `docs`

If the user chooses to customize, walk through additions, removals, or renames conversationally.

### Step 5: Generate Project Files

Consume discovery.md to fill templates and generate all framework files.

1. **Verify directory structure** — Check that the install script created the expected directories. If any are missing, create them:
   ```
   .claude/
   ├── settings.local.json
   ├── rules/
   ├── commands/
   ├── providers/                    # Work provider routing
   │   ├── provider.md
   │   ├── local.md
   │   ├── ado.md
   │   └── github.md
   ├── skills/
   │   ├── REGISTRY.md
   │   └── CONTEXT.md
   ├── work/
   │   ├── BOARD.md             # Generated from item files (gitignored)
   │   ├── items/
   │   └── archive/
   ├── artifacts/
   │   └── discovery/
   ├── temp/
   ├── memory/
   ├── voice-inbox/
   └── scripts/
       └── statusline.js
   ```

2. **Copy framework files** (these are already portable):
   - All files from `.claude/rules/`
   - All files from `.claude/commands/`
   - All files from `.claude/providers/` (provider.md, local.md, ado.md, github.md)
   - All skill directories from `.claude/skills/` (excluding REGISTRY.md and CONTEXT.md which are generated)
   - `statusline.js` from `.claude/scripts/`

3. **Generate project-specific files** from templates, using discovery.md content:
   - **CLAUDE.md** — From `CLAUDE.md.template`. Fill: PROJECT_NAME, PROJECT_DESCRIPTION (from pitch), TECH_STACK_SUMMARY, SOURCE_DIR, ADDITIONAL_SKILLS
   - **CONTEXT.md** — From `CONTEXT.md.template`. Fill: All tech stack details, project structure, test commands, verify steps. When team size > 1 and team members were captured in Phase 3, fill TEAM_MEMBERS with the team table and GIT_WORKFLOW with the branch conventions. Fill WORK_PROVIDER and DOC_PROVIDER using the concrete formats below. Otherwise leave these placeholders empty (the commented examples remain as documentation).

     **`{{WORK_PROVIDER}}` — use the exact format for the chosen provider:**

     **local** (default — remove placeholder, leave the section empty so the comment block remains as documentation):
     ```
     {{WORK_PROVIDER}} → (remove entirely)
     ```

     **github:**
     ```markdown
     - **Provider**: github
     - **Repository**: owner/repo
     ```
     (If the user said "same repo", omit Repository — it auto-detects from git remote.)

     **ado:**
     ```markdown
     - **Provider**: ado
     - **Organization**: https://dev.azure.com/yourorg
     - **Project**: Your Project Name
     - **Process Template**: Your Process Template
     - **CLI**: az boards (requires az CLI + azure-devops extension)

     #### Work Item Hierarchy

     Products → Projects → Planned Work → Details → Tasks

     #### Type → State Mappings

     ##### Task (default for `/work add`)

     | Our Stage | ADO State |
     |-----------|-----------|
     | Captured | To Do |
     | Shaping | To Do |
     | Ready | To Do |
     | In Progress | Doing |
     | In Review | Testing |
     | Done | Done |
     ```
     Fill Organization, Project, and Process Template from the user's Phase 3 answers. Add additional type→state mapping tables for each work item type the user mentioned (Bug, Issue, etc.). If the user didn't specify custom states, use the defaults from `.claude/providers/ado.md`.

     **`{{DOC_PROVIDER}}` — use the exact format for the chosen provider:**

     **local** (default — remove placeholder, leave the section empty):
     ```
     {{DOC_PROVIDER}} → (remove entirely)
     ```

     **github:**
     ```markdown
     - **Provider**: github
     - **Target**: wiki
     - **Auto-route**: false
     - **Doc Types**: api, guides, adrs, onboarding
     ```
     (Use `docs/` instead of `wiki` if user chose committed docs.)

     **ado:**
     ```markdown
     - **Provider**: ado
     - **Target**: MyProject.wiki
     - **Auto-route**: false
     - **Doc Types**: api, guides, adrs, onboarding
     ```
     Fill Target with the wiki name from the user's Phase 3 answers.
   - **REGISTRY.md** — From `REGISTRY.md.template`. Fill: PROJECT_NAME, ADDITIONAL_SKILLS
   - **settings.local.json** — From `settings.local.json.template`. Fill `{{PROJECT_PATH}}` with the project root (use forward slashes, escape backslashes for Windows — e.g., `C:\\Users\\name\\project` or `C:/Users/name/project`). Replace `{{ADDITIONAL_PERMISSIONS}}` with the provider-specific permissions based on the Work Provider chosen in Phase 3, plus any tech-stack-specific permissions:

     - **local** (default): remove the placeholder line
     - **github**: `"Bash(gh:*)"`
     - **ado**: `"Bash(az boards:*)"`, `"Bash(az rest:*)"`, `"Bash(az login:*)"`, `"Bash(az devops:*)"`, `"Bash(az extension:*)"`

     Append additional entries for tools discovered in Phase 1 (e.g., `"Bash(npm:*)"`, `"Bash(pip:*)"`, `"Bash(docker:*)"`, `"Bash(dotnet:*)"`).

     **Complete example (ADO + Node.js project):**
     ```json
     "allow": [
       "Bash(git status:*)",
       "Bash(git diff:*)",
       "Bash(git log:*)",
       "Bash(git add:*)",
       "Bash(git commit:*)",
       "Bash(git push:*)",
       "Bash(git branch:*)",
       "Bash(git checkout:*)",
       "Bash(git stash:*)",
       "WebSearch",
       "Bash(az boards:*)",
       "Bash(az rest:*)",
       "Bash(az login:*)",
       "Bash(az devops:*)",
       "Bash(az extension:*)",
       "Bash(npm:*)"
     ]
     ```
   - **BOARD.md** — Generated from item files (if epics were created in Step 3, regenerate; otherwise generated empty on first `/work` use)
   - **tech-stack.md** — From `project-rules/tech-stack.md.template` → target project's `.claude/rules/tech-stack.md`. Fill from discovery Phase 1 and confirmed tech stack:
     - `SOURCE_PATHS`: Source directory paths (e.g., `src/**`)
     - `PROJECT_NAME`: Project name
     - `LANGUAGE_RULES`: Language version, module system, import conventions from confirmed stack
     - `CODE_STYLE_RULES`: Linting, formatting tools, style preferences from discovery
     - `PATTERN_RULES`: Architecture patterns (MVC, component-based, etc.) from domain discussion
     - `DATABASE_RULES`: Database conventions from confirmed stack (if applicable, otherwise "N/A — no database")
     - `API_RULES`: API style and conventions from confirmed stack (if applicable, otherwise "N/A — no API layer")
   - **domain-patterns.md** — From `project-rules/domain-patterns.md.template` → target project's `.claude/rules/domain-patterns.md`. Fill from discovery Phase 4 (Domain Deep-Dive):
     - `DOMAIN_PATHS`: Source directory paths (e.g., `src/**`)
     - `PROJECT_NAME`: Project name
     - `DOMAIN_CONCEPTS`: Key entities and concepts from Phase 4
     - `BUSINESS_RULES`: Core business logic rules from Phase 4 user journeys
     - `VALIDATION_RULES`: Data validation patterns from Phase 4 entities
     - `NAMING_CONVENTIONS`: Domain-specific naming from Phase 4 entities and concepts
     - If Phase 4 was sparse, generate minimal content with TODO comments for the user to fill in

4. **Update .gitignore** — Add these entries to the project's `.gitignore` if not already present:
   ```
   # Claude Code framework
   .claude/temp/
   .claude/voice-inbox/*.txt
   .claude/voice-inbox/*.md
   !.claude/voice-inbox/.gitkeep

   # Generated board (derived from item files)
   .claude/work/BOARD.md
   ```

5. **Check provider prerequisites** — If discovery captured a work provider other than `local`:
   - **ADO**: Check for `az` CLI and `azure-devops` extension. If missing, show a warning (not a blocker): "ADO provider configured but `az` CLI not found. Install it before using `/work` with ADO: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli"
   - **GitHub**: Check for `gh` CLI. If missing, show a warning: "GitHub provider configured but `gh` CLI not found. Install it before using `/work` with GitHub: https://cli.github.com/"
   - These are warnings, not blockers — the framework installs successfully either way. The offline fallback handles missing CLIs at runtime.

6. **Stamp framework version** — Read the framework's current git tag (latest semver tag, e.g., `v0.1.0`) and write it to `.claude/framework-version` in the target project. This enables `/setup update` to detect what changed.

7. **Update discovery.md** — Set Status to `complete`.

### Step 6: Summary & Telemetry

Display a summary of everything created:

```
Framework installed into [project name]:

Discovery:
  - .claude/artifacts/discovery/discovery.md (project discovery document)

Framework files:
  - CLAUDE.md (project instructions)
  - .claude/rules/ (behavioral rules)
  - .claude/rules/tech-stack.md (project-specific tech stack rules)
  - .claude/rules/domain-patterns.md (project-specific domain rules)
  - .claude/commands/ (slash commands)
  - .claude/providers/ (work provider routing: local, ado, github)
  - .claude/skills/ (expert skills + REGISTRY + CONTEXT)
  - .claude/scripts/statusline.js (context monitor)
  - .claude/settings.local.json (permissions)

Work board:
  - .claude/work/BOARD.md (generated from item files, gitignored)

Work provider: [local | ado (org/project) | github (owner/repo)]
Tech stack: [one-line summary of confirmed stack]
Framework version: v{version} (stamped to .claude/framework-version)

Next steps:
  1. Review and customize .claude/skills/CONTEXT.md
  2. Pick an epic to refine with /work refine [id]
  3. Add new ideas with /work add "your idea"
  4. Run /verify to check project health
```

**Emit telemetry event** (fire-and-forget) — As the final step after displaying the summary, append one JSON line to the current session file in `.claude/patterns/sessions/` (see `patterns.md` Integration Contract for session file naming and schema):

```json
{ "ts": "<ISO 8601>", "type": "command", "command": "/setup", "project": "<project name>", "outcome": "completed", "context": { "provider": "<work provider>", "categoriesCustomized": <bool>, "skillsInstalled": <count>, "projectRulesGenerated": true, "interviewDuration": <seconds> } }
```

`skillsInstalled` is the count of skill directories copied. `interviewDuration` is approximate elapsed seconds from interview start to completion (estimate from conversation length if exact timing is unavailable). If the session directory or file doesn't exist, create it (`YYYY-MM-DD-<6-char-hex>.jsonl`). If the write fails, silently skip — never surface event logging failures to the user.

## `/setup update` — Update Existing Installation

1. **Check for existing installation** (look for `.claude/rules/roles-and-governance.md`)
2. **If not installed**: "No framework installation found. Run `/setup` first."
3. **Read versions**:
   - **Framework version**: Read the latest semver git tag from the WorkSpaceFramework repo (e.g., `git -C <framework-path> describe --tags --abbrev=0`)
   - **Installed version**: Read `.claude/framework-version` from the target project
   - If no installed version file exists, treat as `0.0.0` (pre-versioning install)
4. **Compare versions**:
   - If versions match: "Already up to date (v{version})."
   - If framework is newer: Continue to step 5
5. **Show changelog** — Read CHANGELOG.md from the framework and display entries between the installed version and the current version
6. **Classify changes**:
   - **Safe** (auto-apply): New or modified rules, commands, skills, scripts, templates
   - **Breaking** (prompt required): Renamed files, removed files, changed file structure, modified settings.local.json template
7. **Auto-apply safe changes** — Copy new/modified files without prompting
8. **Prompt for breaking changes** — For each breaking change, show the diff and ask:
   ```javascript
   {
     question: "Breaking change: {description}. Apply this update?",
     header: "Breaking",
     options: [
       { label: "Apply", description: "Update this file" },
       { label: "Skip", description: "Keep current version" }
     ],
     multiSelect: false
   }
   ```
9. **Update version stamp** — Write the new version to `.claude/framework-version`
10. **Never overwrite**: CONTEXT.md, REGISTRY.md (if customized), project-specific rules (tech-stack.md, domain-patterns.md), work items
11. **Report summary**:
    ```
    Updated from v{old} to v{new}:
    - Applied: {N} files
    - Skipped: {N} files (breaking, user chose to skip)
    - Preserved: CONTEXT.md, REGISTRY.md, project rules, work items
    ```

## `/setup context refresh` — Review and Update CONTEXT.md

Walk through CONTEXT.md section by section, confirming accuracy and updating what changed.

1. **Read CONTEXT.md** — Parse the current contents and `**Last Updated**:` date
2. **If no CONTEXT.md**: "No CONTEXT.md found. Run `/setup` first."
3. **Report staleness**: "CONTEXT.md was last reviewed {N} days ago ({date})."
4. **Walk through each major section** in order:
   - Tech Stack (Backend, Frontend, Infrastructure)
   - Project Structure
   - Key Patterns
   - Test Commands
   - Verify Steps
   - Design System
   - Environment Variables
   - Development Workflow
   - Team Members
   - Git Workflow
   - Work Provider
   - Doc Provider
   - Work Categories
5. **For each section**:
   - Show the current content (abbreviated if long)
   - Ask conversationally: "Is this still accurate, or does anything need updating?"
   - If the user says it's fine, move on
   - If the user provides updates, edit CONTEXT.md with the changes
   - Skip empty/placeholder sections with: "This section is empty — want to fill it in now, or skip?"
6. **Dependency file heuristic** (after section walkthrough):
   - Check for `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `Gemfile`, `pom.xml`, `*.csproj`
   - If found, compare key dependencies against what CONTEXT.md's Tech Stack sections claim
   - Report mismatches: "CONTEXT.md says React 18 but package.json has react@19.0.0"
   - Offer to update the mismatched entries
7. **Update `Last Updated` date** — Set to today's date. This date means "a human reviewed this holistically."
8. **Report**: "CONTEXT.md refreshed — {N} sections reviewed, {M} updated. Last Updated set to {today}."

## `/setup context check` — Staleness Report

Non-interactive check that reports CONTEXT.md health without modifying anything.

1. **Read CONTEXT.md** — Parse `**Last Updated**:` date
2. **If no CONTEXT.md**: "No CONTEXT.md found. Run `/setup` first."
3. **Calculate staleness**:
   - Days since `Last Updated`
   - Classify: Fresh (< 30 days), Aging (30-90 days), Stale (> 90 days)
4. **Dependency file comparison**:
   - Same heuristic as `/setup context refresh` step 6
   - Report mismatches without offering to fix
5. **Empty section scan**: List sections that are still placeholder/empty
6. **Display report**:
   ```
   CONTEXT.md Health Report

   Last reviewed: {date} ({N} days ago) — {Fresh|Aging|Stale}

   Dependency mismatches:
     - package.json: react 19.0.0 vs CONTEXT.md "React 18"
     - (none found)

   Empty sections: Design System, Environment Variables

   Recommendation: {action}
   ```
   - Fresh + no mismatches: "CONTEXT.md looks current. No action needed."
   - Aging or mismatches: "Run `/setup context refresh` to review and update."
   - Stale: "CONTEXT.md is {N} days old. Skill advice may be based on outdated information. Run `/setup context refresh` to update."

## Staleness Detection in Skills

Expert skills should check CONTEXT.md staleness at the start of a session (not on every invocation). The check is lightweight:

1. Read the `**Last Updated**:` field from CONTEXT.md
2. Calculate days since that date
3. **< 30 days**: No action (fresh)
4. **30-90 days**: Append a note after skill output: "Note: CONTEXT.md hasn't been updated in {N} days. Run `/setup context refresh` if your stack has changed."
5. **> 90 days**: Prepend a warning before skill output: "Warning: CONTEXT.md is {N} days old. Advice may be based on outdated stack information. Run `/setup context refresh` to update."

This check should run once per session, not on every skill invocation. Use `.claude/temp/staleness-checked` as a session flag — if it exists, skip the check.

## `/setup extend <domain>` — Scaffold Extension Skill

Scaffold a new domain extension skill from the extension template.

1. **Validate domain name** — Must be a valid skill name (lowercase, hyphens allowed, no spaces). Suggest the `expert-` prefix if not provided: "Use `expert-data` instead of `data`?"
2. **Check if skill already exists** — Look for `.claude/skills/<domain>/SKILL.md`. If found: "Skill `<domain>` already exists. Nothing to scaffold."
3. **Known extensions** — If the domain matches a known extension (data, mobile, compliance, ai, i18n), check for a pre-fill file at `.claude/templates/extensions/expert-<domain>.md`:

   | Domain | Skill Name | Pre-fill File |
   |--------|-----------|---------------|
   | data | `expert-data` | `.claude/templates/extensions/expert-data.md` |
   | mobile | `expert-mobile` | `.claude/templates/extensions/expert-mobile.md` |
   | compliance | `expert-compliance` | `.claude/templates/extensions/expert-compliance.md` |
   | ai | `expert-ai` | `.claude/templates/extensions/expert-ai.md` |
   | i18n | `expert-i18n` | `.claude/templates/extensions/expert-i18n.md` |

   a. **Read the pre-fill file** and parse its structured sections:
      - `## Metadata` → `{{SKILL_NAME}}`, `{{SKILL_ROLE}}`, `{{SKILL_DOMAIN}}`, `{{SKILL_DESCRIPTION}}`
      - `## Expertise` bullets → `{{EXPERTISE_1}}`, `{{EXPERTISE_2}}`, `{{EXPERTISE_3}}` (use first 3 bullets)
      - `## Principles` entries → `{{PRINCIPLE_N_NAME}}`, `{{PRINCIPLE_N_DESCRIPTION}}`
      - `## Guidelines` bullet → `{{GUIDELINE_3}}`
   b. **Fill the template** by replacing placeholders in `extension-skill.md.template` with parsed values

4. **Unknown extensions** — If the domain doesn't match a known extension (no pre-fill file found), copy the template with placeholder values and inform the user: "Created `.claude/skills/<domain>/SKILL.md` from template. Fill in the expertise and principles sections."
5. **Create skill directory and file** — Copy `.claude/templates/extension-skill.md.template` to `.claude/skills/<domain>/SKILL.md`, filling placeholders from pre-fill data (known) or leaving generic placeholders (unknown)
6. **Update REGISTRY.md** — Add the new skill to the Quick Reference table and Skill Categories (under a new "Domain Extensions" category if it doesn't exist)
7. **Auto-update collaboration matrix** — If a pre-fill file was used and it contains a `## Collaboration` section:
   a. Parse the collaboration table from the pre-fill file
   b. Add a new row for the extension skill in the REGISTRY.md collaboration matrix
   c. Update existing rows that the extension collaborates with (mark with `*` for strong collaboration)
   d. Report which collaboration entries were added
8. **Report**: For known domains: "Scaffolded `<domain>` extension skill from pre-fill data. Collaboration matrix updated. Review `.claude/skills/<domain>/SKILL.md` to customize."
   For unknown domains: "Scaffolded `<domain>` extension skill from template. Fill in the expertise and principles sections, then update the collaboration matrix in REGISTRY.md."

## `/setup remove` — Uninstall Framework

Cleanly remove the framework from a project while preserving project-specific content.

### Pre-flight

1. **Verify installation exists** — Check for `.claude/rules/roles-and-governance.md`
2. **If not found**: "No framework installation found. Nothing to remove."

### Removal Flow

1. **Read manifest** — Check for `.claude/framework-manifest.json`
   - If manifest exists: use it for precise file enumeration
   - If no manifest: fall back to pattern-matching against known framework files

2. **Inventory framework files** — Categorize everything:

   **Framework files (will be removed):**
   - `.claude/rules/` — All known framework rules: `roles-and-governance.md`, `consultation-first.md`, `artifact-first.md`, `user-interaction.md`, `file-organization.md`, `visual-workflow.md`, `voice-memo-workflow.md`, `work-system.md`, `documentation-standards.md`, `monitoring-observability.md`, `error-recovery.md`
   - `.claude/commands/` — All known framework commands: `work.md`, `commit.md`, `pr.md`, `review.md`, `simplify.md`, `verify.md`, `test.md`, `research.md`, `prototype.md`, `design-review.md`, `voice.md`, `sketch.md`, `cronitor.md`, `setup.md`, `release.md`, `artifacts.md`, `doc.md`, `patterns.md`
   - `.claude/skills/` — All known skill directories: `expert-architect/`, `expert-backend/`, `expert-frontend/`, `expert-ux/`, `expert-security/`, `expert-testing/`, `expert-devops/`, `expert-docs/`, `code-review/`, `research/`, `ideate/`, `prototype/`, `verify-app/`
   - `.claude/providers/` — All provider files: `provider.md`, `local.md`, `ado.md`, `github.md`
   - `.claude/scripts/statusline.js`
   - `.claude/settings.local.json`
   - `.claude/framework-version`
   - `.claude/framework-manifest.json`

   **Project-specific files (will be preserved):**
   - `.claude/skills/CONTEXT.md` — Always project-customized
   - `.claude/skills/REGISTRY.md` — May be customized
   - `.claude/rules/tech-stack.md` — Project-specific
   - `.claude/rules/domain-patterns.md` — Project-specific
   - `.claude/work/` — All work items, board, and archive
   - `.claude/artifacts/` — All artifacts including discovery
   - `.claude/memory/` — All decision records
   - `.claude/voice-inbox/` — Voice memo directory
   - `.claude/temp/` — Scratch work

   **Special handling:**
   - `CLAUDE.md` — Renamed to `CLAUDE.md.deprecated` with a note prepended:
     ```markdown
     <!-- Framework removed on YYYY-MM-DD. This file preserved because it may contain
          project-specific customizations. Safe to delete or rename back to CLAUDE.md. -->
     ```

3. **Handle `--keep-work` flag**:
   - Without flag: `.claude/work/` is included in preserved list (default — work items are always preserved)
   - With flag: Same behavior (work is always preserved). The flag exists for explicitness and documentation.

4. **Present removal plan**:
   ```
   Will remove:
     - {N} framework rules
     - {N} framework commands
     - {N} framework skills
     - {N} provider files
     - 1 script (statusline.js)
     - settings.local.json
     - framework-version

   Will rename:
     - CLAUDE.md → CLAUDE.md.deprecated

   Will preserve (project-specific):
     - CONTEXT.md
     - REGISTRY.md
     - tech-stack.md, domain-patterns.md
     - .claude/work/ ({N} items, {M} archived)
     - .claude/artifacts/
     - .claude/memory/

   Proceed?
   ```
   ```javascript
   {
     question: "Remove the framework? This deletes framework files but preserves your project content.",
     header: "Confirm",
     options: [
       { label: "Remove", description: "Delete framework files, preserve project content" },
       { label: "Cancel", description: "Keep everything as-is" }
     ],
     multiSelect: false
   }
   ```

5. **Execute removal** (after confirmation):
   - Delete each framework file/directory
   - Rename CLAUDE.md to CLAUDE.md.deprecated with deprecation note
   - Clean up empty directories (if `.claude/rules/` has only project rules left, keep it)

6. **Report**:
   ```
   Framework removed:
     - Deleted: {N} files across rules, commands, skills, providers, scripts
     - Renamed: CLAUDE.md → CLAUDE.md.deprecated
     - Preserved: CONTEXT.md, REGISTRY.md, work items, artifacts, memory

   To reinstall: Run /setup in this project from a WorkSpaceFramework session.
   ```

### Manifest During Installation

When `/setup` installs the framework (Step 5), write `.claude/framework-manifest.json`:

```json
{
  "version": "0.1.0",
  "installed": "2026-03-05",
  "files": [
    ".claude/rules/roles-and-governance.md",
    ".claude/rules/consultation-first.md",
    ...
  ]
}
```

This enables precise removal without pattern-matching. The manifest is maintained by `/setup` and `/setup update`.

## Important

- Projects get **self-contained copies** (not symlinks) for stability
- The framework source at `D:\WorkSpaceFramework` is the canonical version
- Version is derived from git tags (semver format: `vMAJOR.MINOR.PATCH`)
- Project-specific files (CONTEXT.md, custom rules, custom skills) are never overwritten by updates
- BOARD.md is generated (gitignored) — not touched by updates
- Work items are never touched by updates
