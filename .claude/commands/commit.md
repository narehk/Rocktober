# Commit Command

Generate a commit message and create a git commit for staged or unstaged changes.

## Instructions

1. **Check current status**:
   - Run `git status` to see what files have changed
   - Run `git diff --cached` for staged changes
   - Run `git diff` for unstaged changes

2. **Analyze changes**:
   - Identify the type of change (feat, fix, refactor, docs, test, chore)
   - Summarize what changed and why
   - Look at recent commits with `git log --oneline -5` for style consistency

3. **Stage files** (if needed):
   - Stage specific files rather than using `git add -A`
   - Never stage .env files or credentials
   - **CRITICAL - Check for unexpected changes**:
     - If files changed that were NOT part of your implementation scope
     - **NEVER revert without asking the user first**
     - Ask: "I see changes in [file] - should I include these or commit separately?"
     - Only auto-revert: backup files (.bak, .backup), `.claude/temp/` scratch work

4. **Generate commit message**:
   - Use conventional commit format: `type(scope): description`
   - Keep subject line under 72 characters
   - Add body explaining the "why" if non-obvious
   - End with: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

5. **Create the commit**:
   - Use HEREDOC format for multi-line messages
   - Verify success with `git status`

6. **Git guidance output** — Per `git-guidance.md`, read the user's Git Comfort level from CONTEXT.md Team Members table and output commit guidance:
   - `guided`: "Committed N files — this saves a snapshot of your work with a description of what changed. Think of it as a named checkpoint you can always return to. **Next step**: Keep working, `/commit` again for another checkpoint, or `/pr` when the feature is complete."
   - `terse`: "Committed N files. **Next step**: `/commit` again or `/pr` when feature is complete."

7. **Emit telemetry event** (fire-and-forget) — After a successful commit, append one JSON line to the current session file in `.claude/patterns/sessions/` (see `patterns.md` Integration Contract for session file naming and schema):
   ```json
   { "ts": "<ISO 8601>", "type": "command", "command": "/commit", "project": "<project>", "outcome": "completed", "context": { "filesChanged": <count>, "commitType": "<type>" } }
   ```
   `filesChanged` is the number of files in the commit. `commitType` is the conventional commit type used (e.g., `feat`, `fix`, `docs`). If the session directory or file doesn't exist, create it (`YYYY-MM-DD-<6-char-hex>.jsonl`). If the write fails, silently skip — never surface event logging failures to the user.

## Example

```bash
git commit -m "$(cat <<'EOF'
feat(auth): add JWT-based authentication

Enables user registration and login with secure token-based
authentication, supporting refresh token rotation.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

## Important

- Never use `--amend` unless explicitly requested
- Never use `--no-verify` unless explicitly requested
- If pre-commit hook fails, fix issues and create a NEW commit
