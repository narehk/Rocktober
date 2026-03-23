# After-Action Report — Proactive Trigger Rule

## Core Principle

**Framework issues get captured, not swallowed.** When Claude encounters a bug, limitation, or missing capability in framework scripts, commands, providers, or rules, it files an after-action report on the WorkSpaceFramework repo automatically.

## When to Auto-File an AAR

### File an AAR (bug) when:
- A framework script (`.claude/scripts/`) fails with an unexpected error
- A framework script produces incorrect output that Claude must work around
- A provider doc (`.claude/providers/`) contains instructions that don't match actual CLI behavior
- A command (`.claude/commands/`) has a logic gap that causes incorrect behavior

### File an AAR (enhancement) when:
- Claude has to manually derive a CLI command that should be a script but isn't
- A script is missing a parameter or option that would prevent a workaround
- A repeated manual pattern emerges that could be automated
- A provider doc is missing coverage for an operation Claude needs

### File an AAR (pattern) when:
- A non-obvious sequence of operations is needed repeatedly
- An interaction between multiple framework components has surprising behavior

### File an AAR (gotcha) when:
- A platform-specific issue (Windows paths, Git Bash, encoding) causes failure
- An ADO API quirk or undocumented behavior is discovered

## When NOT to Auto-File

- **User errors**: Incorrect arguments, wrong IDs, misconfiguration — not framework issues
- **Transient failures**: Network timeouts, rate limits, auth expiry — these are expected
- **One-off edge cases**: Unless the edge case reveals a missing script or doc gap
- **Duplicate issues**: Check `/after-action list` before filing. If a similar AAR is already open, add context as a comment instead

## Auto-Filing Protocol

When the trigger conditions are met:

1. **Detect** — Identify the framework component and failure mode
2. **Classify** — Determine type (bug/enhancement/pattern/gotcha) and severity
3. **File** — Use the `/after-action` command's issue creation pattern (non-interactive):
   ```bash
   gh issue create -R southbendin/WorkSpaceFramework \
     --title "[AAR] {component}: {title}" \
     --label "after-action,{type},severity:{severity}" \
     --body "{structured body per /after-action template}"
   ```
4. **Report** — Tell the user: "Filed AAR #{number} on WorkSpaceFramework: '{title}'"
5. **Continue** — The AAR filing is a side-effect, not a blocker. Continue with the original task using whatever workaround is needed.

## Severity Auto-Detection

| Signal | Severity |
|--------|----------|
| Script fails entirely, no workaround | high |
| Script produces wrong output, manual correction needed | medium |
| Missing script, Claude derives CLI manually | medium |
| Minor inconvenience, easy workaround | low |
| Documentation gap, confusing but functional | low |

## Integration

- Uses the `/after-action` command for issue creation
- Respects `gh` CLI authentication — if not authenticated, log the AAR locally as a `.claude/temp/aar-pending-*.md` file and remind user to push later
- Does not interrupt the user's workflow — file quietly and report briefly
