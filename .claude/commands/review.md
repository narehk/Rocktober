# Code Review Command

Trigger a thorough code review of recent changes.

## Usage
```
/review           - Review uncommitted changes
/review --staged  - Review only staged changes
/review <file>    - Review specific file
```

## Instructions

Use the code-review skill to perform a thorough quality review.

### Steps

1. **Identify Changes**
   ```bash
   git status
   git diff --name-only
   git diff --staged --name-only  # if --staged flag
   ```

2. **Launch Review Agent**
   Use the Skill tool to invoke the code-review skill:
   ```
   Skill tool with skill: "code-review"
   ```

3. **Report Findings**
   Present the review results organized by severity:
   - CRITICAL issues first
   - Then ERROR
   - Then WARNING
   - Then INFO

### When to Use

- After completing a feature implementation
- Before creating a commit
- When you want a second opinion on code quality

### Example Output

```
## Code Review Results

### Critical Issues (0)
None found.

### Errors (1)
- **src/routes/auth.js:45** - Missing null check on request body

### Warnings (2)
- **src/components/Dashboard.jsx:23** - Unused import
- **src/services/api.js:67** - Consider error boundary

### Summary
1 error and 2 warnings found. Address the error before committing.
```
