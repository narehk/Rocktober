# /after-action — Framework After-Action Reports

File bug reports, enhancement requests, and pattern observations against the WorkSpaceFramework repo. AARs are filed as GitHub Issues on `southbendin/WorkSpaceFramework`.

## Prerequisites

- `gh` CLI authenticated (`gh auth status`)
- Write access to `southbendin/WorkSpaceFramework`

## Arguments

```
/after-action                     — File a new AAR (interactive)
/after-action "title"             — File a new AAR with pre-filled title
/after-action list                — List open AARs
/after-action resolve <issue#>    — Close an AAR with resolution
```

## Subcommand: File New AAR

### 1. Parse title

If title provided as argument, use it. Otherwise ask conversationally: "What's the one-line summary?"

### 2. Classify type

Ask via AskUserQuestion:

```javascript
{
  question: "What type of framework feedback is this?",
  header: "AAR Type",
  options: [
    { label: "Bug", description: "Something broke or produced wrong output" },
    { label: "Enhancement", description: "Something works but could be better" },
    { label: "Pattern", description: "A recurring situation worth documenting" },
    { label: "Gotcha", description: "A non-obvious pitfall or edge case" }
  ],
  multiSelect: false
}
```

### 3. Gather details

Ask conversationally for:
- **Component**: Which file is affected? (script, command, provider, rule — auto-detect from current conversation context if possible)
- **What happened**: Description of the issue
- **Expected behavior**: What should have happened
- **Suggested fix**: Proposed change (optional)

### 4. Determine severity

Ask via AskUserQuestion:

```javascript
{
  question: "How severe is this?",
  header: "Severity",
  options: [
    { label: "Low", description: "Minor inconvenience, easy workaround" },
    { label: "Medium", description: "Causes friction or wasted time regularly" },
    { label: "High", description: "Blocks work or causes incorrect results" }
  ],
  multiSelect: false
}
```

### 5. File the issue

```bash
gh issue create -R southbendin/WorkSpaceFramework \
  --title "[AAR] {component}: {title}" \
  --label "after-action,{type}" \
  --body "$(cat <<'BODY'
## Component
`{component_path}`

## Type
{bug|enhancement|pattern|gotcha}

## Severity
{low|medium|high}

## What Happened
{description}

## Expected Behavior
{expected}

## Reproduction Context
- **Project**: {current project name from CONTEXT.md}
- **Command/Script**: {what was being used}
- **Date**: {YYYY-MM-DD}

## Suggested Fix
{suggested_fix or "N/A"}

---
*Filed via `/after-action` from {project}*
BODY
)"
```

### 6. Confirm

Report: "Filed AAR #{issue_number} on WorkSpaceFramework: '{title}'"
Include the issue URL for quick access.

## Subcommand: list

Query open AARs:

```bash
gh issue list -R southbendin/WorkSpaceFramework --label "after-action" --state open --json number,title,labels,createdAt
```

Display as a table:

```
| # | Title | Type | Severity | Filed |
|---|-------|------|----------|-------|
```

## Subcommand: resolve

Close an AAR with a resolution comment:

1. Ask conversationally: "What was done to resolve this?"
2. Post a comment and close:

```bash
gh issue comment {issue#} -R southbendin/WorkSpaceFramework --body "{resolution_note}"
gh issue close {issue#} -R southbendin/WorkSpaceFramework
```

3. Confirm: "Resolved AAR #{issue#}"

## Proactive Filing

This command can also be triggered proactively by Claude per the `after-action-trigger.md` rule. When auto-filing, Claude:
- Skips the interactive prompts
- Auto-detects type, component, and severity from context
- Files the issue directly
- Reports to the user: "Filed AAR #{number} on WorkSpaceFramework: '{title}'"

## Label Setup

The following labels should exist on `southbendin/WorkSpaceFramework` (create if missing on first use):

| Label | Color | Description |
|-------|-------|-------------|
| `after-action` | `#0E8A16` | Framework after-action report |
| `bug` | `#d73a4a` | Something isn't working |
| `enhancement` | `#a2eeef` | New feature or improvement |
| `pattern` | `#7057ff` | Recurring situation |
| `gotcha` | `#fbca04` | Non-obvious pitfall |
| `severity:low` | `#c5def5` | Low severity |
| `severity:medium` | `#f9d0c4` | Medium severity |
| `severity:high` | `#e11d48` | High severity |
