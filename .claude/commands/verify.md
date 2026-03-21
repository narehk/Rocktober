# Verify Command

Run full project verification to ensure everything works. Configurable per project via CONTEXT.md.

## Usage
```
/verify             - Standard verification (default)
/verify quick       - Skip build and health checks
/verify full        - Include E2E tests
```

## Instructions

Read the project's CONTEXT.md for verification configuration. The verify command adapts to the project's stack.

### Default Verification Steps

1. **Code Quality** — Lint checks for all configured languages
2. **Tests** — Run unit/integration test suites
3. **Build** — Verify production build succeeds
4. **Health Checks** — Verify running services respond (if applicable)
5. **E2E Tests** — End-to-end smoke tests (full mode only)

### Execution

1. **Check CONTEXT.md** for verify configuration
2. **If no config**, auto-detect from project structure
3. **Run each check sequentially**, reporting results
4. **Stop on critical failures** (optional — configurable)

## Project Configuration

In CONTEXT.md, projects define their verify steps:

```markdown
## Verify Steps

| Step | Command | Mode |
|------|---------|------|
| Backend Lint | `npm run lint --prefix packages/backend` | quick, standard, full |
| Frontend Lint | `npm run lint --prefix packages/frontend` | quick, standard, full |
| Unit Tests | `npm test --prefix packages/backend` | standard, full |
| Frontend Build | `npm run build --prefix packages/frontend` | standard, full |
| Health Check | `curl -s http://localhost:3000/health` | standard, full |
| E2E Tests | `npm run test:e2e:smoke` | full |
```

## Output Format

```markdown
## Verification Results

| Check | Status | Notes |
|-------|--------|-------|
| Lint | PASS/FAIL | details |
| Tests | PASS/FAIL | X passed, Y failed |
| Build | PASS/FAIL | bundle size |
| Health | PASS/FAIL | healthy/unhealthy |
| E2E | PASS/FAIL/SKIPPED | details |

## Summary
- Overall: PASS/FAIL
- Issues to address: [list if any]
```

## Modes

### Quick Mode (`/verify quick`)
Skip time-consuming steps:
- Skip build
- Skip health checks
- Skip E2E tests

### Standard Mode (default)
Run all checks except E2E:
- Lint
- Tests
- Build
- Health checks (if servers are running)

### Full Mode (`/verify full`)
Everything including E2E:
- All standard checks
- E2E smoke tests

## Failure Handling

If any check fails:
1. Report the specific failure
2. Suggest how to fix it
3. Do NOT proceed with commits/PRs until fixed
