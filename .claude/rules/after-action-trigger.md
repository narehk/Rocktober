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

## Self-Check Protocol (AAR #29)

After ANY provider API call that returns a **structural error** (not transient), perform this check:

1. **Classify the error** — Is it transient (timeout, rate limit, network blip) or structural (validation error, missing field, wrong type name, permission mismatch)?
2. **If structural**, ask yourself:
   - Does the error reveal a **documentation gap**? (provider doc says X, API requires Y)
   - Does the error reveal a **missing script capability**?
   - Does the error reveal a **platform-specific gotcha**? (Windows paths, encoding, shell differences)
3. **If any trigger matches**: File the AAR immediately using the Auto-Filing Protocol above. Do not wait for the user to notice. Do not ask the user whether to file — the trigger rule is self-executing.
4. **If no trigger matches**: Apply normal error recovery per `error-recovery.md`.

### Most Commonly Missed Triggers

- **ADO validation errors** that reveal undocumented required fields — when `az boards work-item update` or `wit_update_work_items_batch` fails with a field validation error, that is almost always a documentation gap worth an AAR
- **ADO state transition rejections** where the process template requires intermediate states not documented in `ado.md`
- **CLI flag mismatches** where a command documented in `ado.md` uses wrong flag names or values

### Why This Section Exists

In a 2026-03-24 session, Claude encountered multiple ADO API validation errors (missing DueDate, Description on Task→Done transitions) but failed to self-trigger AAR filing despite the trigger conditions in "File an AAR (bug)" being clearly met. The errors were worked around manually but no AAR was filed until the user noticed the gap. This self-check protocol makes the trigger evaluation explicit rather than relying on implicit pattern recognition.

## Integration

- Uses the `/after-action` command for issue creation
- Respects `gh` CLI authentication — if not authenticated, log the AAR locally as a `.claude/temp/aar-pending-*.md` file and remind user to push later
- Does not interrupt the user's workflow — file quietly and report briefly
