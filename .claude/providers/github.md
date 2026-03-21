# GitHub Provider

Routes `/work` commands to GitHub Issues via the `gh` CLI. Every external write also creates or updates a local mirror (dual-write pattern per `provider.md`).

## Prerequisites

| Requirement | Check Command | Install |
|-------------|--------------|---------|
| GitHub CLI | `gh --version` | [Install gh CLI](https://cli.github.com/) |
| Authentication | `gh auth status` | `gh auth login` |

### Repository Detection

The target repository is determined in order:

1. `**Repository**:` field in CONTEXT.md `## Work Provider` (e.g., `owner/repo`)
2. Auto-detect from git remote: `gh repo view --json nameWithOwner -q .nameWithOwner`

If neither resolves, report as blocking: "Cannot determine GitHub repository. Set `**Repository**:` in CONTEXT.md `## Work Provider` or ensure a git remote is configured."

## Stage-to-Label Mapping

GitHub Issues don't have native state machines. We use labels to represent lifecycle stages, combined with open/closed state.

| Our Stage | GitHub State | Label | Notes |
|-----------|-------------|-------|-------|
| Captured | open | `status:captured` | Default for new issues |
| Shaping | open | `status:shaping` | |
| Ready | open | `status:ready` | |
| In Progress | open | `status:in-progress` | |
| In Review | open | `status:in-review` | |
| Done | closed | `status:done` | Issue closed |
| Skipped | closed | `status:skipped` | Issue closed |

### Label Initialization

On first use, check if `status:*` labels exist. If not, create them:

```bash
gh label create "status:captured" --color "CCCCCC" --description "Work item captured" --force
gh label create "status:shaping" --color "FBCA04" --description "Being refined and shaped" --force
gh label create "status:ready" --color "0E8A16" --description "Ready for implementation" --force
gh label create "status:in-progress" --color "1D76DB" --description "Actively being worked" --force
gh label create "status:in-review" --color "D93F0B" --description "In code review" --force
gh label create "status:done" --color "0E8A16" --description "Completed" --force
gh label create "status:skipped" --color "CCCCCC" --description "Won't be completed" --force
```

Use `--force` to update existing labels without error.

## Category-to-Label Mapping

| Our Category | GitHub Label |
|-------------|-------------|
| ui | `category:ui` |
| backend | `category:backend` |
| infrastructure | `category:infrastructure` |
| performance | `category:performance` |
| security | `category:security` |
| docs | `category:docs` |

Create category labels on first use with `--force`, same as status labels.

## Operations

### add

Create a GitHub Issue and a local mirror.

1. **Parse description** and detect category (same as current `work.md` steps 1-4)
2. **Create GitHub Issue**:

   ```bash
   gh issue create \
     --title "{title}" \
     --body "{description}" \
     --label "status:captured,category:{category}" \
     --repo "{REPO}"
   ```

   Parse the output for issue number and URL.

3. **Create local mirror** — Standard item file in `.claude/work/items/W-NNN.md` with Provider Integration section: Provider: github, External ID: {issue_number}, URL: {issue_url}, Type: issue, Sync: current, Last Synced: {now}
4. **Regenerate board** (see Board Generation in `work.md`)
5. **Confirm**: "Added W-NNN: '{title}' to {category} (captured) — GitHub Issue #{issue_number}"

**On CLI failure**: Offline Fallback Protocol.

### list

Query GitHub Issues and merge with the local board.

1. **Query GitHub Issues**:

   ```bash
   gh issue list --label "status:" --state all --json number,title,labels,state,url --limit 100 --repo "{REPO}"
   ```

2. **Map labels to stages** — For each issue, extract `status:*` and `category:*` labels. Map to our stages and categories.
3. **Merge with local item data** — Local items are authoritative. GitHub results surface new issues or update stale states.
4. **Check for pending sync** — Same as ADO provider.
5. **Display merged board**

### view

Show merged local + GitHub details for an item.

1. **Read local item file**
2. **Extract issue number** from Provider Integration section
3. **Fetch from GitHub**:

   ```bash
   gh issue view {issue_number} --json number,title,body,labels,state,comments,url --repo "{REPO}"
   ```

4. **Merge and display** — Local content with GitHub state, comments, and labels overlaid

### move

Transition state via label swap and open/close.

1. **Read item file** — Get issue number from Provider Integration
2. **Determine current status label** — Read from item file or query GitHub
3. **Swap labels**:

   ```bash
   gh issue edit {issue_number} \
     --remove-label "status:{current_stage}" \
     --add-label "status:{target_stage}" \
     --repo "{REPO}"
   ```

4. **Close/reopen if needed**:
   - Moving to Done or Skipped: `gh issue close {issue_number} --repo "{REPO}"`
   - Moving from Done/Skipped to an open stage: `gh issue reopen {issue_number} --repo "{REPO}"`

5. **Update locally** — Standard item file update, then regenerate board
6. **Update sync metadata**

### start

Delegate to **move** with target `in-progress`. Same additional steps as current `work.md` (assignment, branch name).

### review

Delegate to **move** with target `in-review`. Record PR link if provided.

### done

Delegate to **move** with target `done` (closes the issue). Additionally:

1. Archive locally
2. Check for locally unblocked items (same as current `work.md`)

### block

GitHub Issues have no native predecessor/dependency links. Use a combination of issue body updates and labels.

1. **Add "blocked" label** to the issue:

   ```bash
   gh issue edit {issue_number} --add-label "blocked" --repo "{REPO}"
   ```

2. **Add comment** noting the blocker:

   ```bash
   gh issue comment {issue_number} --body "Blocked by #{blocker_issue_number}" --repo "{REPO}"
   ```

   If the blocker is free text (not a GitHub issue), use that text instead.

3. **Update locally** — Standard `**Blocked By**:` field update, then regenerate board

### unblock

1. **Remove "blocked" label** if no other blockers remain:

   ```bash
   gh issue edit {issue_number} --remove-label "blocked" --repo "{REPO}"
   ```

2. **Add comment** noting the unblock:

   ```bash
   gh issue comment {issue_number} --body "Unblocked (blocker #{blocker_issue_number} resolved)" --repo "{REPO}"
   ```

3. **Update locally** — Remove blocker from `**Blocked By**:` field, then regenerate board

### sync

Same pattern as ADO provider. Scan for `**Sync**: pending` items, attempt create/update, report summary.

### import

Import a GitHub Issue as a local item.

1. **Fetch issue**:

   ```bash
   gh issue view {issue_number} --json number,title,body,labels,state,url --repo "{REPO}"
   ```

2. **Check if already imported** — Scan item files for matching External ID
3. **Map labels to stage and category**
4. **Confirm category** with AskUserQuestion
5. **Create local item file** with Provider Integration section
6. **Regenerate board** (see Board Generation in `work.md`)
7. **Confirm**: "Imported GitHub Issue #{issue_number} as W-NNN: '{title}'"

### export

Push a local-only item to GitHub.

1. **Read item file** — Verify no Provider Integration section
2. **Create GitHub Issue** (same as `add` step 2)
3. **Update item file** — Add Provider Integration section
4. **Confirm**: "Exported W-NNN as GitHub Issue #{issue_number}: {url}"

### Local-Only Operations

The following operations do not route to GitHub. They execute locally using the same behavior as the local provider (see `local.md`):

- **skip** — Local-only terminal state management
- **revive** — Local-only reactivation from Skipped
- **refine** — Local-only shaping discussion (invokes ideate skill)
- **ready** — Local-only readiness gate

## Error Handling

| Error | Severity | Action |
|-------|----------|--------|
| `gh` CLI not found | **Blocking** | Stop. Report install instructions. |
| Auth expired | **Blocking** | Stop. Report: "GitHub auth expired. Run `gh auth login` to re-authenticate." |
| Rate limited (403/429) | **Transient** | Wait, retry once. If still failing, Offline Fallback Protocol. |
| Repository not found | **Blocking** | Report: "GitHub repository not found. Check `**Repository**:` in CONTEXT.md or verify git remote." |
| Issue not found (404) | **Blocking** | Report: "GitHub Issue #{number} not found. It may have been deleted or transferred." |
| Permission denied | **Blocking** | Report: "Insufficient permissions. Check your access to this repository." |

## Doc Operations

Routes `/doc` commands to GitHub repository documentation. Supports two targets: GitHub Wiki (for wiki-based docs) or repository `docs/` directory (committed documentation).

### Prerequisites

Same GitHub CLI requirements as work operations. Additionally, verify wiki access if using wiki target:

```bash
gh api repos/{REPO}/pages --jq .source 2>/dev/null && echo "Pages: OK" || echo "Pages: N/A"
```

### Reading Doc Configuration

Extract doc config from the `## Doc Provider` section in CONTEXT.md:

| Field | Variable | Example |
|-------|----------|---------|
| `**Target**:` | `TARGET` | `wiki` or `docs/` |
| `**Auto-route**:` | `AUTO_ROUTE` | `true` |

### doc_publish

Push a local document to GitHub.

1. **Read the local file** at `<path>`
2. **Determine target**:

   **If TARGET is `wiki`:**

   ```bash
   # Check if wiki page exists
   gh api repos/{REPO}/wiki/pages --jq '.[].title' 2>/dev/null

   # Create or update wiki page
   gh api repos/{REPO}/wiki/pages \
     --method POST \
     --field title="{page_title}" \
     --field content="$(cat {local_path})" \
     2>/dev/null
   ```

   Note: GitHub Wiki API has limited support. If the API fails, fall back to advising the user to push directly to the wiki git repo:

   ```bash
   # Fallback: clone wiki repo and push
   git clone https://github.com/{REPO}.wiki.git /tmp/wiki
   cp {local_path} /tmp/wiki/{page_title}.md
   cd /tmp/wiki && git add . && git commit -m "Update {page_title}" && git push
   ```

   **If TARGET is `docs/`:**

   ```bash
   # Create a commit adding the doc to the docs/ directory
   cp {local_path} docs/{wiki_path}.md
   git add docs/{wiki_path}.md
   git commit -m "docs: add {page_title}"
   git push
   ```

3. **Report**: "Published `<path>` to GitHub {target} at `{page_path}`"

### doc_list

List documentation from GitHub.

**If TARGET is `wiki`:**

```bash
# List wiki pages via API
gh api repos/{REPO}/wiki/pages --jq '.[].title' 2>/dev/null
```

If the Wiki API is unavailable, advise: "GitHub Wiki API is limited. View wiki at https://github.com/{REPO}/wiki"

**If TARGET is `docs/`:**

```bash
# List files in docs/ directory from the repo
gh api repos/{REPO}/git/trees/HEAD --jq '.tree[] | select(.path | startswith("docs/")) | .path' 2>/dev/null
```

Display as table with paths and merge with local `docs/` listing.

### doc_sync

Bidirectional sync between local `docs/` and GitHub documentation.

1. **List local docs** — Scan `docs/` directory
2. **List GitHub docs** — Execute `doc_list`
3. **Compare** — Map local paths to GitHub paths, identify differences
4. **Present sync plan** to user (same pattern as `/doc sync` in `doc.md`)
5. **Execute** — Publish or import based on user choice

### doc_import

Pull a GitHub doc to local.

**If TARGET is `wiki`:**

```bash
# Fetch wiki page content
gh api repos/{REPO}/wiki/pages/{page_slug} --jq '.content' 2>/dev/null
```

If Wiki API is unavailable, advise cloning the wiki repo.

**If TARGET is `docs/`:**

```bash
# Fetch file content from repo
gh api repos/{REPO}/contents/docs/{path} --jq '.content' | base64 -d
```

Write the content to local `docs/` directory.

### doc_review

Check GitHub docs for staleness compared to local docs.

1. **Fetch doc** from GitHub for the target path
2. **Compare content** with local version (if exists)
3. **Check last commit date** for the doc:

   ```bash
   gh api repos/{REPO}/commits --jq '.[0].commit.committer.date' -f path=docs/{path}
   ```

4. **Flag differences** — content drift, missing pages, stale references
