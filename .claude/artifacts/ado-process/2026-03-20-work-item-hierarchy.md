# ADO Work Item Hierarchy — Digital Product Portfolio

**Date**: 2026-03-20
**Process Template**: Digital Product Portfolio - Electric Boogaloo
**Status**: Approved

## Hierarchy Diagram

```mermaid
graph TD
    PRODUCT["Product"]
    DISCOVERY["Discovery<br/><i>Pre-project research</i>"]
    PROJECT["Project<br/><i>Informed by Discovery</i>"]
    REQUIREMENT["Requirement<br/><i>Gherkin — frozen on approval</i>"]
    CHANGE_ORDER["Change Order<br/><i>Frozen on approval</i>"]
    PLANNED["Planned Work<br/><i>Mutable copy of Requirement</i>"]
    UNPLANNED["Unplanned Work<br/><i>Mutable copy of Change Order</i>"]
    DETAIL["Detail"]
    TASK_E["Task"]
    CONSTRAINT["Constraint<br/><i>Includes dev defects<br/>Can escalate upward</i>"]
    REQUEST["Request<br/><i>Post go-live asks</i>"]
    ISSUE["Issue<br/><i>Operational problem</i>"]
    ISSUE_BUG["Bug"]
    ISSUE_TASK["Task"]
    MAINTENANCE["Maintenance<br/><i>Ongoing upkeep</i>"]
    MAINT_TASK["Task"]

    PRODUCT --> DISCOVERY
    DISCOVERY -->|"informs"| PROJECT
    PRODUCT --> PROJECT
    PRODUCT --> REQUEST
    PRODUCT --> ISSUE
    PRODUCT --> MAINTENANCE

    REQUEST -.->|"out of scope /<br/>project complete"| PROJECT
    REQUEST -.->|"in scope of<br/>active project"| CHANGE_ORDER

    PROJECT --> REQUIREMENT
    PROJECT --> CHANGE_ORDER
    PROJECT -.->|"after completion"| MAINTENANCE

    REQUIREMENT -->|"approved & frozen"| PLANNED
    CHANGE_ORDER -->|"approved & frozen"| UNPLANNED

    PLANNED --> DETAIL
    UNPLANNED --> DETAIL

    DETAIL --> TASK_E
    CONSTRAINT ---|"attached to"| DETAIL
    CONSTRAINT -.->|"severe: escalates"| PLANNED
    CONSTRAINT -.->|"severe: escalates"| UNPLANNED

    ISSUE --> ISSUE_BUG
    ISSUE --> ISSUE_TASK

    MAINTENANCE --> MAINT_TASK
```

## Work Item Types — Summary

### Portfolio & Planning

| Type | Purpose | Parent | Frozen? |
|------|---------|--------|---------|
| **Product** | Highest bucket. Holds Projects, Requests, Issues, Maintenance | — | No |
| **Discovery** | Pre-project research & intake. Informs Project creation | Product | No |
| **Project** (*Epic) | Spans days/weeks. Summary informed by Discovery | Product | No |
| **Requirement** | Gherkin scenarios. Derived from Discovery + Project context. Scoped before work starts | Project | Yes — frozen on approval |
| **Change Order** | Scope changes mid-project | Project | Yes — frozen on approval |

### Execution

| Type | Purpose | Parent | Notes |
|------|---------|--------|-------|
| **Planned Work** | Mutable execution copy of a frozen Requirement. Lives in Org Unit bucket | Requirement | Created after scope approval |
| **Unplanned Work** | Mutable execution copy of a frozen Change Order. Same structure as Planned Work | Change Order | Tracks un-scoped work |
| **Detail** (*Feature) | High-level breakdown of work | Planned/Unplanned Work | |
| **Task** | Lowest level. Measurable implementation bites (hours) | Detail | |
| **Constraint** | Inevitable issues during development, including defects found during dev. Can impact multiple items. Escalates upward if severe | Detail (attached) | Can escalate to Planned/Unplanned Work |

### Post-Development / Operational

| Type | Purpose | Parent | Notes |
|------|---------|--------|-------|
| **Request** | Feature/report requests from users after go-live | Product | Can become a new Project (out of scope) or Change Order (in scope of active project) |
| **Issue** | Unplanned operational problems. Should have an end date | Product | |
| **Bug** | Unforeseen defects in production | Issue | Post-development only |
| **Task** | Operational implementation work | Issue or Maintenance | |
| **Maintenance** | Ongoing upkeep from completed Projects | Product | If a bug surfaces, it becomes an Issue |

## Key Rules

1. **Gherkin acceptance criteria** on Requirements and Change Orders
2. **Freeze on approval** — Requirements and Change Orders are immutable once approved, preserving original scope record
3. **Planned/Unplanned Work are the mutable copies** — Constraints affect these, never the frozen originals
4. **Constraints escalate** — a severe Constraint can change the status of its parent Planned/Unplanned Work
5. **Bugs only exist in operational contexts** — during development, defects are Constraints
6. **Maintenance surfaces bugs as Issues** — clean separation between proactive upkeep and reactive problems
7. **Requests route to Projects or Change Orders** — depending on whether the originating project is complete or active

## Framework Changes Required

### CONTEXT.md
- [ ] Fix wiki name typo: `Digital---Product-Portfolio.wiki` → `Digital---Project-Portfolio.wiki`
- [ ] Expand Type → State Mappings to cover all work item types (currently only Task and Requirement are mapped)
- [ ] Add Work Item Hierarchy section documenting the full type tree and parent-child relationships

### ado.md Provider
- [ ] Update keyword detection to map to correct hierarchy levels (not just flat type detection)
- [ ] Add parent-child linking on creation (e.g., Detail under Planned Work, Task under Detail)
- [ ] Add Gherkin format enforcement for Requirements and Change Orders
- [ ] Add freeze/approval semantics — prevent edits to approved Requirements and Change Orders
- [ ] Add Planned Work creation workflow (copy of approved Requirement into Org Unit bucket)
- [ ] Add Constraint escalation logic (severe Constraints change parent Planned/Unplanned Work status)

### work.md Command
- [ ] `/work add` needs hierarchy awareness — what type are we creating and where does it attach?
- [ ] `/work refine` should produce Gherkin scenarios (Given/When/Then) for Requirements and Change Orders
- [ ] `/work ready` (or new `/work approve`) should trigger freeze + Planned Work copy creation
- [ ] Constraint handling — `/work block` or new subcommand for attaching Constraints to Details

### Local Work Item Files
- [ ] Acceptance criteria format: Gherkin for Requirements/Change Orders, checklists for Details/Tasks
- [ ] Add `Frozen` field for Requirements/Change Orders (set on approval)
- [ ] Track parent-child relationships in item metadata (ADO parent ID + local parent W-NNN)

### Wiki Documentation
- [ ] Update `How-We-Use-DevOps.md` with new diagram (replaces outdated PDF)
- [ ] Add type-level documentation for Change Orders, Constraints, Discovery (not currently in wiki)
