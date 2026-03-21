# Project Context

Shared technical context for all Rocktober skills.

**Last Updated**: 2026-03-19
**Framework Version**: v0.1.0

## Tech Stack

### Backend
| Component | Technology | Notes |
|-----------|------------|-------|
| Data Store | JSON files in git repo | Git history = audit trail. Files under `competitions/` |
| API Proxy | Cloudflare Worker (free tier) | Proxies Spotify API to hide credentials. Handles submissions via GitHub API |
| Scheduling | GitHub Actions (cron) | Theme reveal, ballot open, vote tally, winner announcement |
| Auth | GitHub OAuth / invite codes | GitHub OAuth natural for Pages; invite codes for non-GitHub users |

### Frontend
| Component | Technology | Notes |
|-----------|------------|-------|
| Framework | None — pure vanilla HTML/CSS/JS | Zero dependencies, zero build step |
| Styling | Hand-crafted CSS | 80s arcade + hair metal aesthetic: CRT scanlines, neon glow, pixel fonts, chrome text |
| Music Search | Spotify Web API (client credentials) | Proxied through Cloudflare Worker |
| Comments | GitHub Discussions/Issues API | Loaded client-side, rendered in 80s UI |

### Infrastructure
| Component | Technology | Notes |
|-----------|------------|-------|
| Hosting | GitHub Pages | Free, static site served from repo |
| CI/CD | GitHub Actions | Cron jobs for competition lifecycle + Pages deploy |
| CDN | GitHub Pages built-in | |
| Notifications | Teams Incoming Webhooks | Extensible provider pattern for future Slack/Google Chat |

## Project Structure

```
Rocktober/
├── index.html                    # Main app entry
├── css/
│   └── styles.css                # 80s arcade aesthetic
├── js/
│   └── app.js                    # Vanilla JS app logic
├── competitions/
│   └── <slug>/
│       ├── config.json           # Competition settings, members, schedule
│       ├── rounds/
│       │   ├── day-01.json       # Theme, submissions, votes, winner
│       │   └── ...
│       └── leaderboard.json      # Computed standings
├── .github/
│   └── workflows/
│       ├── theme-reveal.yml      # Morning: reveal today's theme
│       ├── ballot-open.yml       # 3pm: open voting
│       └── tally-winner.yml      # 4:30pm: tally votes, announce winner
├── worker/
│   ├── index.js                  # Cloudflare Worker entry
│   └── wrangler.toml             # Worker config
└── docs/
```

## Key Patterns

- **Git-as-database**: All app state stored as JSON files in the repo. GitHub Actions commit state changes. Git history provides audit trail.
- **Static-first**: Frontend reads JSON files directly via fetch. No server-side rendering.
- **Worker proxy**: Single Cloudflare Worker handles Spotify API calls (hides credentials) and writes submissions back to repo via GitHub API.
- **Provider pattern**: Notifications use an extensible provider interface — Teams first, Slack/Google Chat later.
- **Phase-driven UI**: Each round has phases (submission → voting → results). UI renders based on current phase determined by timestamps in round JSON.

## Test Commands

| Suite | Command | Description |
|-------|---------|-------------|
| JSON Schema | `node tests/validate-schemas.js` | Validate competition JSON against schemas |
| HTML | Open `index.html` in browser | Manual visual check (no build step) |
| Worker | `wrangler dev` | Local Cloudflare Worker testing |

## Verify Steps

| Step | Command | Mode |
|------|---------|------|
| HTML valid | W3C validator (manual or CI) | lint |
| JSON valid | `node tests/validate-schemas.js` | test |
| Links work | Manual or htmlproofer | lint |
| Worker responds | `curl localhost:8787/health` | health |

## Design System

- **Aesthetic**: 80s arcade cabinet meets hair metal concert poster
- **Fonts**: Pixel font for headings (e.g., Press Start 2P), readable sans-serif for body
- **Colors**: Neon pink, electric blue, chrome/silver, hot magenta, black backgrounds
- **Effects**: CRT scanlines, neon text-shadow glow, gradient chrome text, grid lines
- **Animations**: Subtle flicker, glow pulse on hover, retro transitions

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `SPOTIFY_CLIENT_ID` | Cloudflare Worker secrets | Spotify API authentication |
| `SPOTIFY_CLIENT_SECRET` | Cloudflare Worker secrets | Spotify API authentication |
| `GITHUB_TOKEN` | GitHub Actions secrets | Commit JSON changes back to repo |
| `TEAMS_WEBHOOK_URL` | GitHub Actions secrets | Send notifications to Teams channel |

## Development Workflow

1. Edit HTML/CSS/JS directly — no build step
2. Open `index.html` in browser to preview (or use Live Server extension)
3. Competition data lives in `competitions/` as JSON
4. Cloudflare Worker developed separately in `worker/` with `wrangler dev`
5. GitHub Actions handle the automated competition lifecycle

## Team Members

<!-- Solo project for now. Add team members here when others join. -->

## Git Workflow

- **Branch naming**: `<type>/<W-NNN>-<slug>` (e.g., `feat/W-001-scaffolding`, `fix/W-005-vote-tally`)
- **Types**: feat, fix, chore, docs, refactor, test
- **Base branch**: main
- **Merge strategy**: squash
- **Protected branches**: main

## Work Provider

- **Provider**: ado
- **Organization**: https://dev.azure.com/southbendin
- **Project**: Digital - Product Portfolio
- **Process Template**: Digital Product Portfolio - Electric Boogaloo
- **CLI**: az boards (requires az CLI + azure-devops extension)

#### Work Item Hierarchy

See `.claude/artifacts/ado-process/2026-03-20-work-item-hierarchy.md` for the full diagram.

```
Product
├── Discovery (pre-project research)
├── Project (informed by Discovery)
│   ├── Requirement (Gherkin — frozen on approval) → Planned Work
│   │   └── Detail → Task
│   └── Change Order (frozen on approval) → Unplanned Work
│       └── Detail → Task
├── Request (post go-live feature/report asks)
├── Issue (operational problems) → Bug, Task
└── Maintenance (ongoing upkeep) → Task
```

#### Parent-Child Type Validation

| Child Type | Valid Parent Types | Auto-Created? | Gherkin Required? |
|------------|-------------------|---------------|-------------------|
| Products | (root) | No | No |
| Discovery | Products | No | No |
| Project | Products | No | No |
| Requirement | Project | No | Yes |
| Change Order | Project | No | Yes |
| Planned Work | Project (sibling of Requirement, linked via "Duplicate Of") | Yes — on approval | No |
| Unplanned Work | Project (sibling of Change Order, linked via "Duplicate Of") | Yes — on approval | No |
| Detail | Planned Work, Unplanned Work | No | No |
| Task | Detail, Maintenance, Issue | No | No |
| Constraint | Detail | No | No |
| Request | Products | No | No |
| Issue | Products | No | No |
| Maintenance | Products | No | No |
| Bug | Issue | No | No |

#### Acceptance Criteria Format

| Type | Format | Enforced At |
|------|--------|-------------|
| Requirement | Gherkin (Given/When/Then) | `/work refine`, `/work ready` |
| Change Order | Gherkin (Given/When/Then) | `/work refine`, `/work ready` |
| All others | Checklist (- [ ] ...) | `/work ready` |

#### ADO Gherkin Field References

Requirements and Change Orders have dedicated Gherkin fields in ADO (custom fields on the process template). These must be populated in ADO whenever Gherkin acceptance criteria are written locally.

| ADO Field Reference | Display Name | Content |
|---------------------|-------------|---------|
| `Custom.Scenario` | Scenario / Use Case | Numbered scenario names |
| `Custom.Given` | Given / Assumptions | Numbered preconditions (one per scenario) |
| `Custom.When` | When / Actions | Numbered actions/triggers (one per scenario) |
| `Custom.Then` | Then / Expected Results | Numbered expected outcomes (one per scenario) |

**Format**: Each field contains numbered entries (one per scenario) so Given/When/Then entries correlate by number. "And" clauses are appended with semicolons within the numbered entry.

#### Freeze Semantics

Requirements and Change Orders are **frozen on approval** (ADO state: Approved). Once frozen:
- Content is immutable — preserves the original scope record
- A mutable execution copy is created: Requirement → Planned Work, Change Order → Unplanned Work
- Edits happen on the execution copy, never the frozen original

#### Type → State Mappings

> *Lifecycle gates (status prerequisites, decomposition checks, review artifact requirements) are enforced by `work.md`. See `work-system.md` "Lifecycle Gates" for the prerequisite matrix and `--force` override semantics.*

##### Requirement

| Our Stage | ADO State |
|-----------|-----------|
| Captured | To Do |
| Shaping | Scoping |
| Signing | Signing |
| Ready (Frozen) | Approved |

*Each state transition is explicit — pause at each step for audit trail. Requirements freeze on Approved. Execution happens on Planned Work, not the Requirement itself.*

##### Planned Work

| Our Stage | ADO State |
|-----------|-----------|
| Ready | To do |
| In Progress | In Progress |
| In Review | Testing |
| Done | Completed |

*Auto-created from approved Requirement. Starts at Ready.*

##### Discovery

| Our Stage | ADO State |
|-----------|-----------|
| Captured | Scoping |
| Shaping | Scoping |
| Ready | Viable |
| Done | Viable |
| Skipped | Not Viable |

##### Change Order

| Our Stage | ADO State |
|-----------|-----------|
| Captured | To do |
| Shaping | Viable |
| Ready (Frozen) | Approved |

*Freeze on Approved, same as Requirements. Fewer states — no Signing step.*

##### Constraint

| Our Stage | ADO State |
|-----------|-----------|
| Captured | To do |
| In Progress | Investigating |
| Done | Solution Found |
| Skipped | Closed - Will Not Fix |

*Attaches to Details during development. Can escalate upward to Planned/Unplanned Work if severe.*

##### Detail

| Our Stage | ADO State |
|-----------|-----------|
| Captured | To do |
| Shaping | Planning |
| In Progress | Developing |
| Done | Completed |
| Skipped | Canceled |

##### Task (default for `/work add`)

| Our Stage | ADO State |
|-----------|-----------|
| Captured | To Do |
| In Progress | Doing |
| In Review | Testing |
| Done | Done |

##### Bug

| Our Stage | ADO State |
|-----------|-----------|
| Captured | To Do |
| Done | Done |
| Skipped | Closed - Will Not Fix |

*Post-development only — during dev, defects are Constraints.*

##### Issue

| Our Stage | ADO State |
|-----------|-----------|
| Captured | To Do |
| In Progress | Developing |
| Done | Completed |
| Skipped | Canceled |

##### Request

| Our Stage | ADO State |
|-----------|-----------|
| Captured | Requested |
| Shaping | Vetting |
| In Progress | In Progress |
| Done | Completed |
| Skipped | Not Viable |

*Post go-live. Can become a new Project (out of scope) or Change Order (active project).*

##### Maintenance

| Our Stage | ADO State |
|-----------|-----------|
| Shaping | Scoping |
| In Progress | Operational |
| Done | Dormant |

*Ongoing upkeep. Tasks only — if a bug surfaces, it becomes an Issue.*

## Doc Provider

- **Provider**: ado
- **Target**: Digital-Proving-Ground (code wiki, per-Product)
- **Auto-route**: false
- **Doc Types**: api, guides, adrs, onboarding

### Wiki Types

| Type | Name | Purpose | Created By |
|------|------|---------|-----------|
| **Project Wiki** | `Digital---Project-Portfolio.wiki` | Shared org-level docs for the ADO project | Auto-created by ADO (one per project) |
| **Product Wiki** (code wiki) | `Digital-Proving-Ground` | Per-Product documentation — wiki for the "Digital Proving Ground" Products item | Created via `az devops wiki create --type codewiki` |

**Important**: Product documentation (reviews, architecture, guides) goes in the **Product wiki** (code wiki), NOT the project wiki. Each Product gets its own code wiki — a separate entry in the ADO wiki dropdown.

### Wiki Structure Convention

Each ADO **Products** item gets one code wiki. All Projects under that Product contribute to the same wiki. ADO org-level search works across all Product wikis.

```
{Product-Wiki}/
├── Framework/                    # Framework rules & lifecycle docs
│   ├── Lifecycle-Gates           # Valid transitions, --force semantics
│   ├── Work-Decomposition        # Detail/Task breakdown process
│   └── ADO-Audit-Trail           # Comment protocol, quiz sync
├── {Project}/                    # Project-specific docs
│   ├── Reviews/                  # Quiz artifacts linked to work items
│   │   ├── W-NNN-acceptance-quiz
│   │   └── W-NNN-author-quiz
│   ├── Architecture/
│   └── Guides/
└── ...
```

- **Product wiki name convention**: `{Product-Name}.wiki` (hyphens replace spaces)
- **Project docs path**: `/{Project}/...`
- **Review artifacts path**: `/{Project}/Reviews/W-NNN-{quiz-type}`
- **Framework docs path**: `/Framework/...`

## Work Categories

- ui — User interface and visual design
- backend — Server-side logic, APIs, data layer
- infrastructure — Build, deploy, CI/CD, GitHub Actions
- performance — Speed, optimization, caching
- security — Auth, permissions, credential management
- docs — Documentation and developer experience

## Current Status

Active Development — building v1 features, proving out WorkSpaceFramework capabilities
