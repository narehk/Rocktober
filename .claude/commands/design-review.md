# Design Review Command

**Command**: `/design-review [file-or-component]`

**Purpose**: Validate component implementation against design system before showing user.

## What It Does

Self-checks component implementation for:
1. Uses design tokens (no hardcoded colors)
2. Uses shared components where available
3. Interactive elements have adequate touch targets (44px minimum)
4. Focus indicators present on interactive elements
5. Color contrast passes WCAG AA (4.5:1 text, 3:1 UI)
6. Component patterns match project design system

## Usage

### Before showing user new UI:
```bash
/design-review src/components/NewFeature.jsx
```

### After making UI changes:
```bash
/design-review
```
(Reviews all modified files)

## Checks Performed

### 1. Design Token Usage
**Rule**: No hardcoded hex colors in classNames/styles

**Detection**: Search for hardcoded color values in className, style attributes

### 2. Shared Component Usage
**Rule**: Use project's shared components instead of raw HTML elements

**Detection**: Check for raw `<button>`, `<input>`, `<select>` tags when shared components exist

### 3. Touch Target Size
**Rule**: Interactive elements must be at least 44px (WCAG 2.1)

**Detection**: Search for interactive elements without adequate min-height

### 4. Focus Indicators
**Rule**: All interactive elements need visible focus states

**Detection**: Check for focus-related styles on interactive elements

### 5. Color Contrast (WCAG AA)
**Rule**: Text must meet 4.5:1 ratio, UI components 3:1

### 6. Component Patterns
**Rule**: Follow project's established patterns from CONTEXT.md

## Output Format

### When all checks pass:
```
Design Review: PASSED
  - No hardcoded colors detected
  - Using shared components
  - Touch targets >= 44px
  - Focus indicators present
  - WCAG AA contrast ratios verified

Ready to show user!
```

### When issues found:
```
Design Review: FAILED (3 issues)

1. Hardcoded color detected (Line 45):
   <div className="bg-[#0369a1]">
   Fix: Use design token from CONTEXT.md

2. Manual button without touch target (Line 67):
   <button className="px-2 py-1">
   Fix: Use shared Button component or add min-h-[44px]

3. Missing focus indicator (Line 89):
   <button className="bg-primary">
   Fix: Add focus:ring-2 or equivalent focus style

Fix these issues before showing user.
```

## Configuration

The design review adapts to each project. CONTEXT.md specifies:
- Available shared components
- Design token naming conventions
- CSS framework (Tailwind, CSS modules, styled-components, etc.)
- Color system

### 7. Screenshot Verification
**Rule**: Every UI change must be visually verified with screenshots

**Process**:
1. Capture screenshots of affected components/pages after implementation
2. Compare against design artifacts in `.claude/artifacts/` if available
3. Verify using the visual-workflow checklist:
   - Positioning and alignment correct?
   - Dimensions match expectations?
   - Visual appearance matches design?
   - Spacing consistent with design system?
   - Interactive elements visible and functional?
4. Include before/after screenshots when modifying existing UI

**Tools**: Use `get_screenshot` (pencil.dev), browser screenshot, or framework dev server as available.

**Detection**: Flag any UI change that hasn't been screenshot-verified.

## Integration with Workflow

1. **Implement feature** using shared components
2. **Run `/design-review`** (self-check, includes screenshot verification)
3. If **PASSED**: Show user for approval (include screenshots)
4. If **FAILED**: Fix issues, repeat step 2

## Related Commands

- `/verify` - Full verification (lint, test, build, health)
- `/prototype` - Generate prototypes with shared components
