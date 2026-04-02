---
name: ado-work-management
description: Manage Azure DevOps work items for the South Bend organization. Use when creating, querying, updating, or linking work items, checking project status, or managing sprints and iterations. Covers the Digital Product Portfolio process template with freeze semantics, Gherkin requirements, and constraint escalation.
---

# Azure DevOps Work Item Management

You help manage work items in Azure DevOps for the **southbendin** organization. The primary project is **Digital - Product Portfolio** using the custom process template **Digital Product Portfolio - Electric Boogaloo**.

For complete state definitions and hierarchy details, see [REFERENCE.md](REFERENCE.md).

## Available MCP Tools

Use the Azure DevOps MCP tools for all operations. Key tools:

- **Query**: `wit_get_work_item`, `wit_get_work_items_batch_by_ids`, `wit_my_work_items`, `search_workitem`, `wit_get_query_results_by_id`
- **Create**: `wit_create_work_item`, `wit_add_child_work_items`
- **Update**: `wit_update_work_item`, `wit_update_work_items_batch`
- **Link**: `wit_work_items_link`, `wit_add_artifact_link`, `wit_link_work_item_to_pull_request`
- **Comments**: `wit_add_work_item_comment`, `wit_list_work_item_comments`
- **Iterations**: `work_list_iterations`, `work_list_team_iterations`, `wit_get_work_items_for_iteration`
- **Backlogs**: `wit_list_backlogs`, `wit_list_backlog_work_items`

Always use project name **"Digital - Product Portfolio"** unless the user specifies otherwise. The secondary project is **"Custom Applications - Product Portfolio"** (same process template).

## Work Item Hierarchy

```
Products (root)
+-- Discovery (pre-project research)
+-- Project (epic-level)
|   +-- Requirement (Gherkin, frozen on approval) ---> Planned Work (sibling)
|   |                                                   +-- Detail
|   |                                                   |   +-- Task
|   |                                                   |   +-- Constraint
|   |                                                   +-- Detail ...
|   +-- Change Order (Gherkin, frozen on approval) ---> Unplanned Work (sibling)
|                                                        +-- Detail -> Task / Constraint
+-- Request (post go-live asks)
+-- Issue (operational problems)
|   +-- Bug
|   +-- Task
+-- Maintenance (ongoing upkeep)
    +-- Task
```

**Epic is disabled.** Planned Work / Unplanned Work fill that backlog level.

## Parent-Child Rules

When creating work items, enforce these parent-child relationships:

| Child Type | Valid Parent Types |
|---|---|
| Discovery, Project, Request, Issue, Maintenance | Products |
| Requirement, Change Order | Project |
| Planned Work, Unplanned Work | Project (as siblings of their Requirement/Change Order) |
| Detail | Planned Work or Unplanned Work |
| Task | Detail, Maintenance, or Issue |
| Constraint | Detail |
| Bug | Issue |

## State Casing (Critical)

State names have inconsistent casing. Use exactly:
- **"To Do"** (capital D): Task, Bug, Issue
- **"To do"** (lowercase d): Planned Work, Unplanned Work, Detail, Constraint, Requirement, Change Order

Getting this wrong causes API errors.

## Required Fields

### Task Transitions
- `Microsoft.VSTS.Scheduling.RemainingWork` - must be set (use `0` on completion)
- `Microsoft.VSTS.Scheduling.DueDate` - must be set (use today's date if completing retroactively)

Missing these fields causes `TF401320: Rule Error`.

### Gherkin Fields (Requirement and Change Order only)
These types have 4 custom fields for acceptance criteria:
- `Custom.Scenario` - Numbered scenario names
- `Custom.Given` - Numbered preconditions
- `Custom.When` - Numbered actions/triggers
- `Custom.Then` - Numbered expected outcomes

Format: Numbered entries (1, 2, 3...) with "And" clauses appended with semicolons.

## Key Semantic Rules

### Freeze Semantics
Requirements and Change Orders **freeze on Approved state**:
- Content becomes immutable (preserves original scope record)
- A mutable execution copy is auto-created: Requirement -> Planned Work, Change Order -> Unplanned Work
- Execution copies are **siblings under the same Project** (not children of the frozen item)
- Linked via **"Duplicate Of"** relation type for traceability
- All development work happens on the execution copy, never the frozen original

### Constraint Escalation
- Constraints attach to Detail items during development
- **During development, defects are Constraints** (not Bugs)
- Critical/High severity constraints escalate to parent Planned Work / Unplanned Work
- Escalation creates a Predecessor link (PW/UW blocked-by Constraint)

### Bug vs Constraint
- **Constraint** = development-phase defect or blocker (lives under Detail)
- **Bug** = post-development production defect (lives under Issue)

### Request Routing
- Post go-live requests land under Products
- Active originating project -> becomes Change Order under that Project
- Completed originating project -> becomes new Project

## Relation Types

Use these display names when linking:
| Display Name | Use For |
|---|---|
| "Parent" / "Child" | Hierarchy links |
| "Predecessor" / "Successor" | Dependency/blocking |
| "Related" | General association |
| "Duplicate Of" / "Duplicate" | Frozen spec to execution copy traceability |

## Typical Workflows

### Creating a Task under an existing Detail
1. Get the Detail work item ID from the user
2. Create Task with parent link to that Detail
3. Set RemainingWork and DueDate fields
4. Default state: "To Do"

### Querying work items
- Use `wit_my_work_items` for the current user's assignments
- Use `search_workitem` for text-based searches
- Use `wit_get_work_items_for_iteration` for sprint-scoped queries
- Use `wit_get_query_results_by_id` for saved queries

### Moving items through states
1. Get current state with `wit_get_work_item`
2. Update state with `wit_update_work_item` using the correct casing
3. For Tasks going to Done: set RemainingWork=0 and DueDate

### Creating a full work breakdown
1. Create Details under Planned Work (one per Gherkin scenario)
2. Create Tasks under each Detail
3. Set required fields on Tasks (RemainingWork, DueDate)

## Response Format

When showing work items to the user, format clearly:
- Include ID, Type, Title, State, and Assigned To
- Group by type or state when showing lists
- Highlight blocked items or items needing attention
- Note any missing required fields
