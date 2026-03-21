# Documentation Standards

## Core Principle

**Document decisions, not just code.** Code shows *what* and *how*. Documentation captures *why*, *when*, and *for whom*.

## When Documentation Is Required

| Trigger | Doc Type | Location |
|---------|----------|----------|
| New API endpoint or contract change | API reference | Project documentation system (`docs/api/` locally) |
| Architecture or design decision | ADR (Architecture Decision Record) | Project documentation system (`.claude/memory/` locally) |
| New feature shipped | User-facing guide | Project documentation system (`docs/guides/` locally) |
| Non-obvious implementation | Implementation artifact | `.claude/artifacts/` (always local) |
| Onboarding-relevant change | README / getting started | Project documentation system (`docs/` locally) |
| Breaking change | Migration guide | Project documentation system |
| New shared pattern or convention | Standards doc | Project documentation system |

**"Project documentation system"** refers to the configured provider — ADO Wiki, GitHub docs, or local `docs/` depending on project setup. Implementation artifacts and scratch work always stay local.

## When Documentation Is NOT Required

- Typo fixes, formatting changes
- Dependency version bumps (unless breaking)
- Internal refactors that don't change behavior or interfaces
- One-line bug fixes with obvious cause

## Quality Criteria — Definition of "Done"

A document is complete when it meets these checks:

- [ ] **Audience identified** — Who is this for? (developer, user, operator, new team member)
- [ ] **Task-oriented** — Answers "how do I do X?" not just "what is X?"
- [ ] **Working examples** — Code samples that actually run, API calls that actually work
- [ ] **Current** — Reflects the actual state of the system, not a previous version
- [ ] **Findable** — In the right location per the table above, linked from relevant docs

## Review Cadence

### With Every PR

- Docs touched by a feature branch are reviewed as part of that PR
- New endpoints, workflows, or config changes must include doc updates in the same PR
- Reviewers check: "Would a new team member understand this change from the docs alone?"

### Quarterly

- Architecture docs reviewed for staleness (do they match reality?)
- README and getting started guides tested by walking through them
- Stale docs flagged for update or removal

## Documentation Types

### API Reference
- Every public endpoint: method, path, parameters, request/response examples, error codes
- Authentication requirements noted per endpoint
- Version/changelog for breaking changes

### Architecture Decision Records (ADRs)
- **Context**: Why was a decision needed?
- **Decision**: What was decided?
- **Decided by**: Who made the call?
- **Rationale**: Why this option over alternatives?
- **Alternatives considered**: What else was evaluated?

### User Guides
- Task-oriented: "How to set up X", "How to configure Y"
- Progressive disclosure: overview first, details on demand
- Screenshots or diagrams for visual steps

### Implementation Artifacts
- Transient, developer-specific notes
- Feature implementation summaries, design sketches, fix logs
- Stay in `.claude/artifacts/` — not promoted to project docs unless explicitly useful

## Anti-Patterns

**Documentation as afterthought**: Shipping features with "we'll document it later" (later never comes)

**Documenting the obvious**: Adding JSDoc to `getName()` that returns a name

**Write-only docs**: Creating docs that nobody reads because they're unfindable or untrusted

**Copy-paste docs**: Duplicating the same information in multiple places instead of linking

**Aspirational docs**: Documenting how the system *should* work rather than how it *does* work

## Documentation Routing

The `/doc` command is the primary tool for generating, publishing, and managing documentation. It routes to the configured doc provider (ADO Wiki, GitHub docs, or local `docs/`).

| Subcommand | What It Does |
|------------|-------------|
| `/doc generate <topic>` | Generate docs from codebase analysis (api, guides, adr, onboarding, migration) |
| `/doc publish <path>` | Push a local doc to the configured provider |
| `/doc list` | List documentation in the external system |
| `/doc sync` | Sync local `docs/` with external documentation |
| `/doc review [path]` | Review docs for staleness, accuracy, and completeness |
| `/doc import <ref>` | Pull an external doc to local |

When no Doc Provider is configured in CONTEXT.md, all operations default to the local `docs/` directory. See `.claude/commands/doc.md` for full details.

## Integration with Other Rules

- **artifact-first.md** — Artifacts created during shaping may graduate to permanent docs
- **file-organization.md** — Defines local directory structure for docs
- **work-system.md** — `docs` is a first-class work category
- **expert-docs skill** — Provides methodology for writing quality documentation
- **/doc command** — Routes documentation operations to the configured provider
