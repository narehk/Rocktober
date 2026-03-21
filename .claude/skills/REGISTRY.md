# Skill Registry

Central directory for all Claude Code skills in Rocktober.

**Purpose**: Enable skills to understand each other and delegate efficiently.

## Quick Reference

| Skill | Domain | Invoke |
|-------|--------|--------|
| `expert-architect` | System design, tech decisions | `/expert-architect` |
| `expert-backend` | API design, data layer | `/expert-backend` |
| `expert-frontend` | UI architecture, components | `/expert-frontend` |
| `expert-ux` | Usability, accessibility | `/expert-ux` |
| `expert-security` | Auth, OWASP, permissions | `/expert-security` |
| `expert-testing` | Test strategy, QA | `/expert-testing` |
| `expert-devops` | Deployment, CI/CD | `/expert-devops` |
| `expert-docs` | API docs, user guides | `/expert-docs` |
| `code-review` | Code quality review | `/review` |
| `research` | Fast codebase search (Haiku) | `/research` |
| `ideate` | Work item refinement | `/work refine` |
| `prototype` | Rapid UI prototyping | `/prototype` |
| `verify-app` | Full verification loop | `/verify` |

## Skill Philosophy

All skills teach pure methodology — zero tech stack baked in. Project-specific knowledge comes from `CONTEXT.md`.

## Collaboration Matrix

```
                    Backend  Frontend  Security  Testing  UX  Architect
expert-backend        -        .         *        *       .      *
expert-frontend       .        -         .        .       *      .
expert-security       *        .         -        *       .      *
expert-testing        *        .         *        -       .      .
expert-ux             .        *         .        .       -      .
expert-architect      *        .         *        .       .      -

Legend: * = frequently collaborates, . = occasionally collaborates
```

## Common Handoff Patterns

### API Endpoint
1. `expert-backend` → Route design
2. `expert-security` → Auth middleware
3. `expert-testing` → Test coverage
4. `code-review` → Quality check

### UI Feature
1. `expert-ux` → Usability requirements
2. `expert-frontend` → Implementation
3. `expert-testing` → Component tests
4. `code-review` → Quality check

### Architecture Decision
1. `expert-architect` → Options and trade-offs
2. Domain experts → Feasibility
3. `expert-docs` → Document decision

## Adding Project-Specific Skills

1. Create `.claude/skills/<skill-name>/SKILL.md`
2. Add entry to this REGISTRY.md
3. Update collaboration matrix
4. Reference `CONTEXT.md` in the skill

## Shared Context

All skills read `CONTEXT.md` for project-specific tech stack and patterns.
