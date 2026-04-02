# Sketch Command

**Command**: `/sketch [subcommand]`

**Purpose**: pencil.dev design system integration. Read design tokens, create visual artifacts, audit design compliance, and sync design system changes.

## Getting Started with pencil.dev

### Installation

pencil.dev is available as a **desktop Electron app** or **VS Code / Cursor extension**.

- **Desktop app**: Install from pencil.dev — runs as a standalone application
- **VS Code extension**: Search for "Pencil" in the Extensions marketplace

### Creating a `.pen` File

1. In your project, create a new file with the `.pen` extension (e.g., `design-system.pen`)
2. **Recommended location**: Place `.pen` files in the project root or a `design/` directory
3. **Naming conventions**:
   - `design-system.pen` — Main design system (tokens, colors, typography)
   - `<feature-name>.pen` — Feature-specific designs (e.g., `dashboard.pen`, `login-flow.pen`)
4. Open the `.pen` file in Pencil — the visual editor activates automatically
5. Or use MCP: `open_document("new")` or `open_document("/path/to/file.pen")`

### Launching Pencil (Autonomous)

Claude can launch and operate Pencil without human intervention:

```powershell
# Launch the desktop app (adjust path per installation)
powershell.exe -NoProfile -Command "Start-Process 'C:\Users\<user>\AppData\Local\Programs\Pencil\Pencil.exe'"
```

MCP tools connect automatically ~3 seconds after the app starts. Verify with `get_editor_state`.

### Saving `.pen` Files

pencil.dev does NOT auto-save. Claude saves programmatically via PowerShell SendKeys:

```powershell
powershell.exe -NoProfile -Command "Add-Type -AssemblyName Microsoft.VisualBasic; Add-Type -AssemblyName System.Windows.Forms; [Microsoft.VisualBasic.Interaction]::AppActivate('Pencil'); Start-Sleep -Milliseconds 500; [System.Windows.Forms.SendKeys]::SendWait('^s')"
```

After saving, verify the file exists on disk:
```bash
ls -la path/to/file.pen
```

**Always save after `batch_design` or `set_variables` operations.**

### Activating the MCP Connection

The pencil.dev MCP server **starts automatically** when Pencil is running (desktop app or VS Code extension). No manual configuration needed. Claude Code detects the MCP tools when they become available.

**To verify the connection**: Run `get_editor_state` — if it returns the current document state, the MCP is active.

## Prerequisites

- **pencil.dev** desktop app installed (Electron) or VS Code/Cursor extension
- Launch Pencil if not running: `powershell.exe -NoProfile -Command "Start-Process '<install-path>\Pencil.exe'"`
- MCP tools connect automatically when Pencil is running (~3 seconds)

## pencil.dev MCP Tools

pencil.dev provides these MCP tools automatically when running:

| MCP Tool | Purpose |
|----------|---------|
| `batch_design` | Create, modify, delete design elements (save after via PowerShell) |
| `batch_get` | Read components, search elements, inspect hierarchy |
| `get_screenshot` | Render design preview images |
| `snapshot_layout` | Analyze layout structure, detect positioning issues |
| `get_editor_state` | Access current editor context and selection |
| `get_variables` | Read design tokens and theme values |
| `set_variables` | Update design tokens and sync with CSS (save after via PowerShell) |
| `open_document` | Open existing `.pen` file or create new one |
| `export_nodes` | Export design nodes as PNG/JPEG/WEBP/PDF |
| `get_guidelines` | Load design guides and style archetypes |

## Usage

```bash
/sketch                      # Open pencil.dev guidance for current work item
/sketch sync                 # Pull design tokens, diff against last known state
/sketch audit [project]      # Compare implemented UI against design system
/sketch tokens               # Export design tokens as CSS variables / Tailwind config
/sketch screenshot [file]    # Capture design preview from .pen file
```

## Command Implementation

### `/sketch` — Design Guidance

1. **Check if pencil.dev MCP is available** (look for pencil MCP tools)
2. **If no MCP**: Guide user to install pencil.dev and open a `.pen` file
3. **If MCP available**:
   - Read current work item context (if any)
   - Use `get_editor_state` to see what's open
   - Use `get_variables` to read current design tokens
   - Provide guidance on creating/editing design elements

### `/sketch sync` — Design System Sync

1. **Read current design tokens** via `get_variables` MCP tool
2. **Compare against last known state** (stored in `.claude/memory/design-tokens.json`)
3. **If changes detected**:
   ```
   Design System Changes Detected:

   Changed:
   - primary-600: #0369a1 → #0284c7
   - border-radius-lg: 8px → 12px

   Added:
   - accent-500: #10b981

   Removed:
   - (none)

   Affected areas:
   - All buttons using primary-600
   - Card components using border-radius-lg
   ```
4. **Ask user** whether to create work items for retroactive updates
5. **Save current state** as new baseline in `.claude/memory/design-tokens.json`

### `/sketch audit [project]` — Design Compliance Audit

1. **Read design tokens** from pencil.dev via `get_variables`
2. **Scan project source files** for:
   - Hardcoded colors that should use tokens
   - Spacing values that don't match the token scale
   - Typography that doesn't use the type scale
   - Components that don't match design system patterns
3. **Use `get_screenshot` and `snapshot_layout`** to compare visual output
4. **Report findings**:
   ```
   Design System Audit: [project]

   Compliance: 78% (42/54 components match)

   Non-compliant:
   - src/components/Header.jsx:23 — Hardcoded #333 (should use text-primary)
   - src/pages/Settings.jsx:45 — 16px padding (token: 12px or 24px)
   - src/components/Card.jsx:12 — Missing border-radius token

   Recommendations:
   - 3 quick fixes (hardcoded values → tokens)
   - 1 component redesign needed (Card border radius)
   ```

### `/sketch tokens` — Export Design Tokens

1. **Read all design tokens** via `get_variables`
2. **Export in requested format**:
   - **CSS Custom Properties**: `:root { --color-primary-600: #0369a1; ... }`
   - **Tailwind config**: `theme.extend.colors`, `theme.extend.spacing`
   - **JSON**: Raw token data for other tools
3. **Save to project** at configured location

### `/sketch screenshot [file]` — Capture Design Preview

1. **Use `get_screenshot` MCP tool** on specified `.pen` file
2. **Save screenshot** to `.claude/artifacts/`
3. **Report**: "Screenshot saved to .claude/artifacts/[filename].png"

## Design System as Source of Truth

pencil.dev serves a dual role: **design exploration tool** AND **living design system source of truth**.

### The Workflow

```
You update a color in pencil.dev
  → /sketch sync detects the change
  → Claude shows what changed and what's affected
  → You approve scope of retroactive updates
  → Claude creates work items for affected areas
  → Implementation proceeds per artifact-first workflow
```

### Two-Way Sync

- **pencil.dev → Code**: `get_variables` reads tokens, code implements them
- **Code → pencil.dev**: `set_variables` can push code-side changes back to design files

## Frame Sizing Workarounds (AAR #37)

pencil.dev frame sizing can cause content overflow and visual overlap. Apply these practices:

### Common Sizing Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Text overflows container | Fixed height on text-containing frame | Use `fit_content` for height instead of fixed values |
| Children overlap parent bounds | Parent too small for child content | Set parent sizing to `fit_content` or use `scroll` overflow |
| Frame clips content unexpectedly | Fixed dimensions + overflow hidden | Use `fit_content` or increase container dimensions |
| Nested frames cause layout collapse | Multiple fixed-size nesting | Use `fit_content` on at least the innermost frames |

### Sizing Best Practices

1. **Prefer `fit_content` over fixed heights** for frames containing text or variable-length content
2. **Use fixed dimensions only** for: image containers, icon frames, decorative elements with known sizes
3. **Validate with `snapshot_layout`** after any `batch_design` call that changes frame sizes:
   ```
   snapshot_layout({ filePath: "file.pen", parentId: "{frame_id}", problemsOnly: true })
   ```
   This returns only nodes with clipping, overflow, or overlap issues.
4. **Use `get_screenshot`** to visually confirm layout after structural changes — don't trust code alone
5. **When stacking frames vertically** (layout: "vertical"), set the container height to `fit_content` to avoid truncation
6. **Text nodes**: Never set a fixed height on a text node — text length varies. Use `fit_content` for height, optionally fixed width for wrapping.

### Debugging Sizing Issues

When content appears clipped or overlapping:
1. Run `snapshot_layout` with `problemsOnly: true` on the affected parent
2. Check each flagged node for `fit_content` vs fixed sizing mismatch
3. Update sizing via `batch_design` → `U()` operations
4. Re-verify with `get_screenshot`

## Fallback: No MCP Available

If pencil.dev MCP is not available (not installed, not running):

1. **File-based fallback**: Export design tokens as JSON manually from pencil.dev
2. **Place in project**: `.claude/design-tokens.json`
3. **Commands work the same** but read from the JSON file instead of MCP
4. **User manually updates** the JSON file when design system changes

The workflow stays the same; only the transport mechanism changes.

## User Interaction Pattern

- **Procedural** for: sync, tokens, screenshot
- **AskUserQuestion** for: audit findings (approve scope of fixes)
- **Conversational** for: design guidance and exploration

## Notes

- pencil.dev runs locally — no cloud dependency for design data
- `.pen` files live in the project repo alongside code
- Design tokens from pencil.dev should be the canonical source
- The MCP server starts automatically when Pencil is running
- Claude saves `.pen` files programmatically via PowerShell SendKeys (see "Saving" section above)
- Claude can launch Pencil via `Start-Process` if not already running (see "Launching" section above)
