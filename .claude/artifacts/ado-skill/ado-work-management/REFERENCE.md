# ADO Process Template Reference

This is the detailed reference for the **Digital Product Portfolio - Electric Boogaloo** process template used in the **southbendin** Azure DevOps organization.

You don't need to memorize any of this — Claude loads it when needed. But if you're curious about how our ADO is set up, this is the complete picture.

## All Work Item Types and Their States

Every work item type has specific states it can be in. Think of states like steps in a workflow — they tell you where something is in its journey from "just an idea" to "done."

**Good news:** All transitions are open in our template, meaning you can move from any state to any other state. There are no blocked paths. However, some transitions require specific fields to be filled in first (especially Tasks — see below).

---

### Products
The highest level — these are the big organizational buckets.

| State | What it means |
|---|---|
| Requested | Someone asked for this product to be tracked |
| Implementing | Actively being built out |
| Configuring | Being set up and configured |
| Operational | Live and running |
| Inactive | No longer actively used |
| Archived | Filed away for records |

Custom fields: Organizational Unit, Common Issues, Success Metrics, SME 1/2/3

---

### Project
A body of work — think of it like an epic or initiative.

| State | What it means |
|---|---|
| Requested | Someone proposed this project |
| Scoping | Figuring out what's involved |
| In Progress | Actively being worked on |
| On Hold | Paused for now |
| Testing | Being tested before release |
| Go-Live | In the process of launching |
| Operational | Live and running |
| Completed | All done |
| Canceled | Decided not to do this |

---

### Requirement
What needs to be built. Uses Gherkin format (Given/When/Then). **Freezes when approved.**

| State | What it means |
|---|---|
| To do | Just captured, not yet detailed |
| Scoping | Being fleshed out with Gherkin scenarios |
| On Hold | Paused |
| Signing | Being reviewed by stakeholders |
| **Approved** | **Locked in — this is the freeze point. Content can't change after this.** |
| Archived | Filed away |

Gherkin fields: Custom.Scenario, Custom.Given, Custom.When, Custom.Then

---

### Change Order
A scope change to an active project. Same freeze behavior as Requirements.

| State | What it means |
|---|---|
| To do | Just captured |
| On Hold | Paused |
| Scoping | Being detailed with Gherkin scenarios |
| Signing | Stakeholder review |
| **Approved** | **Freeze point — locked in** |
| Archived | Filed away |

Same Gherkin fields as Requirement.

---

### Planned Work
The working copy of an approved Requirement. This is where development actually happens.

**You don't create these directly** — they're automatically generated when a Requirement reaches "Approved."

| State | What it means |
|---|---|
| To do | Ready to start |
| On Hold | Paused |
| In Progress | Being worked on |
| Testing | Being tested |
| Operational | Live |
| Completed | All done |
| Archived | Filed away |

---

### Unplanned Work
The working copy of an approved Change Order. Same states as Planned Work.

**Also auto-created** — generated when a Change Order reaches "Approved."

---

### Detail
A chunk of work under Planned Work or Unplanned Work. Usually one per Gherkin scenario.

| State | What it means |
|---|---|
| To do | Not started |
| Planning | Figuring out the approach |
| On Hold | Paused |
| Developing | Being built |
| Testing | Being tested |
| Completed | Done |
| Archived | Filed away |
| Canceled | Decided not to do this |

---

### Task
The smallest unit of work. Measured in hours.

| State | What it means |
|---|---|
| To Do | Not started |
| Doing | In progress |
| Testing | Being verified |
| On Hold | Paused |
| Done | Complete |
| Archived | Filed away |

**Important — required fields:**
- **RemainingWork** (`Microsoft.VSTS.Scheduling.RemainingWork`) — must be set. Use `0` when the task is done.
- **DueDate** (`Microsoft.VSTS.Scheduling.DueDate`) — must be set. Use today's date if you're completing it retroactively.

If you skip these, ADO will reject your update with a `TF401320: Rule Error`. Claude knows to set these automatically.

---

### Constraint
A blocker or issue found during development. Attaches to a Detail.

| State | What it means |
|---|---|
| To do | Just identified |
| Investigating | Looking into it |
| Solution Found | Figured out how to fix/work around it |
| Closed - Will Not Fix | Decided this isn't going to be addressed |

Severity levels: Critical, High, Medium, Low.
**Critical and High severity constraints automatically escalate** — they get linked to the parent Planned Work / Unplanned Work as a blocker so leadership can see them.

---

### Discovery
Pre-project research. Determines if something is worth pursuing.

| State | What it means |
|---|---|
| Scoping | Initial investigation |
| On Hold | Paused |
| In Progress | Actively researching |
| Viable | Research says yes, worth doing |
| Archived | Filed away |
| Not Viable | Research says no, not worth pursuing |

---

### Request
Feature or report requests from users after something is live.

| State | What it means |
|---|---|
| Requested | Just received |
| In Progress | Being looked at |
| Vetting | Evaluating feasibility |
| Completed | Handled |
| Not Viable | Can't or won't do this |
| Archived | Filed away |
| Canceled | Withdrawn |

Requests get routed: if the original project is still active, the request becomes a Change Order. If the project is complete, it becomes a new Project.

---

### Issue
An operational problem — something went wrong with a live system.

| State | What it means |
|---|---|
| To Do | Just reported |
| Planning | Figuring out how to fix it |
| On Hold | Paused |
| Developing | Being fixed |
| Completed | Resolved |
| Archived | Filed away |
| Canceled | Not an issue after all |

---

### Bug
A specific defect found in production. Lives under an Issue. **Only for post-development problems** — during development, use Constraints instead.

| State | What it means |
|---|---|
| To Do | Just reported |
| Doing | Being fixed |
| Done | Fixed |
| Closed - Will Not Fix | Decided not to fix |
| Archived | Filed away |

---

### Maintenance
Ongoing upkeep from completed projects.

| State | What it means |
|---|---|
| Scoping | Defining what maintenance involves |
| Planning | Scheduling the work |
| Operational | Actively being maintained |
| Dormant | Maintenance paused or minimal |
| Archived | No longer maintained |

If a bug is found during maintenance, it becomes an Issue (not a direct Bug under Maintenance).

---

## Backlog Levels

This is how items stack in the ADO board view, from top to bottom:

| Level | What's in it | Default type |
|---|---|---|
| 6 — Products | Initiative, Products | Products |
| 5 — Projects | Project | Project |
| 4 — Requirements | Change Order, Requirement | Requirement |
| 3 — Work | Planned Work, Unplanned Work | Planned Work |
| 2 — Details | Detail, Discovery, Issue, Maintenance, Request | Issue |
| 1 — Tasks | Bug, Constraint, Task | Task |

Note: Epic exists in the template but is disabled. Planned Work and Unplanned Work fill that role instead.

---

## Parent-Child Validation (Complete)

| What you're creating | Valid parents | Auto-created? | Needs Gherkin? |
|---|---|---|---|
| Products | (root — no parent) | No | No |
| Discovery | Products | No | No |
| Project | Products | No | No |
| Requirement | Project | No | Yes |
| Change Order | Project | No | Yes |
| Planned Work | Project (sibling of Requirement) | Yes — on approval | No |
| Unplanned Work | Project (sibling of Change Order) | Yes — on approval | No |
| Detail | Planned Work, Unplanned Work | No | No |
| Task | Detail, Maintenance, Issue | No | No |
| Constraint | Detail | No | No |
| Request | Products | No | No |
| Issue | Products | No | No |
| Maintenance | Products | No | No |
| Bug | Issue | No | No |

---

## Relation Types

| Display Name | Reference Name | When to use |
|---|---|---|
| "Parent" | System.LinkTypes.Hierarchy-Reverse | Connect child to parent |
| "Child" | System.LinkTypes.Hierarchy-Forward | Connect parent to child |
| "Predecessor" | System.LinkTypes.Dependency-Reverse | "This blocks me" link |
| "Successor" | System.LinkTypes.Dependency-Forward | "I block this" link |
| "Related" | System.LinkTypes.Related | General association |
| "Duplicate Of" | System.LinkTypes.Duplicate-Reverse | Execution copy pointing to frozen spec |
| "Duplicate" | System.LinkTypes.Duplicate-Forward | Frozen spec pointing to execution copy |

---

## Gherkin Format Details

Requirements and Change Orders use four structured fields:

| Field | What goes in it | Example |
|---|---|---|
| Custom.Scenario | Scenario names, numbered | "1. User submits a song" |
| Custom.Given | Starting conditions | "1. User is logged in; And the round is active" |
| Custom.When | Actions taken | "1. User clicks Submit; And enters a Spotify URL" |
| Custom.Then | Expected results | "1. Song appears in the round; And user sees confirmation" |

Entries are numbered (1, 2, 3...) so they line up across fields. Multiple conditions within one scenario are joined with semicolons and "And."

---

## The Full Journey (How Work Flows End to End)

1. **Discovery** is created under a Product — someone researches whether an idea is worth pursuing
2. Discovery reaches **Viable** — green light, this should become a project
3. **Project** is created under the Product
4. **Requirements** are written under the Project using Gherkin scenarios
5. Requirement flows through: To do → Scoping → Signing → **Approved** (FREEZE)
6. On approval, a **Planned Work** item is automatically created as a sibling under the same Project, linked via "Duplicate Of"
7. Planned Work gets broken down: **Details** (one per scenario) → **Tasks** (specific work)
8. Tasks flow: To Do → Doing → Testing → Done
9. If blockers or defects are found, **Constraints** are created under the Detail — severe ones escalate
10. When everything's done: Planned Work → Testing → Completed
11. After go-live, **Requests** come in from users → routed to Change Order (active project) or new Project
12. **Change Orders** follow the same freeze → Unplanned Work pattern
13. Production defects → **Issue** → **Bug**
14. Ongoing upkeep → **Maintenance** → Tasks
