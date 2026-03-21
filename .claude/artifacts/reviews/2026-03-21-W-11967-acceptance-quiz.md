# Acceptance Quiz: W-11967 — Project Scaffolding & Static Site Shell

**Date**: 2026-03-21
**Status**: completed
**Score**: 2/4
**Reviewed By**: KJ
**Review Type**: unknown
**Author Quiz By**: none

## Drift Report

| Criterion | Status |
|-----------|--------|
| Directories css/, js/, competitions/ exist | Implemented ✓ |
| index.html at root with css/styles.css and js/app.js | Implemented ✓ |
| Semantic structure: header, main, sidebar, footer | Implemented ✓ |
| Press Start 2P pixel font on headings | Implemented ✓ |
| Dark background with neon glow text-shadows | Implemented ✓ |
| CRT scanline effects visible | Implemented ✓ |
| No npm dependencies or build step | Implemented ✓ |
| All assets use relative paths | Implemented ✓ |
| serve.js dev server | Added ⚠️ |
| findLatestRound() date fallback logic | Added ⚠️ |

**Assessment**: Two items added outside original scope (dev server and date fallback). Both are pragmatic additions for development/demo purposes and don't affect the production static site. No criteria were missed.

## Questions

### Q1: The CRT scanline effect is implemented using which CSS technique?
- A) A repeating-linear-gradient on a fixed overlay div ✓ (correct)
- B) A CSS animation with alternating opacity frames
- C) An SVG filter applied to the body element
- User answered: "I don't know" (incorrect)

### Q2: Which of these was NOT part of the original scaffolding acceptance criteria but was added during implementation?
- A) Press Start 2P pixel font via Google Fonts
- B) A Node.js dev server (serve.js) for local preview ← selected ✓ (correct)
- C) Semantic HTML with header, main, sidebar, and footer

### Q3: The scaffolding requirement specified 'zero-dependency static hosting'. What is the ONE external dependency the site relies on?
- A) jQuery CDN for DOM manipulation
- B) Google Fonts for Press Start 2P typeface ✓ (correct)
- C) Bootstrap CSS for the grid layout
- User answered: challenged the premise (Google Fonts is explicitly allowed per Gherkin Scenario 3)

### Q4: How might completing W-11967 (scaffolding) affect W-11969 (Frontend — Daily Round Experience)?
- A) W-11969 was blocked by W-11967 — it can now partially proceed (still blocked by W-11968) ← selected ✓ (correct)
- B) W-11969 is unrelated and unaffected
- C) W-11969 is fully unblocked and ready to start immediately

## Summary

Strong understanding of scope boundaries and work item dependencies. The user correctly identified scope drift (serve.js) and understood the blocking relationship between items. Implementation-detail questions (CSS technique) were understandably missed since the user is testing the framework workflow, not authoring the CSS. The challenge on Q3 (Google Fonts) showed careful attention to the acceptance criteria wording.
