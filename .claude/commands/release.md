# Release Command

Generate changelog entries and release notes from completed work items, bump the version, and optionally create a git tag.

## Usage

```bash
/release                              # Interactive release flow
/release notes                        # Generate release notes without bumping version
/release bump <major|minor|patch>     # Bump version with specified level (skip suggestion)
```

## Instructions

### `/release` (Interactive Flow)

1. **Read current version**:
   - Read `VERSION` file for current version (e.g., `0.1.0`)
   - If no `VERSION` file exists, error: "No VERSION file found. Create one with an initial version (e.g., `0.1.0`)."

2. **Find the last release tag**:
   - Run `git tag --sort=-v:refname` to list tags
   - Find the most recent tag matching `v*` pattern (e.g., `v0.1.0`)
   - If no tags exist, use the initial commit as the baseline

3. **Gather completed items since last release**:
   - Scan `.claude/work/archive/*.md` for items with `**Completed**:` date after the last tag's date
   - If no tag exists, include all archived items
   - Parse each item for: ID, title, type, category
   - Also check CHANGELOG.md `[Unreleased]` section for entries already written manually

4. **Classify items by changelog section**:

   | Item Type | Changelog Section |
   |-----------|-------------------|
   | `feature` | **Added** |
   | `enhancement` | **Changed** |
   | `fix` | **Fixed** |

   If an item's type doesn't match these, classify by keywords in the title:
   - "add", "new", "create", "introduce" → **Added**
   - "update", "improve", "enhance", "refactor", "extend" → **Changed**
   - "fix", "resolve", "correct", "patch" → **Fixed**
   - Default → **Changed**

5. **Suggest version bump level**:
   - Scan item titles and descriptions for breaking change signals: "breaking", "migration required", "incompatible", "removes", "drops support"
   - If any breaking signals found → suggest **major**
   - If any `feature` type items → suggest **minor**
   - If only `fix` and `enhancement` types → suggest **patch**
   - Present suggestion via AskUserQuestion:
     ```javascript
     {
       question: "Suggested bump: {level} ({current} → {next}). Accept?",
       header: "Version",
       options: [
         { label: "{Suggested} (Recommended)", description: "{current} → {suggested_next}" },
         { label: "Major", description: "{current} → {major_next}" },
         { label: "Minor", description: "{current} → {minor_next}" },
         { label: "Patch", description: "{current} → {patch_next}" }
       ],
       multiSelect: false
     }
     ```

6. **Generate changelog entry**:
   - Format using [Keep a Changelog](https://keepachangelog.com/) style:
     ```markdown
     ## [X.Y.Z] - YYYY-MM-DD

     ### Added
     - Description (W-NNN)

     ### Changed
     - Description (W-NNN)

     ### Fixed
     - Description (W-NNN)
     ```
   - Include PR/review links when available in the item file (from `**PR**:` field)
   - Merge any existing `[Unreleased]` entries into the new version section
   - Only include sections that have entries (omit empty Added/Changed/Fixed)

7. **Present changelog for review**:
   - Show the generated entry to the user
   - Ask: "Does this look good?"
     ```javascript
     {
       question: "Accept this changelog entry?",
       header: "Changelog",
       options: [
         { label: "Accept", description: "Write to CHANGELOG.md and update VERSION" },
         { label: "Edit", description: "I'll provide changes" }
       ],
       multiSelect: false
     }
     ```
   - If "Edit": Ask conversationally what to change, regenerate, and re-present

8. **Update files**:
   - **CHANGELOG.md**: Replace `## [Unreleased]` content with an empty unreleased section, then insert the new version entry below it
   - **VERSION**: Write the new version number

9. **Offer git tag**:
   ```javascript
   {
     question: "Create git tag v{version} and push?",
     header: "Tag",
     options: [
       { label: "Tag and push", description: "Create v{version} tag and push to remote" },
       { label: "Tag only", description: "Create v{version} tag locally (don't push)" },
       { label: "Skip", description: "No tag — I'll handle it manually" }
     ],
     multiSelect: false
   }
   ```
   - If "Tag and push": `git tag v{version} && git push origin v{version}`
   - If "Tag only": `git tag v{version}`
   - If "Skip": Do nothing

10. **Report**:
    - "Released v{version} — {N} items in changelog"
    - List the items included

### `/release notes`

Generate release notes without modifying any files. Useful for previewing what would go into a release, or for PR descriptions.

1. Follow steps 1-4 from the interactive flow (read version, find tag, gather items, classify)
2. Generate the formatted changelog entry
3. Display it to the user — do not write to any files
4. Report: "Preview — {N} items since last release. Run `/release` to create the release."

### `/release bump <major|minor|patch>`

Skip the version bump suggestion and use the specified level directly.

1. Follow steps 1-4 from the interactive flow
2. Skip step 5 — use the provided bump level
3. Continue with steps 6-10

## Version Bump Logic

Given version `X.Y.Z`:
- **major**: `X+1.0.0`
- **minor**: `X.Y+1.0`
- **patch**: `X.Y.Z+1`

## Edge Cases

- **No completed items since last tag**: Report "No completed work items since v{version}. Nothing to release." Allow override: "Release anyway with manual notes?"
- **No CHANGELOG.md**: Create one with the standard header and the new entry
- **No `[Unreleased]` section**: Insert one at the top of the changelog before the new entry
- **Manual entries in `[Unreleased]`**: Merge them into the new version entry, preserving their content
- **Items without type field**: Classify by title keywords (see step 4)

## Provider Awareness

Pull completed items from whatever the configured source of truth is:
- **Local** (default): Scan `.claude/work/archive/` directly
- **ADO/GitHub**: If a provider is configured, also query external completed items to catch any that weren't locally archived. Local archive is primary; external is supplementary.

## Example Output

```markdown
## [0.2.0] - 2026-03-05

### Added
- `/release` command for changelog and release notes (W-011)
- Support skills added to REGISTRY.md collaboration matrix (W-012)
- CONTEXT.md staleness detection and refresh mechanism (W-013)

### Changed
- Work provider abstraction extended with ADO and GitHub routing (W-003)

### Fixed
- `/work focus` broken reference resolved (W-005)
```
