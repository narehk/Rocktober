# PR Command

Create a pull request with an auto-generated summary.

## Usage

```bash
/pr                        # Create PR with auto-generated summary
/pr --reviewer NH          # Create PR and request review from team member
```

## Instructions

1. **Verify branch state**:
   - Run `git status` to check for uncommitted changes
   - Run `git log origin/main..HEAD --oneline` to see commits to include
   - Ensure current branch is pushed to remote

2. **Analyze all commits** in the PR:
   - Run `git diff main...HEAD` to see full diff
   - Understand ALL changes, not just the latest commit
   - Group changes by area (API, UI, database, etc.)

3. **Generate PR title**:
   - Keep under 70 characters
   - Use format: `type: concise description`
   - Examples: `feat: add user authentication`, `fix: resolve layout z-index`

4. **Generate PR body**:
   ```markdown
   ## Summary
   - Bullet point summary of changes
   - Focus on what and why

   ## Test plan
   - [ ] Manual testing steps
   - [ ] Automated tests added/updated

   Generated with [Claude Code](https://claude.com/claude-code)
   ```

5. **Determine base branch**:
   - Read CONTEXT.md for a Git Workflow section. If a base branch is configured (e.g., `develop`), use `--base <branch>` in the `gh pr create` command.
   - If no Git Workflow section exists, fall back to default behavior (GitHub's default branch).

6. **Determine reviewer**:
   - If `--reviewer` flag provided, resolve the value against the Team Members table in CONTEXT.md to get the GitHub username. Pass `--reviewer <github-username>` to `gh pr create`.
   - If no `--reviewer` flag but CONTEXT.md has a Team Members section, suggest reviewers via AskUserQuestion:
     ```javascript
     {
       question: "Who should review this PR?",
       header: "Reviewer",
       options: [
         // One option per team member (excluding current user if detectable)
         { label: "{Name} ({Initials})", description: "@{github-username}" },
         // ...
         { label: "Skip", description: "Don't assign a reviewer" }
       ],
       multiSelect: false
     }
     ```
   - If no Team Members configured in CONTEXT.md, skip reviewer assignment entirely (current behavior).

7. **Validate branch naming** (optional):
   - If CONTEXT.md has a Git Workflow section with branch naming conventions, check if the current branch name matches the pattern. If not, warn but don't block — it's informational.

8. **Create PR**:
   ```bash
   gh pr create --title "title" --body "$(cat <<'EOF'
   ## Summary
   ...

   ## Test plan
   ...

   Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )" [--base <branch>] [--reviewer <github-username>]
   ```

9. **Return the PR URL** to the user

10. **Git guidance output** — Per `git-guidance.md`, read the user's Git Comfort level from CONTEXT.md Team Members table and output PR creation guidance:
    - `guided`: "Created pull request #N — this shares your branch with the team and asks for review. Your code isn't merged yet — reviewers will look first. **Next step**: Wait for review feedback, or `/work done <id>` after approval and merge."
    - `terse`: "Created PR #N. **Next step**: `/work done <id>` after approval and merge."

## Pre-checks

- Commits are pushed to remote
- No uncommitted changes
- Branch is not main/master

## Team Features (Optional)

These features activate only when CONTEXT.md includes a `## Team Members` section:

- **Reviewer assignment**: The `--reviewer` flag accepts a team member's name, initials, or GitHub username. Without the flag, a reviewer selection prompt appears. Without Team Members configured, no reviewer prompt is shown.
- **Base branch**: Read from Git Workflow section in CONTEXT.md. Defaults to the repository's default branch when not configured.
- **Branch naming validation**: If Git Workflow defines a branch naming pattern, the current branch name is checked. Mismatches produce a warning, not a blocker.
