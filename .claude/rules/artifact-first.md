# Artifact-First Rule

## Core Principle

**Artifacts build context, not gates.**

During discovery, artifacts give the human something concrete to react to — mockups, process maps, architecture diagrams. During build, artifacts document what was built. During review, artifacts capture feedback.

Artifacts are no longer approval gates that block implementation. They are communication tools that accelerate understanding.

## Why This Matters

For a visual/auditory learner:
- Seeing a mockup is worth a thousand words of description
- Process maps reveal complexity that prose hides
- Visual artifacts create shared understanding faster than text descriptions
- Feedback on concrete artifacts is higher quality than feedback on abstractions

## Artifact Role Per Phase

| Phase | Artifact Purpose | Approval Required? |
|-------|-----------------|-------------------|
| **Discovery** | Build context mass — give the human something to react to | Feedback shapes direction, not formal approval per artifact |
| **Build** | Document decisions and implementation — reference material | No — Claude creates as needed without gates |
| **Review** | Capture change orders and feedback | No — artifacts record what was discussed |

## Discovery Phase Artifacts

During discovery, Claude creates visual artifacts to accumulate context mass:

### UI Projects — pencil.dev

Use pencil.dev (via `/sketch` or direct MCP tools) to create:
- **UI mockups** showing proposed layouts, components, interactions
- **Design system tokens** (colors, typography, spacing) that carry into the build
- **Screen flows** showing navigation and user journeys

### All Projects — Process Maps

Use Mermaid diagrams to create:
- **Technical process maps** showing system interactions and data flow
- **Workflow diagrams** showing user journeys and decision points
- **Architecture maps** showing component relationships
- **State diagrams** for complex lifecycle management

### Discovery Artifact Workflow

```
Claude creates artifact → Human reacts → Claude refines → Context accumulates
```

This is collaborative and iterative, but it's NOT a formal approval gate. The human's feedback shapes the direction. When enough context exists, Claude proposes readiness to build.

## What Qualifies as an Artifact

| Change Type | Artifact Type | Format |
|-------------|---------------|--------|
| UI change (layout, component, page) | Visual mockup | pencil.dev sketch or HTML prototype |
| Architecture decision | Process/architecture map | Mermaid diagram |
| API design | API spec | Endpoint table + request/response examples |
| Data model change | Schema diagram | Mermaid ER diagram + field descriptions |
| Workflow change | Flow diagram | Mermaid flowchart or sequence diagram |
| Multi-step feature | Process map | Mermaid flowchart with decision points |
| State management | State diagram | Mermaid state diagram + transition table |

## Build Phase Artifacts

During build, Claude creates artifacts as documentation — NOT as approval gates:

- Implementation notes in work items
- Architecture decisions recorded as they're made
- Constraint documentation (ADO Constraint items)
- Scope drift log

These artifacts serve the review phase — the human can trace what was built and why.

## Artifact Storage

Artifacts are stored in `.claude/artifacts/` organized by feature or topic:

```
.claude/artifacts/
├── auth/
│   └── 2026-02-22-login-flow.md
├── dashboard/
│   └── 2026-02-22-layout-mockup.md
└── api/
    └── 2026-02-22-endpoints-v2.md
```

Naming: `YYYY-MM-DD-<slug>.md`

## Artifact Registry

Artifacts can be tracked via `.meta.json` sidecar files for querying and analysis. When creating an artifact in `.claude/artifacts/`, produce a companion metadata file alongside it:

```
.claude/artifacts/auth/
├── 2026-02-15-auth-flow.md
└── 2026-02-15-auth-flow.meta.json
```

The `.meta.json` contains structured metadata: type, associated work item, creation date, source command, status, tags, and a one-line summary. See `/artifacts` command for the full schema and integration contract.

**When to create metadata**: Any artifact that should be queryable or aggregated — design artifacts, review results, implementation notes. Ephemeral scratch work in `.claude/temp/` does not need metadata.

**Browsing artifacts**: Run `/artifacts list` to query by type, work item, or date. Run `/artifacts index` to generate a browsable `INDEX.md`.

## Integration with Tools

### pencil.dev (via `/sketch`)
For UI artifacts, pencil.dev is the primary tool. Claude reads design system tokens from pencil.dev and creates visual artifacts that match the project's design language. **Mandatory for UI projects during discovery.**

### Mermaid Diagrams
For process maps, architecture, data flow, and state machines. **Mandatory for all projects during discovery.** Claude should default to diagrams over walls of text.

### HTML Prototypes (via `/prototype`)
For interactive UI concepts, generate a running HTML/React prototype that can be viewed in the browser.

## When Artifacts Are NOT Required

- **Bug fixes**: Direct fixes to clear bugs
- **Slash command execution**: `/commit`, `/test`, `/verify` — the command IS the intent
- **Documentation corrections**: Fixing typos, updating outdated docs
- **Build phase implementation**: Claude builds without creating approval artifacts
- **Trivial changes**: Single-line fixes, formatting

## Anti-Patterns

**Artifact as approval gate during build**
During build phase, Claude does NOT create artifacts for approval. Build autonomy means building.

**Over-artifacting during discovery**
Create artifacts that build understanding. Don't create artifacts for their own sake.

**Artifact without decision points during discovery**
Show what matters. Highlight design choices. Give the human something specific to react to.

**Stale artifacts**
If the build diverges from discovery artifacts, that's scope drift — document it in the drift summary, not by updating old artifacts.

**Skipping visual artifacts during discovery**
Discovery without visuals is just a text conversation. Use pencil.dev and Mermaid to make ideas concrete.

## Integration with Other Rules

- **rapid-cycle.md** — Defines how artifacts function per phase
- **visual-workflow.md** — pencil.dev for UI, Mermaid for process maps — both mandatory during discovery
- **consultation-first.md** — Discovery artifacts support the consultation process
- **roles-and-governance.md** — Artifacts help the architect make informed decisions during discovery
