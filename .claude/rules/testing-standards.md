# Testing Standards

## Core Principle

**If a user can break it by clicking, a test should catch it first.** E2E tests are the safety net that prevents regression. Visual regression tests catch drift between what was designed and what was built.

## When E2E Tests Are Required

| Trigger | Test Type | Why |
|---------|-----------|-----|
| UI feature with user interaction (forms, buttons, navigation) | E2E functional | Users click things — verify the clicks work |
| Multi-step workflow (submit → vote → results) | E2E lifecycle | Steps depend on each other — verify the chain |
| State persistence (localStorage, session, URL routing) | E2E state | State survives refresh — verify it persists |
| Layout-sensitive screen (responsive, design-system-critical) | Visual regression | Pixels drift — screenshot comparison catches it |
| Data schema change (JSON structure, API contract) | Schema validation | Structure matters — validate against schema |

## When Tests Are NOT Required

- Documentation-only changes
- Comment or whitespace edits
- Design token changes in `.pen` files (covered by `/sketch sync`)
- One-line bug fixes with obvious cause (though adding a regression test is encouraged)

## Test Tooling

| Tool | Purpose | Location |
|------|---------|----------|
| **Playwright** | E2E browser testing + visual regression | `tests/e2e/` |
| **Node.js scripts** | JSON schema validation | `tests/validate-schemas.js` |
| **preview tools** | In-session screenshot verification | During build (not persisted as tests) |

### Playwright Justification (per `dependency-philosophy.md`)

Playwright is a justified dependency:
- **Browser automation binary protocol** — impractical to implement from scratch
- **`toHaveScreenshot()`** — pixel-diff comparison requires complex image processing
- **Dev dependency only** — zero production impact, not shipped to users
- **Alternative** (manual testing every time) is exactly the problem this solves

## Test Directory Structure

```
tests/
  e2e/
    competition.spec.js    # Full lifecycle: picker → auth → submit → vote → results
    visual.spec.js         # Screenshot regression: baseline comparison per screen
    fixtures/
      test-e2e/           # Dedicated test competition data (never modify production data)
        config.json
        leaderboard.json
        rounds/
          day-01.json
          ...
  validate-schemas.js      # Existing JSON schema validation
  playwright.config.js     # Playwright configuration
```

## Test Data Rules

- **Dedicated fixtures**: Tests use `tests/e2e/fixtures/test-e2e/` — a purpose-built competition
- **Never modify production data**: Tests must not write to `competitions/` directory
- **Deterministic state**: Fixture data has known members, submissions, votes, winners
- **Phase coverage**: Fixture rounds cover all phases (submission, voting, results)
- **Reset between runs**: Tests clear localStorage and start fresh

## Dogfood-First Testing

**Test data must flow through the system, not be pre-loaded.**

When testing a feature end-to-end, data should be created using the same flows a real user would use — UI forms, Worker API endpoints, auth flows. Pre-seeded JSON files are acceptable for unit/visual regression tests, but integration and E2E tests must exercise the actual write path.

### Why This Matters

Pre-loaded test data masks broken write paths. A submission form might look correct with seeded data but fail completely when the Worker `/submit` endpoint has a bug, because no test ever called that endpoint.

### Implementation Order Consequence

Features that create data must be built and working BEFORE features that display data can be properly tested:

```
Create Competition → Add Members → Auth (join) → Submit Songs → Vote → Tally → View Results
```

If "Create Competition" doesn't work through the system, everything downstream is tested against fake data that never proved the write path works.

### Acceptable Pre-Loading

| Context | Pre-loaded OK? | Why |
|---------|---------------|-----|
| Visual regression baselines | Yes | Testing pixel output, not data flow |
| Component screenshot tests | Yes | Testing layout, not API |
| Schema validation | Yes | Testing structure, not creation |
| E2E lifecycle tests | **No** | Must exercise the full write path |
| Integration tests | **No** | Must hit real Worker endpoints |
| Manual QA / demo | **No** | Must use Create Competition flow |

### Pragmatic Caveat

Dogfood-first is the goal, not a gate. There are situations where synthetic/seeded data is necessary to make progress:

- **The write path doesn't exist yet** — If Create Competition isn't built, you still need data to develop and test the UI that displays competitions. Seed it, note the gap, build the write path, then re-test through the system.
- **Reproducing edge cases** — Certain states (tied votes, 31 rounds of data, unicode member names) may be impractical to create through the UI every time. Synthetic fixtures for these are fine.
- **Parallel workstreams** — A frontend developer shouldn't be blocked waiting for a backend endpoint to test their layout. Seed data, ship the UI, wire up the real endpoint, then verify end-to-end.

The rule is: **know the difference between "we tested this through the system" and "we tested this against synthetic data."** Both are valid — but only the first proves the full path works. Don't let synthetic data give false confidence that the write path is solid when it's never been exercised.

## Visual Regression Standards

### Viewport Sizes

| Name | Width × Height | Represents |
|------|---------------|------------|
| Desktop | 1280 × 800 | Standard laptop |
| Tablet | 768 × 1024 | iPad portrait |
| Mobile | 375 × 812 | iPhone 13 |

### Threshold

- **maxDiffPixelRatio**: 0.01 (1% pixel difference allowed — covers anti-aliasing and font rendering)
- Layout shifts, missing elements, and color changes will exceed this threshold and fail

### Baseline Management

- Baseline screenshots stored in `tests/e2e/visual.spec.js-snapshots/`
- Update baselines intentionally: `npx playwright test --update-snapshots`
- Review baseline diffs in PR reviews — visual changes should be intentional

## Dog-Food Testing Pattern

For features with complex user journeys, write a "dog-food simulation" that exercises the full lifecycle end-to-end:

1. **Start fresh** — no cached state, no localStorage
2. **Walk through every user path** — happy path AND edge cases
3. **Verify each state transition** — UI reflects the correct phase/data
4. **Check responsive** — repeat critical paths at mobile viewport
5. **Assert against design** — compare screenshots to `.pen` design nodes

This is more thorough than unit tests and catches the integration issues that emerge when real users interact with the system.

## Integration with Other Rules

- **visual-workflow.md** — Build phase UI verification loop uses preview tools; visual regression tests persist that verification across sessions
- **dependency-philosophy.md** — Playwright is a justified dev dependency
- **error-recovery.md** — Test failures are Degraded severity; report full picture ("47 of 50 passed")
- **rapid-cycle.md** — During build phase, run tests after completing each major feature area

## Anti-Patterns

**Testing implementation details**: Testing CSS selectors, internal state, or framework internals instead of user-visible behavior

**Flaky time-dependent tests**: Relying on real-time phase transitions instead of fixture data with deterministic phases

**Testing in production data**: Modifying `competitions/` JSON during tests — always use dedicated fixtures

**Screenshot tests without review**: Updating baselines without looking at the diffs — defeats the purpose

**Skipping mobile**: "It works on desktop" is not the same as "it works" — mobile touch targets, visibility, and layout matter
