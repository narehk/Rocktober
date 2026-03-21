# Git Guidance Rule

## Core Principle

**Teach, don't hide.**

Always use real git terminology, paired with plain-language context so people learn over time. Professional, not patronizing. Two comfort levels, but both always show the next step as a workflow guardrail.

## Comfort Levels

| Level | Who it's for | What it includes |
|-------|-------------|------------------|
| **guided** (default) | Team members still building git confidence | What was done (git terms) + what it means (plain language) + next step |
| **terse** | Experienced git users who want minimal output | What was done (git terms) + next step |

### How to Read Comfort Level

1. Read CONTEXT.md → `## Team Members` table
2. Look for a `Git Comfort` column
3. Match the current user (by assignee or session context)
4. If no `Git Comfort` column exists, or no Team Members section, default to `guided`

## Output Contract

Every git operation that a command performs (`/work start`, `/commit`, `/pr`) must output:

1. **What was done** — using real git terms (e.g., "Created branch `feat/W-001-user-auth`")
2. **What it means** — plain-language context (**guided** only, omit for **terse**)
3. **Next step** — always shown at both levels, formatted as **Next step**: `<action>`

### Guided Example

```
Created branch `feat/W-001-user-auth` — this is your isolated workspace.
Nothing here affects the main codebase until you choose to share it.
**Next step**: Make your changes, then run `/commit` when ready to save a checkpoint.
```

### Terse Example

```
Created branch `feat/W-001-user-auth`.
**Next step**: `/commit` when ready.
```

## Error Translation Table

Git errors are always translated at **both** comfort levels. Cryptic error messages cause anxiety and block progress regardless of experience level.

| Error Pattern | Plain Language | Suggested Action |
|---------------|---------------|-----------------|
| `CONFLICT (content): Merge conflict in <file>` | Two people changed the same part of `<file>`. Git doesn't know which version to keep. | Open the file, look for `<<<<<<<` markers, choose which changes to keep, then `/commit`. |
| `HEAD detached at <ref>` | You're viewing a specific point in history but aren't on a branch. Changes made here could be lost. | Run `git checkout <branch-name>` to get back to your branch. |
| `! [rejected] ... (non-fast-forward)` | Someone else pushed changes to this branch since your last pull. Your push was rejected to prevent overwriting their work. | Run `git pull --rebase` to incorporate their changes, then push again. |
| `error: Your local changes to the following files would be overwritten` | You have unsaved changes that would be lost by this operation. | Run `/commit` first to save your work, then retry the operation. |
| `fatal: Authentication failed` | Git couldn't verify your identity with the remote server. Your credentials may have expired. | Check your SSH key or personal access token. Re-authenticate and retry. |
| `fatal: A branch named '<name>' already exists` | A branch with this name already exists locally. | Choose a different branch name, or run `git checkout <name>` to switch to the existing branch. |

## Anti-Patterns

**Hiding terminology**: Replacing git terms with metaphors ("save point" instead of "commit"). Use the real terms — that's how people learn.

**Dumbing down**: Adding excessive caveats like "Don't worry, this is safe!" Trust the user. State facts.

**Skipping next-step**: Finishing a git operation without telling the user what comes next in the workflow. Always include **Next step**.

**Over-explaining for terse users**: Showing plain-language context to users who set `terse`. Respect their preference.

**Explaining obvious things to guided users**: "You just ran /commit" — they know what they ran. Explain the *outcome*, not the action.

## Integration with Other Rules

- **error-recovery.md** — Git errors follow the same severity classification and communication pattern. Error translation here supplements the general error recovery protocol.
- **consultation-first.md** — Git operations triggered by slash commands (`/commit`, `/pr`) are authorized by invocation. Guidance output is informational, not a consultation gate.
- **work-system.md** — Git guidance integrates into the `/work start` → `/commit` → `/pr` workflow, providing continuity between steps via next-step prompts.
