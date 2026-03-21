# Framework Learnings: Retroactive Testing Session

**Date**: 2026-03-21
**Context**: Testing the WorkSpaceFramework upgrade (decomposition, ADO comments, quiz wiki publish) by retroactively decomposing completed work items W-11967 (Scaffolding) and W-11968 (Data Model).

## Learnings

### 1. Task Done Requires Due Date

**Discovery**: ADO Task type in the "Digital Product Portfolio - Electric Boogaloo" process template has a required `Microsoft.VSTS.Scheduling.DueDate` field to transition to Done state.

**Error**: `TF401320: Rule Error for field Due Date`

**Fix**: When transitioning Tasks to Done, include:
```bash
--fields "Microsoft.VSTS.Scheduling.DueDate=YYYY-MM-DD"
```

**Impact**: `/work decompose` and `/work done` for Tasks must set Due Date. When retroactively marking Tasks as Done, use the completion date.

### 2. Task Done Requires Description

**Discovery**: ADO Task type requires a non-empty `System.Description` field to transition to Done state.

**Error**: `TF401320: Rule Error for field Description`

**Fix**: When transitioning Tasks to Done, include:
```bash
--description "{task_description}"
```

**Impact**: Tasks created during decomposition should always include a description, not just a title.

### 3. MSYS_NO_PATHCONV=1 for Wiki Paths on Windows

**Discovery**: On Windows with Git Bash (MSYS), path arguments starting with `/` are automatically expanded to `C:/Program Files/Git/...`. This breaks all wiki path commands.

**Error**: `The path 'C:/Program Files/Git' either does not exist or is not a folder`

**Fix**: Prefix all `az` commands that use wiki paths with:
```bash
MSYS_NO_PATHCONV=1 az devops wiki ...
```

**Impact**: Every wiki operation in `ado.md` Doc Operations section needs this prefix on Windows.

### 4. ADO Type is "Products" (plural), Not "Product"

**Discovery**: The work item type name in the Digital Product Portfolio process template is "Products", not "Product". This was discovered when `az boards work-item create --type "Product"` returned VS402323.

**Verification**: Listed all types via REST API: `az rest ... /_apis/wit/workitemtypes?api-version=7.0`

**Impact**: CONTEXT.md Parent-Child table and ado.md type detection must use the actual type name from the process template.

### 5. Wiki Ancestor Pages Must Exist

**Discovery**: `az devops wiki page create` fails if the parent page path doesn't exist. Creating `/Rocktober/Reviews/W-11967-acceptance-quiz` requires `/Rocktober` and `/Rocktober/Reviews` to exist first.

**Fix**: Always create parent pages before child pages, working top-down through the path hierarchy.

**Impact**: `doc.md publish-review` must include an ancestor page creation step. For the REST API push approach, all pages can be created in a single commit.

### 6. Project Wiki ≠ Product Wiki

**Discovery**: The project wiki (`Digital---Project-Portfolio.wiki`) is a shared org-level wiki auto-created by ADO. Product wikis should be separate **code wikis** created per Product via "Publish code as wiki".

**Architecture**:
- **Project Wiki**: One per ADO project, auto-created, shared by all products/projects in that ADO project
- **Code Wiki**: Created via `az devops wiki create --type codewiki`, backed by a git repo, appears as a separate entry in the wiki dropdown

**Fix**: Use `az devops wiki create --type codewiki --repository "{name}" --mapped-path "/" --version main` for each Product.

**Impact**: CONTEXT.md Doc Provider target should reference the Product wiki name, not the project wiki. `doc.md publish-review` must target the correct code wiki.

### 7. Hyperlinks Need Companion Comments

**Discovery**: ADO hyperlinks appear in the Links tab but are not easily discoverable. Team members viewing the Discussion tab won't see that a hyperlink was added unless a companion comment calls it out.

**Pattern**: Whenever adding a hyperlink to a work item, also post a discussion comment referencing the link:
```html
<div><b>Wiki Link: {description}</b><br/>
View: <a href='{url}'>{display text}</a></div>
```

**Impact**: ado.md Quiz Sync section already includes this in step 3 (Post Summary Comment). This learning validates that pattern.

### 8. `/setup` Should Link Project to Product

**Discovery**: Projects can be created without a Product parent, leaving the hierarchy incomplete. The Rocktober Project (#11956) was initially unparented.

**Fix**: Created "Digital Proving Ground" Products (#11975) and linked Rocktober to it.

**Impact**: The `/setup` command or onboarding workflow should ensure Projects are linked to a Product during creation.

### 9. PW is Sibling of Requirement, Not Child

**Discovery**: Planned Work items are NOT children of Requirements. They are siblings under the same Project, linked via "Duplicate Of" relation. The arrow in hierarchy diagrams represents a "spawn/copy" action, not a parent-child link.

**Verification**: Already documented in `2026-03-20-work-item-hierarchy.md` but was initially confusing.

**Impact**: Already corrected in hierarchy artifact and CONTEXT.md.

### 10. `az boards work-item relation add` Uses Display Name

**Discovery**: The `--relation-type` parameter requires the **display name** ("Parent", "Child", "Duplicate Of") not the reference name ("System.LinkTypes.Hierarchy-Reverse").

**Error**: `The value 'System.LinkTypes.Hierarchy-Reverse' is not a valid relation type.`

**Fix**: Always use display names. Run `az boards work-item relation list-type` to see all valid display names.

**Impact**: ado.md Operations section updated with Relation Type Reference table.

### 11. REST API Push for Wiki Initialization

**Discovery**: Empty ADO repos can't be published as wikis — they need at least one commit. `git push` failed with auth errors, but the ADO REST API (`_apis/git/repositories/{repo}/pushes`) bypasses git auth and can create initial commits directly.

**Pattern**:
```bash
az rest --method post --resource "499b84ac-..." \
  --uri "https://dev.azure.com/{org}/{project}/_apis/git/repositories/{repo}/pushes?api-version=7.0" \
  --body @push-body.json
```

**Impact**: Useful for any scenario where git push fails due to auth configuration (common on Windows with credential manager issues).

### 12. Wiki Cross-Links

**Discovery**: Wiki pages should link back to ADO work items, and ADO work items should link to wiki pages. Bidirectional linking ensures discoverability from both surfaces.

**Pattern**: Include `**ADO Work Item**: [PW #NNN](url)` in wiki pages, and hyperlink + companion comment on work items.

## Summary

These learnings primarily affect:
1. **ado.md** — Windows CLI notes, Task state requirements, relation display names, code wiki creation, companion comments
2. **CONTEXT.md** — Type name corrections, Doc Provider target, code wiki distinction
3. **doc.md** — Product wiki targeting, ancestor page creation
4. **work.md** — Task decomposition Due Date/Description requirements
