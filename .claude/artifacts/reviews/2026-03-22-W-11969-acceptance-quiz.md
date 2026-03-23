# Acceptance Quiz: W-11969 — Frontend — Daily Round Experience

**Date**: 2026-03-22
**Status**: completed
**Score**: 5/5
**Reviewed By**: KJ
**Review Type**: self-review
**Author Quiz By**: KJ

## Drift Report

| Criterion | Status |
|-----------|--------|
| App determines current round and phase | Implemented ✓ |
| Submission phase displays theme and songs | Implemented ✓ |
| Voting phase enables ballot casting | Implemented ✓ |
| Results phase reveals the winner | Implemented ✓ |
| Loading and error states are on-brand | Implemented ✓ |
| Phase transitions without page reload | Implemented ✓ |
| Vanilla JS with responsive 80s aesthetic | Implemented ✓ |
| User identity via dropdown + localStorage | Added ⚠️ |

**Assessment**: All 7 planned Gherkin scenarios implemented. One feature added outside plan — user identity selector — as a necessary prerequisite for self-vote prevention (Scenario 3). Scope drift is minimal and justified.

## Questions

### Q1: Scenario 3 requires "a member cannot vote for their own submission." Which implementation detail fulfills this criterion?
- A) The vote button is hidden entirely for the submitter's own card
- **B) The vote button shows "YOUR SONG" (disabled) when submitter matches currentUser, and handleVote() exits early on self-vote** ✓ ← selected
- C) The server (Cloudflare Worker) rejects self-votes at the API level

### Q2: Which of the following was NOT part of the original 7 Gherkin scenarios but was added during implementation?
- A) CRT flicker loading state
- **B) User identity selector ("PLAYING AS" dropdown in the header)** ✓ ← selected
- C) Phase detection from schedule times + timezone
- D) Vote tallies displayed on results phase cards

### Q3: Scenario 6 requires phase transitions without page reload. How does the implementation satisfy this?
- A) WebSocket connection to the Cloudflare Worker pushes phase change events
- **B) refreshRound() polls every 60 seconds and recomputes the phase from schedule times** ✓ ← selected
- C) A Service Worker intercepts fetch requests and triggers re-renders from cache

### Q4: W-11971 (Voting & Leaderboard) was blocked by W-11969. Now that W-11969 is complete, what overlap exists between the two items that could cause rework?
- **A) W-11969 added client-side vote UI and localStorage persistence; W-11971 will need to replace localStorage with server-side tally logic and may redesign vote buttons** ✓ ← selected
- B) No overlap — W-11971 is entirely about the leaderboard, not voting
- C) W-11969 already completed all voting functionality, making W-11971 redundant

### Q5: Scenario 4 requires "vote tallies are shown for all submissions" in the results phase. Where does the current implementation source vote tally data?
- A) It computes tallies by counting localStorage entries across all users
- **B) It reads the votes field from each submission object in the round JSON file** ✓ ← selected
- C) It queries the Cloudflare Worker API for real-time vote counts

## Summary

Perfect score demonstrates full command of the implementation: accurate mapping of Gherkin scenarios to code, clear identification of the one scope addition (user identity), understanding of downstream impact on W-11971, and knowledge of where data flows between JSON files, localStorage, and the rendering layer.
