# Voice Command

Process voice memos from the inbox.

## Usage

```bash
/voice              # Process all pending voice memos
/voice clear        # Clear the inbox without processing
```

## Instructions

### `/voice` — Process Pending Memos

1. **Scan `.claude/voice-inbox/`** for `.txt` and `.md` files
2. **If no files found**: "No voice memos to process."
3. **For each file**, in chronological order:
   a. **Read content**
   a2. **Detect attribution**: Check if the filename matches the pattern `YYYY-MM-DD-{initials}-{slug}.txt`. If so, and CONTEXT.md has a Team Members section, match the initials against the Team Members table. If a match is found, record the team member's name for attribution. If no match or no Team Members configured, skip attribution.
   b. **Classify** the memo:
      - Contains idea/feature language → Work item capture
      - Contains bug/error language → Bug work item
      - Contains design/visual language → Artifact creation
      - Contains decision/preference language → Memory log
      - Contains direct instruction → Execute per consultation-first
   c. **Show classification to user**:
      ```
      Memo: [filename]
      Content: [first 100 chars...]
      Classification: [type]
      Action: [what will happen]
      ```
   d. **Confirm with AskUserQuestion**:
      ```javascript
      {
        question: "Process this memo as [classification]?",
        header: "Voice memo",
        options: [
          { label: "Yes", description: "Process as [action]" },
          { label: "Skip", description: "Leave in inbox" },
          { label: "Reclassify", description: "Choose a different action" }
        ],
        multiSelect: false
      }
      ```
   e. **Execute action** based on classification. If attribution was detected in step 3a2, include it in the work item or memory entry (e.g., "Captured from voice memo by {Name}").
   f. **Move processed file** to `.claude/temp/` (or delete)

4. **Report summary**:
   ```
   Voice Inbox Processed:
   - 2 items captured as work items (W-004, W-005)
   - 1 decision logged to memory
   - 1 memo skipped

   Inbox clear.
   ```

### `/voice clear`

Delete all files in `.claude/voice-inbox/` (except `.gitkeep`).

## Classification Keywords

| Classification | Keywords |
|---------------|----------|
| **Work item** | idea, feature, add, build, create, implement, should have, would be nice |
| **Bug report** | bug, broken, error, fix, wrong, doesn't work, crash, fail |
| **Design** | design, layout, look, visual, mockup, ui, ux, page, component, style |
| **Decision** | decide, decision, always, never, prefer, rule, standard, convention |
| **Instruction** | do, run, execute, check, verify, test, commit, deploy |

## User Interaction Pattern

- **AskUserQuestion** for each memo's classification confirmation
- **Procedural** for clear subcommand

## Notes

- Voice memos are transient — processed memos don't need to be preserved
- The inbox is gitignored — only the directory structure is versioned
- Wispr Flow is the recommended dictation tool but any transcription works
- Memos can be created manually (paste text into a .txt file) for the same workflow
