# ADO Process Template Reference

Complete state definitions and hierarchy for **Digital Product Portfolio - Electric Boogaloo**.

## All Work Item Types and States

### Products
| State | Category |
|---|---|
| Requested | Proposed |
| Implementing | InProgress |
| Configuring | InProgress |
| Operational | InProgress |
| Inactive | Completed |
| Archived | Removed |

Custom fields: Organizational Unit, Common Issues, Success Metrics, SME 1/2/3

### Project
| State | Category |
|---|---|
| Requested | Proposed |
| Scoping | Proposed |
| In Progress | InProgress |
| On Hold | InProgress |
| Testing | InProgress |
| Go-Live | Resolved |
| Operational | Completed |
| Completed | Removed |
| Canceled | Removed |

### Requirement
| State | Category | Notes |
|---|---|---|
| To do | Proposed | Initial capture |
| Scoping | InProgress | Gherkin being written |
| On Hold | InProgress | |
| Signing | Resolved | Stakeholder review |
| **Approved** | **Completed** | **FREEZE POINT** |
| Archived | Removed | |

Gherkin fields: Custom.Scenario, Custom.Given, Custom.When, Custom.Then

### Change Order
| State | Category | Notes |
|---|---|---|
| To do | Proposed | |
| On Hold | InProgress | |
| Scoping | InProgress | Gherkin being written |
| Signing | Resolved | |
| **Approved** | **Completed** | **FREEZE POINT** |
| Archived | Removed | |

Same Gherkin fields as Requirement.

### Planned Work (auto-created from approved Requirement)
| State | Category |
|---|---|
| To do | Proposed |
| On Hold | InProgress |
| In Progress | InProgress |
| Testing | InProgress |
| Operational | Completed |
| Completed | Removed |
| Archived | Removed |

### Unplanned Work (auto-created from approved Change Order)
Identical states to Planned Work.

### Detail
| State | Category |
|---|---|
| To do | Proposed |
| Planning | InProgress |
| On Hold | InProgress |
| Developing | InProgress |
| Testing | InProgress |
| Completed | Completed |
| Archived | Removed |
| Canceled | Removed |

### Task
| State | Category |
|---|---|
| To Do | Proposed |
| Doing | InProgress |
| Testing | InProgress |
| On Hold | InProgress |
| Done | Completed |
| Archived | Removed |

Required fields:
- RemainingWork (Microsoft.VSTS.Scheduling.RemainingWork) - use 0 on completion
- DueDate (Microsoft.VSTS.Scheduling.DueDate) - use today if completing retroactively

### Constraint
| State | Category |
|---|---|
| To do | Proposed |
| Investigating | InProgress |
| Solution Found | Completed |
| Closed - Will Not Fix | Removed |

Severity levels: Critical, High, Medium, Low.
Critical/High escalate to parent Planned/Unplanned Work via Predecessor link.

### Discovery
| State | Category |
|---|---|
| Scoping | Proposed |
| On Hold | InProgress |
| In Progress | InProgress |
| Viable | Completed |
| Archived | Removed |
| Not Viable | Removed |

### Request
| State | Category |
|---|---|
| Requested | Proposed |
| In Progress | InProgress |
| Vetting | InProgress |
| Completed | Completed |
| Not Viable | Removed |
| Archived | Removed |
| Canceled | Removed |

### Issue
| State | Category |
|---|---|
| To Do | Proposed |
| Planning | InProgress |
| On Hold | InProgress |
| Developing | InProgress |
| Completed | Completed |
| Archived | Removed |
| Canceled | Removed |

### Bug (post-development only)
| State | Category |
|---|---|
| To Do | Proposed |
| Doing | InProgress |
| Done | Completed |
| Closed - Will Not Fix | Removed |
| Archived | Removed |

### Maintenance
| State | Category |
|---|---|
| Scoping | Proposed |
| Planning | InProgress |
| Operational | InProgress |
| Dormant | Completed |
| Archived | Removed |

## Backlog Levels (top to bottom)

| Rank | Backlog Name | Work Item Types | Default Type |
|---|---|---|---|
| 6 | Products | Initiative, Products | Products |
| 5 | Projects | Project | Project |
| 4 | Requirements | Change Order, Requirement | Requirement |
| 3 | Work | Planned Work, Unplanned Work | Planned Work |
| 2 | Details | Detail, Discovery, Issue, Maintenance, Request | Issue |
| 1 | Tasks | Bug, Constraint, Task | Task |

Note: Epic exists in the template but is disabled.

## Complete Parent-Child Validation

| Child Type | Valid Parent Types | Auto-Created? | Gherkin Required? |
|---|---|---|---|
| Products | (root) | No | No |
| Discovery | Products | No | No |
| Project | Products | No | No |
| Requirement | Project | No | Yes |
| Change Order | Project | No | Yes |
| Planned Work | Project (sibling of Requirement) | Yes - on approval | No |
| Unplanned Work | Project (sibling of Change Order) | Yes - on approval | No |
| Detail | Planned Work, Unplanned Work | No | No |
| Task | Detail, Maintenance, Issue | No | No |
| Constraint | Detail | No | No |
| Request | Products | No | No |
| Issue | Products | No | No |
| Maintenance | Products | No | No |
| Bug | Issue | No | No |

## Relation Types (use display names)

| Display Name | Reference Name | Use For |
|---|---|---|
| "Parent" | System.LinkTypes.Hierarchy-Reverse | Set parent (child to parent) |
| "Child" | System.LinkTypes.Hierarchy-Forward | Set child (parent to child) |
| "Predecessor" | System.LinkTypes.Dependency-Reverse | Blocked-by link |
| "Successor" | System.LinkTypes.Dependency-Forward | Blocks link |
| "Related" | System.LinkTypes.Related | General association |
| "Duplicate Of" | System.LinkTypes.Duplicate-Reverse | Execution copy to frozen source |
| "Duplicate" | System.LinkTypes.Duplicate-Forward | Frozen source to execution copy |

## Gherkin Field Format

Requirements and Change Orders populate these ADO fields:

| Field Reference | Display Name | Content |
|---|---|---|
| Custom.Scenario | Scenario / Use Case | Numbered scenario names |
| Custom.Given | Given / Assumptions | Numbered preconditions (one per scenario) |
| Custom.When | When / Actions | Numbered actions/triggers (one per scenario) |
| Custom.Then | Then / Expected Results | Numbered expected outcomes (one per scenario) |

Each field has numbered entries correlating across fields. "And" clauses appended with semicolons within each entry.

Example:
- Scenario: "1. User submits a song"
- Given: "1. User is logged in; And the round is active"
- When: "1. User clicks Submit; And enters a Spotify URL"
- Then: "1. Song appears in the round; And user sees confirmation"

## Typical End-to-End Flow

1. Discovery created under Products - researches feasibility
2. Discovery reaches Viable - informs Project creation
3. Project created under Products
4. Requirements written under Project with Gherkin scenarios
5. Requirement flows: To do -> Scoping -> Signing -> Approved (FREEZE)
6. On approval: Planned Work auto-created as Project sibling, linked via "Duplicate Of"
7. Planned Work decomposed: Details (one per Gherkin scenario) -> Tasks
8. Tasks flow: To Do -> Doing -> Testing -> Done
9. Constraints discovered during dev - attached to Details, escalate if severe
10. All Details/Tasks complete -> Planned Work -> Testing -> Completed
11. Post go-live: Requests route to Change Order (active project) or new Project
12. Change Orders follow same freeze -> Unplanned Work pattern
13. Production bugs -> Issue -> Bug (not Constraint)
14. Ongoing upkeep -> Maintenance -> Tasks

## All Transitions Are Open

Every work item type allows transitions from any state to any other state. There are no restricted transition paths in this process template. However, some transitions require specific fields to be set (notably Task requires RemainingWork and DueDate).
