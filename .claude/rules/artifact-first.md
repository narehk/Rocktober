# Artifact-First Rule

## Core Principle

**Show me before you build.**

Any user-visible change, architectural decision, or non-trivial work requires an artifact BEFORE implementation begins. The artifact is reviewed and approved before code gets written.

## Why This Matters

For a visual/auditory learner:
- Seeing a mockup is worth a thousand words of description
- Reviewing a plan catches mistakes before they're expensive to fix
- Artifacts create a shared understanding that prevents misalignment
- The review step ensures the "no surprises" principle is maintained

## What Qualifies as an Artifact

| Change Type | Artifact Type | Format |
|-------------|---------------|--------|
| UI change (layout, component, page) | Visual mockup | HTML prototype, pencil.dev sketch, or ASCII mockup |
| Architecture decision | Design document | Markdown with Mermaid diagrams |
| API design | API spec | Endpoint table + request/response examples |
| Data model change | Schema diagram | Mermaid ER diagram + field descriptions |
| Workflow change | Flow diagram | Mermaid flowchart or sequence diagram |
| Multi-step feature | Implementation plan | Numbered steps with scope per step |
| State management | State diagram | Mermaid state diagram + transition table |

## The Artifact Lifecycle

```
Create → Present → Review → Approve/Change/Reject → Implement
```

1. **Create**: Claude produces the artifact based on discussion
2. **Present**: Claude shows the artifact with key decisions highlighted
3. **Review**: You examine it, ask questions, request changes
4. **Decide**: Approve (proceed), Change (iterate on artifact), or Reject (start over)
5. **Implement**: Only after approval, begin writing code

### Iteration is Expected

Most artifacts go through 1-3 rounds of revision. This is normal and desired — it's cheaper to iterate on a mockup than on code.

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

## Exceptions — When Artifacts Are NOT Required

- **Bug fixes**: Direct fixes to clear bugs (describe the fix, get approval, implement)
- **Slash command execution**: `/commit`, `/test`, `/verify` — the command IS the intent
- **Documentation corrections**: Fixing typos, updating outdated docs
- **Trivial changes**: As defined in `roles-and-governance.md` escalation protocol
- **Explicit skip**: You say "just do it" or "skip the artifact"

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
For UI artifacts, pencil.dev is the preferred tool when available. Claude reads design system tokens from pencil.dev and creates visual artifacts that match the project's design language.

### Mermaid Diagrams
For non-visual artifacts (architecture, data flow, state machines), use Mermaid in markdown. Claude should default to diagrams over walls of text.

### HTML Prototypes (via `/prototype`)
For interactive UI concepts, generate a running HTML/React prototype that can be viewed in the browser.

## Examples

### Good: Artifact Before Implementation

**You**: "Add a settings page to the app"

**Claude**: "Here's a proposed layout for the settings page:

[Shows mockup with sections: Profile, Notifications, Appearance, Integrations]

Key decisions:
- Tab navigation vs single scroll (I chose tabs for cleaner organization)
- Profile section includes avatar upload
- Dark mode toggle in Appearance

Should I proceed with this layout, or would you like changes?"

### Bad: Implementation Without Artifact

**You**: "Add a settings page to the app"

**Claude**: *[immediately starts writing Settings.jsx]*

### Good: Iterating on Artifact

**You**: "I like the tabs but move Notifications to the top — that's what users change most"

**Claude**: "Updated layout with Notifications as the first tab:

[Shows revised mockup]

Better?"

## Anti-Patterns

**Artifact as afterthought**: Building first, documenting after
"Here's the settings page I built. Here's the artifact describing it." (backwards)

**Over-artifacting**: Creating artifacts for trivial work
"Before I fix this typo, let me create a mockup..." (just fix it)

**Artifact without decision points**: Presenting a wall of text with no clear questions
Show what matters. Highlight decisions. Ask specific questions.

**Stale artifacts**: Implementing something different from what was approved
If the implementation diverges from the artifact, update the artifact and get re-approval.
