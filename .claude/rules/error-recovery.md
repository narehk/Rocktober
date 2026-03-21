# Error Recovery Rule

## Core Principle

**When things go wrong, communicate clearly and recover safely.**

Every failure should be visible, understandable, and actionable. Claude should never silently retry, silently skip, or silently recover without informing the user.

## Error Classification

| Severity | Examples | Default Behavior |
|----------|----------|-----------------|
| **Blocking** | Build fails, auth error, missing dependency, tool unavailable | Stop. Report. Ask user for direction. |
| **Degraded** | Some tests fail, lint warnings, partial API response | Report clearly. Continue only if user has authorized the broader task. |
| **Transient** | Network timeout, rate limit, flaky test | Retry once. If still failing, escalate to Blocking. |
| **Recoverable** | Syntax error from own edit, wrong file path, merge conflict | Attempt auto-fix if the fix is obvious and scoped. Report what was fixed. |

### Classification Rules

- When in doubt, classify **up** one severity level (treat Transient as Degraded, Degraded as Blocking)
- A single error can escalate: Transient → Blocking after one failed retry
- Multiple Degraded errors in the same task may collectively constitute a Blocking situation

## Multi-Step Task Failure Protocol

When executing a plan, command pipeline, or multi-step operation:

1. **Stop at first Blocking error** — do not continue to later steps
2. **Report progress clearly**:
   - What completed successfully
   - What failed and why
   - What remains unexecuted
3. **Never silently skip a failed step** — every step's outcome must be reported
4. **Preserve partial state** — do not roll back completed steps unless explicitly asked
5. **Ask before retrying** — do not loop on the same failure
6. **Offer concrete next steps** — 2-3 options for the user to choose from

### Example Report Format

```
Step 3 of 7 failed:

Completed:
  1. Created migration file ✓
  2. Updated schema types ✓

Failed:
  3. Run database migration — Connection refused (PostgreSQL not running)

Remaining (not started):
  4. Generate API endpoints
  5. Create test fixtures
  6. Run test suite
  7. Update documentation

Options:
  A. Start PostgreSQL and retry from step 3
  B. Skip the migration and continue with steps 4-7
  C. Stop here — I'll resume later
```

## Communication Pattern

Every error report must include:

| Element | Purpose | Example |
|---------|---------|---------|
| **What happened** | The error in plain language | "The build failed with a TypeScript error" |
| **What was attempted** | The goal, not just the command | "While compiling the auth module" |
| **Current state** | What completed, what didn't | "Login component compiled, but the middleware has a type error" |
| **Suggested next steps** | 2-3 actionable options | "Fix the type error, skip this file, or stop and investigate" |

### Tone

- Be direct, not apologetic — "The build failed" not "I'm sorry, the build failed"
- Be specific, not vague — "Line 42 has an undefined variable" not "There's an error somewhere"
- Be actionable, not passive — "Here are three options" not "What would you like to do?"

## Recovery Boundaries

### Auto-Fix Is Allowed When:
- Claude caused the error (e.g., syntax error from its own edit)
- The fix is obvious and scoped (e.g., missing import, typo in code Claude just wrote)
- The fix doesn't change behavior beyond correcting the error
- Claude reports what it fixed

### Auto-Fix Is NOT Allowed When:
- The error existed before Claude's changes
- The fix requires design decisions
- The fix touches code outside the current scope
- Multiple valid fixes exist

### Retry Is Allowed When:
- The error appears transient (timeout, rate limit, network blip)
- Maximum one retry before escalating
- Report the retry: "Network timeout — retrying once"

### Retry Is NOT Allowed When:
- The same error already occurred and was retried
- The error is deterministic (wrong credentials, missing file, syntax error)
- The user hasn't been informed of the failure

## Integration with Other Rules

- **consultation-first.md** — Error recovery follows the same "ask before acting" principle. When in doubt, report and ask.
- **roles-and-governance.md** — The user decides how to recover from Blocking errors. Claude proposes options but doesn't choose.
- **work-system.md** — If an error blocks a work item, the item stays In Progress (don't move it backward without discussion).

## Anti-Patterns

**Silent retry loop**: Retrying the same failing action 3+ times without telling the user. One retry for transient errors, then escalate.

**Partial success as success**: "Tests passed!" when 47 of 50 passed. Report the full picture: "47 of 50 tests passed. 3 failures in auth module."

**Over-recovery**: Auto-fixing things outside the original scope to "clean up" after an error. Stay within scope.

**Blame-shifting**: "The tool returned an error" with no actionable next steps. Always include what to do about it.

**Panic rollback**: Reverting everything because one step failed. Preserve partial progress; only roll back what's necessary.

**Optimistic continuation**: Hitting a Degraded error and pressing on with "it's probably fine." Report it, let the user decide.
