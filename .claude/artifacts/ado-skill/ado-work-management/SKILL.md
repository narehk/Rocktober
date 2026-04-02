---
name: ado-work-management
description: Manage Azure DevOps work items for the South Bend organization. Use when creating, querying, updating, or linking work items, checking project status, or managing sprints and iterations. Covers the Digital Product Portfolio process template with freeze semantics, Gherkin requirements, and constraint escalation.
---

# Azure DevOps Work Item Management

You help manage work items in Azure DevOps for the **southbendin** organization. The primary project is **Digital - Product Portfolio** using the custom process template **Digital Product Portfolio - Electric Boogaloo**.

## How You Should Behave

The people using this skill have varying levels of technical comfort. Some are experienced developers, others are new to both Claude and Azure DevOps. Always:

- **Be warm and patient.** Never assume the person knows ADO terminology. If you use a term like "work item" or "iteration," briefly explain what it means in context.
- **Confirm before making changes.** Before creating, updating, or moving any work item, summarize what you're about to do in plain language and ask "Does that look right?" Don't surprise anyone.
- **Show your work.** After completing an action, clearly state what happened: "I created Task #12345 titled 'Fix login button' under Detail #12300. It's in the To Do state."
- **Offer next steps.** After completing something, gently suggest what they might want to do next. "Would you like me to assign this to someone, or is there anything else you'd like to add?"
- **When things go wrong, explain simply.** If an API call fails, don't dump the error. Say what happened in plain English and offer to try again or try a different approach.
- **Use everyday language first, ADO terms second.** Say "the project board" not "the backlog hierarchy." Say "move this to done" not "transition the state."

## What You Can Help With

Here are things people commonly ask. You can share these examples with anyone who isn't sure what to ask:

**Checking on work:**
- "What's assigned to me?"
- "Show me what's in progress for our team"
- "What tasks are due this sprint?"
- "Are there any blockers right now?"

**Creating work:**
- "Create a task for fixing the login page"
- "Add a bug report about the search not working"
- "I need a new requirement for the notification feature"

**Updating work:**
- "Mark task 12345 as done"
- "Move this item to testing"
- "Assign this to Kerry"
- "Add a comment to item 12345 saying we're waiting on the API team"

**Understanding the board:**
- "What types of work items do we have?"
- "How does a requirement become actual work?"
- "What's the difference between a constraint and a bug?"

For detailed state definitions and the full hierarchy reference, see [REFERENCE.md](REFERENCE.md).

## Setup

This skill only works in **Claude Code** (the CLI/desktop app). It does not work in claude.ai chat — that's a platform limitation, not something we can fix with configuration.

### What we know works

The Azure DevOps MCP server is confirmed working in Kerry's Claude Code environment. It can list projects, query work items, read details with relations, search across items, and fetch iterations. All core operations this skill needs have been tested against the live southbendin ADO instance.

### What you need

1. **Claude Code** — Install it:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
   No npm? Install Node.js first from https://nodejs.org (LTS version).

2. **The Azure DevOps MCP server** — This is what lets Claude talk to ADO. It may already be available when you install Claude Code. Check by opening Claude Code and typing `/mcp`. If you see `azure-devops` listed, you're set.

   If it's not there, run:
   ```
   claude mcp add azure-devops --transport sse https://mcp.dev.azure.com/sse
   ```
   You'll sign in with your Microsoft account — the one that has access to the southbendin ADO organization.

3. **This skill** — Copy the `ado-work-management` folder (contains `SKILL.md` and `REFERENCE.md`) to:
   - **Windows**: `%USERPROFILE%\.claude\skills\ado-work-management\`
   - **Mac/Linux**: `~/.claude/skills/ado-work-management/`

### Verify it works

Open Claude Code and type:

```
Show my assigned work items
```

If you see your ADO work items, everything is connected.

### If something isn't working

| What you see | What it means | What to do |
|---|---|---|
| Your work items show up | Everything is working. | Nothing — you're good. |
| "Authentication failed" | Your Microsoft login expired or wasn't accepted. | Run `/mcp` in Claude Code, disconnect and reconnect azure-devops. |
| "No work items found" | You might be querying the wrong project. | Ask Claude to "list projects" and check you're in "Digital - Product Portfolio." |
| azure-devops not listed in `/mcp` | The MCP server isn't connected yet. | Run the `claude mcp add` command above. |
| Something else entirely | We haven't seen it yet. | Ask Kerry — he's been through the setup and can help troubleshoot. |

## Available MCP Tools

Use the Azure DevOps MCP tools for all operations:

- **Query**: `wit_get_work_item`, `wit_get_work_items_batch_by_ids`, `wit_my_work_items`, `search_workitem`, `wit_get_query_results_by_id`
- **Create**: `wit_create_work_item`, `wit_add_child_work_items`
- **Update**: `wit_update_work_item`, `wit_update_work_items_batch`
- **Link**: `wit_work_items_link`, `wit_add_artifact_link`, `wit_link_work_item_to_pull_request`
- **Comments**: `wit_add_work_item_comment`, `wit_list_work_item_comments`
- **Iterations**: `work_list_iterations`, `work_list_team_iterations`, `wit_get_work_items_for_iteration`
- **Backlogs**: `wit_list_backlogs`, `wit_list_backlog_work_items`

Always use project name **"Digital - Product Portfolio"** unless the user specifies otherwise. The secondary project is **"Custom Applications - Product Portfolio"** (same process template).

## Work Item Hierarchy

Our ADO is organized in a specific way. Think of it like a tree:

```
Products (the big buckets — like "Digital Proving Ground")
|
+-- Discovery (research before starting a project)
+-- Project (a body of work, like an epic)
|   |
|   +-- Requirement (what needs to be built — gets "frozen" when approved)
|   |   |
|   |   +--> Planned Work (the working copy you actually build against)
|   |        +-- Detail (a chunk of work, like one feature or scenario)
|   |            +-- Task (a specific thing to do, measured in hours)
|   |            +-- Constraint (a blocker or issue found during development)
|   |
|   +-- Change Order (scope changes mid-project — also gets frozen)
|       |
|       +--> Unplanned Work (working copy of the change order)
|            +-- Detail -> Task / Constraint
|
+-- Request (asks that come in after something is live)
+-- Issue (something went wrong in production)
|   +-- Bug (a specific defect)
|   +-- Task
+-- Maintenance (ongoing upkeep)
    +-- Task
```

## Parent-Child Rules

When creating work items, these are the valid relationships:

| What you're creating | Where it can live (valid parents) |
|---|---|
| Discovery, Project, Request, Issue, Maintenance | Under a Products item |
| Requirement, Change Order | Under a Project |
| Planned Work, Unplanned Work | Under a Project (created automatically — see freeze rules below) |
| Detail | Under Planned Work or Unplanned Work |
| Task | Under a Detail, Maintenance, or Issue |
| Constraint | Under a Detail |
| Bug | Under an Issue |

## Important Rules You Must Follow

### State Name Casing (this causes real errors if wrong)

ADO is picky about capitalization. Use exactly:
- **"To Do"** (capital D): Task, Bug, Issue
- **"To do"** (lowercase d): Planned Work, Unplanned Work, Detail, Constraint, Requirement, Change Order

### Required Fields for Tasks

When updating a Task (especially moving it to Done), these fields **must** be set or ADO will reject the change:
- `Microsoft.VSTS.Scheduling.RemainingWork` — set to `0` when completing
- `Microsoft.VSTS.Scheduling.DueDate` — set to today's date if completing retroactively

If you get a `TF401320: Rule Error`, it's almost always one of these missing fields. Set them and try again.

### Freeze Semantics (Requirements and Change Orders)

This is one of the most important concepts in our process:

1. When a Requirement or Change Order reaches **"Approved"** state, it **freezes** — becomes a permanent record that can't be changed
2. A working copy is automatically created: Requirement becomes **Planned Work**, Change Order becomes **Unplanned Work**
3. All actual development work happens on the working copy, never the frozen original
4. They're linked together with a "Duplicate Of" relationship so you can trace back to the original spec

Think of it like making a photocopy of a signed contract — the original goes in the filing cabinet, you write on the copy.

### Constraints vs Bugs

- **Constraint** = something found during development (lives under a Detail). Could be a defect, a blocker, a dependency issue
- **Bug** = something found after the project ships and is in production (lives under an Issue)

During development, always create Constraints. Bugs are only for production problems.

### Constraint Escalation

When a Constraint is Critical or High severity, it escalates — meaning it gets linked to the parent Planned Work or Unplanned Work as a blocker. This makes it visible at the higher level so project leads can see it.

### Gherkin Fields (Requirements and Change Orders)

Requirements and Change Orders use a structured format for acceptance criteria:

| Field | What goes in it |
|---|---|
| `Custom.Scenario` | Numbered scenario names ("1. User submits a song") |
| `Custom.Given` | Starting conditions ("1. User is logged in; And the round is active") |
| `Custom.When` | Actions taken ("1. User clicks Submit; And enters a URL") |
| `Custom.Then` | Expected results ("1. Song appears in the round; And user sees confirmation") |

Each field has numbered entries that line up across fields. "And" clauses are separated with semicolons.

## Relation Types

When linking items together, use these names:

| Name | When to use it |
|---|---|
| "Parent" / "Child" | Connecting items in the hierarchy |
| "Predecessor" / "Successor" | Showing something is blocked by or blocks something else |
| "Related" | General "these are connected" association |
| "Duplicate Of" / "Duplicate" | Connecting a frozen Requirement to its Planned Work copy |

## Response Format

When showing work items, make them easy to scan:
- Always include the ID, type, title, state, and who it's assigned to
- Group items logically (by type, state, or parent)
- Call out anything that needs attention — overdue items, missing fields, blockers
- Keep it conversational, not like a database dump
