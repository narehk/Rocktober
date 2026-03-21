# Simplify Command

Review recent changes for unnecessary complexity and suggest simplifications.

## Instructions

1. **Identify recent changes**:
   - Run `git diff HEAD~3` to see recent changes (adjust range as needed)
   - Or review files the user specifies

2. **Look for complexity patterns**:

   **Over-engineering**:
   - Unnecessary abstractions (helper functions used once)
   - Feature flags for features that won't change
   - Excessive configuration options
   - Generic solutions for specific problems

   **Unnecessary code**:
   - Unused imports/variables
   - Dead code paths
   - Redundant null checks
   - Over-defensive error handling

   **Premature optimization**:
   - Caching that's not needed
   - Complex algorithms where simple ones work
   - Micro-optimizations that hurt readability

   **Documentation overhead**:
   - Comments explaining obvious code
   - JSDoc for self-explanatory functions
   - Redundant type annotations

3. **Suggest simplifications**:
   - Keep the minimum code that solves the problem
   - Prefer explicit over clever
   - Delete over comment-out
   - Inline over abstract (for single use)

4. **Do NOT simplify**:
   - Security-related code
   - Error handling at system boundaries
   - Accessibility features
   - Performance-critical paths (if proven necessary)

## Output Format

```markdown
## Simplification Opportunities

### [File: path/to/file.js]

**Issue**: [Description of complexity]
**Suggestion**: [Simplified approach]
**Before**: [Code snippet]
**After**: [Simplified code]

### Summary
- X opportunities found
- Estimated lines removable: Y
```

## Philosophy

> "The right amount of complexity is the minimum needed for the current task."
