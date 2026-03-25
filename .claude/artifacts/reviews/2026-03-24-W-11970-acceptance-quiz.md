# Acceptance Quiz: W-11970 + W-11972

**Date**: 2026-03-24
**Status**: completed
**Score**: 3/5
**Reviewed By**: KJ
**Review Type**: self-review
**Author Quiz By**: (code review artifact served as author review)

## Drift Report

| Criterion | Status |
|-----------|--------|
| Song search returns Spotify results | Implemented |
| Worker proxies Spotify securely | Implemented |
| Member submits song to round | Implemented |
| One submission per member per round | Implemented |
| Search works without Spotify account | Implemented |
| Theme reveal Action runs on schedule | Implemented |
| Ballot open transitions phase | Implemented |
| Vote tally computes winner + leaderboard | Implemented |
| Schedule configurable per competition | Implemented |
| Weekend/off-day handling | Implemented |
| Rate limiting on Worker | Not implemented (WARNING - accepted for v1) |

**Assessment**: No scope drift detected. All Gherkin acceptance criteria from both frozen Requirements are implemented. Rate limiting was identified during code review as a WARNING and deliberately deferred.

## Questions

### Q1: Why client credentials flow over user auth?
- A) Faster to implement
- B) Members shouldn't need Spotify account (correct)
- C) HTTPS requirement <- selected

### Q2: Root cause of UTC timezone bugs?
- A) Pacific time runners
- B) parseDate UTC + getDay local mismatch (correct) <- selected
- C) Cron local vs Date UTC

### Q3: What was deliberately excluded?
- A) Album art
- B) Rate limiting (correct) <- selected
- C) Vote tallying

### Q4: Leaderboard recomputation trade-off?
- A) Performance vs consistency (correct) <- selected
- B) Overwrites manual edits
- C) Merge conflicts

### Q5: Second submission handling?
- A) Rejected server-side <- selected
- B) Replaced with confirmation dialog (correct)
- C) Both kept

## Summary

3/5 correct. Strong understanding of testing decisions and architecture trade-offs. Gaps on the specific design rationale for client credentials (user-account-independence) and the replacement-not-rejection submission pattern. Both are documented in the Gherkin scenarios and code review artifact.
