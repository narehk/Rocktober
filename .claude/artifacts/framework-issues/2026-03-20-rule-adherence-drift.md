# Rule Adherence Drift Under Long Context

## Problem

Claude violates its own behavioral rules (consultation-first, roles-and-governance) as context window fills during long sessions. Rules loaded early in the conversation lose salience relative to recent working patterns. The user had to manually stop Claude from editing a file based on discussion feedback that was not an implementation request.

## Evidence

- Session: 2026-03-20, Rocktober WorkSpaceFramework testing
- Trigger: User provided feedback about a UX gap in `/work ready` flow
- Expected: Claude presents options, asks for approval before editing
- Actual: Claude immediately started editing `work.md`
- User had to reject the tool call and cite the rules

## Analysis

### Why the Rules Didn't Prevent It

The rules are correct and comprehensive. Three separate documents explicitly prohibit this behavior:
- `consultation-first.md`: "Even explicit requests require confirmation"
- `roles-and-governance.md`: "No surprises principle"
- `CLAUDE.md`: "Consultation First: Discuss before implementing"

The failure is **adherence under load**, not rule quality.

### Contributing Factors

1. **Context distance**: Rules are injected at conversation start. After hours of work + compaction, they're the furthest content from the active working area in the context window.

2. **Pattern momentum**: After 20+ rounds of "user approves → Claude implements → user approves → Claude implements", the consultation gate gets skipped because recent context strongly patterns toward immediate action.

3. **Feedback misclassification**: User saying "here's what I'd change" gets conflated with "change this" because the session has been in a build-iterate loop.

## Potential Solutions to Evaluate

### A. Distributed CLAUDE.md Files
Place `CLAUDE.md` files in key subdirectories (`.claude/commands/CLAUDE.md`, `.claude/providers/CLAUDE.md`) with the critical rules for that context. These get loaded when files in that directory are being edited, keeping rules close to the action.

**Pro**: Rules travel with the files they govern
**Con**: Duplication, maintenance burden, may not be loaded by all tools

### B. Shared Memory / Rule Reinforcement
A mechanism to re-inject critical rules at compaction boundaries or after N tool calls. Could be a "rule pulse" that periodically surfaces the top 3 behavioral rules.

**Pro**: Addresses the root cause (distance from rules)
**Con**: Consumes context, may feel repetitive

### C. Pre-Edit Structural Checklist
A mandatory mental checklist before any Edit/Write call:
1. Was this change explicitly authorized?
2. Did I present options first?
3. Is this within approved scope?

**Pro**: Simple, enforceable as a rule
**Con**: Still relies on adherence (same failure mode)

### D. Rule Weighting / Priority Tiers
Mark certain rules as "Tier 1 — never skip" with stronger language and positioning. Consultation-first would be Tier 1.

**Pro**: Creates hierarchy of importance
**Con**: All rules already use strong language; the issue is recall, not emphasis

### E. Hook-Based Guardrails
Use Claude Code hooks (settings.json) to inject a reminder before file mutations. A pre-edit hook that surfaces "consultation-first: was this authorized?"

**Pro**: Structural, not behavioral — can't be forgotten
**Con**: May not be feasible in current hook system; could slow down authorized work

### F. Combination Approach
- Distributed CLAUDE.md for context proximity (A)
- Rule pulse at compaction (B)
- Tier 1 rule designation (D)

## Recommendation

Start with **A + D** — they're low-cost and testable. Distributed CLAUDE.md files keep rules close to the working area, and Tier 1 designation makes the most critical rules stand out. Evaluate B and E as the framework matures.

## Status

Open — needs framework-level work item. This is a meta-issue about the framework itself, not any specific project.
