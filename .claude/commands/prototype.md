# Prototype Command

**Skill**: `prototype`

Rapidly generate ephemeral UI prototypes. Prototypes run in isolated temp directories with their own dev server. Stack-configurable per project via CONTEXT.md.

## Usage

```bash
# Generate interactive component (default, Level 2)
/prototype [prompt]

# Static HTML mockup (Level 1)
/prototype --static [prompt]

# Mini-app with routing (Level 3)
/prototype --app [prompt]

# Management
/prototype list              # List running prototypes
/prototype stop              # Stop most recent
/prototype stop --all        # Stop all prototypes
/prototype export            # Export to standalone HTML
/prototype screenshot        # Capture screenshot
/prototype save [name]       # Save to artifacts
```

## Fidelity Levels

| Level | Flag | Description | Server? | Use Case |
|-------|------|-------------|---------|----------|
| 1 | `--static` | Self-contained HTML with CDN | No | Quick layout exploration |
| 2 | (default) | Component with framework + state | Yes | Component behavior testing |
| 3 | `--app` | Multi-component app with routing | Yes | Complex feature prototyping |

## Workspace Structure

All prototypes are created in:
```
.claude/temp/prototypes/<slug>-<timestamp>/
```

Saved prototypes go to:
```
.claude/artifacts/prototypes/<name>/
```

## Server Ports

- **Range**: 3001-3010 (auto-increment if occupied)
- **Conflict handling**: Find first available port in range

## Stack Configuration

The prototype skill reads CONTEXT.md for the project's frontend stack. If no config exists, defaults to HTML + Tailwind CDN (Level 1) or React + Vite + Tailwind (Level 2/3).

Projects can specify in CONTEXT.md:
```markdown
## Prototype Stack
- **Framework**: React 18 / Vue 3 / Svelte / HTML
- **Bundler**: Vite
- **CSS**: Tailwind CSS
- **Design System**: [project-specific tokens]
```

## Interaction Pattern

**Procedural** — No questions asked. User intent is clear from command invocation.

## Typical Workflow

1. **Explore layout**: `/prototype --static "page layout idea"`
2. **Test interactions**: `/prototype "component with state"`
3. **Iterate**: Edit files in temp directory, dev server hot-reloads
4. **Export**: `/prototype export` for sharing
5. **Save**: `/prototype save reference-impl` if keeping
6. **Clean up**: `/prototype stop --all` when done

## When to Use

**Good use cases**: Exploring UI layouts, testing interactions, validating design decisions, creating reference implementations.

**Avoid for**: Simple text changes (edit real code), backend logic (use tests), API design (use curl/Postman).
