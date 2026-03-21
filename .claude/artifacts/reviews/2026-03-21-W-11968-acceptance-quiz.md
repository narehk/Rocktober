# Acceptance Quiz: W-11968 — Competition & Round Data Model

**Date**: 2026-03-21
**Status**: completed
**Score**: 2/4
**Reviewed By**: KJ
**Review Type**: unknown
**Author Quiz By**: none

## Drift Report

| Criterion | Status |
|-----------|--------|
| config.json with metadata, members, themeMode, schemaVersion | Implemented ✓ |
| Schedule fields (startDate, endDate, submissionOpen, votingOpen, resultsReveal) | Implemented ✓ |
| submissionClose, votingClose explicit fields | Not implemented ⚠️ (implicit transitions used instead) |
| themeMode supports assigned and round-robin | Implemented ✓ |
| Round files with theme, themePicker, submissions, phase | Implemented ✓ |
| Leaderboard with sorted standings, wins, submissions, winRate | Implemented ✓ |
| Self-voting prevention documented + validator check | Implemented ✓ |
| Sample data: 23 days, 4-5 members | Partial ⚠️ (3 days created, not 23) |
| tests/validate-schemas.js passes all files | Implemented ✓ |

**Assessment**: Two deviations from Gherkin: sample data reduced from 23 to 3 rounds (pragmatic — covers all phases), and explicit close times replaced with implicit transitions. Both are reasonable simplifications. Core schema design is solid.

## Questions

### Q1: The original Gherkin specified '23 days of sample data'. How many round files were actually created?
- A) 23 — full dataset as specified
- B) 3 — enough to demonstrate all three phases ← selected ✓ (correct)
- C) 5 — one work week of sample data

### Q2: The config schema includes a 'selfVoteAllowed' boolean. Where is this rule actually enforced?
- A) In app.js — the vote button is hidden for your own submission
- B) In validate-schemas.js — the validator checks for duplicate submitters in results phase ✓ (correct)
- C) It's documented in the schema but not enforced anywhere yet ← selected (incorrect)

### Q3: Completing W-11968 unblocks several items. Which of these is NOT directly unblocked?
- A) W-11969 (Frontend — Daily Round Experience)
- B) W-11971 (Voting & Leaderboard) ← selected ✓ (correct)
- C) W-11970 (Song Search & Submission)

### Q4: The Gherkin specified schedule fields including 'submissionClose' and 'votingClose'. Were these implemented?
- A) Yes — all open/close times are in the config ← selected (incorrect)
- B) Partially — open times exist but close times were omitted in favor of implicit transitions ✓ (correct)
- C) No — schedule was left out entirely

## Summary

Strong understanding of dependency chains and scope decisions. Correctly identified the sample data reduction and which downstream items remain blocked. Missed the subtle validator enforcement of selfVoteAllowed and the implicit vs explicit schedule transition design choice. Both are implementation details that emerge during coding rather than planning.
