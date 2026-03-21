# Voice Memo Workflow

## Core Principle

**Speak ideas into existence.** Voice is the fastest way to capture thoughts. This rule defines how voice input gets processed into actionable work.

## Primary Tool: Wispr Flow

[Wispr Flow](https://wisprflow.ai) is a system-wide dictation tool that runs on macOS/Windows. It transcribes speech to text anywhere — terminal, browser, editor, chat.

### How It Works with Claude Code

1. **Direct dictation into terminal**: Wispr Flow captures speech and types the transcribed text directly into the terminal. Claude receives it as normal text input.

2. **Voice memo files**: Longer thoughts can be saved as text files in `.claude/voice-inbox/` for batch processing.

## Voice Memo Classification

When processing voice input (whether direct or from inbox), classify and route:

| Classification | Route To | Action |
|----------------|----------|--------|
| Quick idea / feature thought | `/work add` | Capture as work item |
| Design direction / visual concept | Artifact | Create mockup or diagram |
| Bug report / issue | `/work add` with `fix` type | Capture with error context |
| Decision or preference | `.claude/memory/` | Log in decision record |
| Architecture thought | `/work add` + `expert-architect` | Capture and tag for refinement |
| Task instruction | Direct action | Execute (with consultation-first) |

## `/voice` Command Processing

The `/voice` command processes pending memos from `.claude/voice-inbox/`.

### Inbox Format

Files in voice inbox are plain text, one memo per file:
```
.claude/voice-inbox/
├── 2026-02-22-1430.txt    # Timestamped memo
├── 2026-02-22-1445.txt
└── quick-thought.txt       # Or simple named files
```

### Processing Steps

1. **Scan inbox** for `.txt` and `.md` files
2. **For each memo**:
   a. Read content
   b. Classify (see table above)
   c. Route to appropriate action
   d. Confirm action with user
3. **Clean up** processed files (move to temp or delete)
4. **Report** summary of processed memos

## Direct Dictation Best Practices

When using Wispr Flow directly in the terminal:

### Natural Phrasing That Works Well

- "Add an idea: [description]" → Routes to `/work add`
- "I'm thinking we should [design direction]" → Artifact discussion
- "There's a bug where [description]" → Bug report work item
- "Let's remember that [decision]" → Memory log
- "Can you [action]" → Direct instruction (consultation-first applies)

### Tips for Good Transcription

- Speak in complete thoughts, not fragments
- Pause between distinct ideas
- Spell out technical terms if Wispr struggles ("capital J-W-T" for JWT)
- Use "new line" or "period" for punctuation if needed

## Team Attribution (Optional)

When CONTEXT.md includes a Team Members section, voice memos can include attribution using the team member's initials in the filename.

### Team filename format

```
YYYY-MM-DD-{initials}-{slug}.txt
```

**Examples:**
- `2026-02-23-NH-dashboard-idea.txt` — attributed to NH (matched against Team Members table)
- `2026-02-23-JD-login-bug.txt` — attributed to JD
- `2026-02-23-quick-thought.txt` — no attribution (no initials pattern)

### Attribution rules

- The initials segment must appear after the date and before the slug, separated by hyphens
- Match initials against the Initials column in the Team Members table in CONTEXT.md
- If initials match a team member, include attribution when creating work items: "Captured from voice memo by {Name}"
- If initials don't match any team member, or no Team Members section exists, skip attribution silently — treat as a normal memo

## Integration with Other Rules

- **consultation-first.md** — Voice instructions still go through consultation before implementation
- **work-system.md** — Voice memos that become work items follow the standard lifecycle
- **artifact-first.md** — Voice-described designs still need visual artifacts before building

## Voice Inbox Setup

The voice inbox is gitignored (processed memos are transient). The `.gitkeep` file keeps the directory in version control.

Projects can configure their own voice inbox location in CONTEXT.md if needed.
