# Test Command

Run the project test suite. This command is configurable per project via CONTEXT.md.

## Usage
```
/test               - Run all configured tests
/test <suite>       - Run specific test suite
/test watch         - Run tests in watch mode
```

## Instructions

Read the project's CONTEXT.md for test configuration. The test command adapts to whatever test framework and structure the project uses.

### Default Behavior

1. **Check CONTEXT.md** for test configuration:
   - Test runner (Jest, Vitest, pytest, go test, etc.)
   - Test commands for each suite
   - Directory structure

2. **If no CONTEXT.md test config**, auto-detect:
   - Look for `package.json` scripts (test, test:unit, test:e2e)
   - Look for `pytest.ini`, `setup.cfg`, `pyproject.toml`
   - Look for `go.mod` with `_test.go` files
   - Look for `Cargo.toml` with test targets

3. **Run the appropriate test command**

4. **Report results**:
   - Number of tests passed/failed
   - Any linting errors (if lint is part of test suite)
   - Suggestions for fixing failures

## Project Configuration

In CONTEXT.md, projects define their test setup:

```markdown
## Test Commands

| Suite | Command | Description |
|-------|---------|-------------|
| unit | `npm test` | Jest unit tests |
| lint | `npm run lint` | ESLint checks |
| e2e | `npm run test:e2e` | Playwright E2E tests |
| smoke | `npm run test:e2e:smoke` | Quick smoke tests |
```

## Options

The user may specify any configured suite name as an argument.

Common patterns:
- `unit` — Unit tests only
- `lint` — Linting only
- `e2e` — End-to-end tests
- `smoke` — Quick smoke tests
- `watch` — Tests in watch mode
- `all` — Run everything

## Output

Provide a summary:
- Number of tests passed/failed
- Any linting errors
- Suggestions for fixing failures
