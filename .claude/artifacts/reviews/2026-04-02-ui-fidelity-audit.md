# UI Fidelity Audit — Rocktober v2 Live Site vs Mockups

**Date**: 2026-04-02
**Audited**: https://narehk.github.io/Rocktober/ (live GitHub Pages deployment)
**Compared Against**: `.claude/artifacts/rocktober2-ui/*.png` (11 mockups from 2026-03-31 discovery)
**Viewport**: 1280x800 desktop, 375x812 mobile

---

## Summary

| Category | Matches | Partial | Missing | Total |
|----------|---------|---------|---------|-------|
| Screens Implemented | 5 | 4 | 2 | 11 |
| Critical Drift | — | — | — | 6 items |
| Minor Drift | — | — | — | 8 items |

**Overall Fidelity**: ~60% — Core flow works, but several mockup features are absent or visually different.

---

## Screen-by-Screen Comparison

### 1. Competition Picker (HQqMn.png)

**Mockup shows**:
- Two-column card layout with hot pink left border on active card
- "ENTER THE ARENA" CTA button per card
- Current round number, member count, total rounds inline
- Today's theme preview inside active card
- "Champion: Alex (9 wins)" on completed card
- "VIEW RESULTS" button on completed card

**Live site has**:
- Two-column cards with subtle border (no hot pink accent)
- No CTA button — entire card is clickable
- Date range, member count, round count shown
- Description text instead of theme preview
- No champion display on completed card
- Status badges (ACTIVE/COMPLETED) — matches mockup

**Drift**:
- **Missing**: "ENTER THE ARENA" / "VIEW RESULTS" buttons (minor — clickable card is arguably better UX)
- **Missing**: Today's theme preview in active card (medium — useful context before entering)
- **Missing**: Champion display on completed card (medium — good social proof)
- **Different**: Border style is subtle gray vs hot pink accent (minor)

---

### 2. Sign-In / Auth (GgOKB.png)

**Mockup shows**:
- Centered modal-style sign-in
- "Continue with GitHub" button
- "Continue with Microsoft" button
- "OR" divider
- Invite code input field
- "JOIN THE BATTLE" CTA button
- Subtitle: "Season 2: Electric Boogaloo"

**Live site has**:
- Inline auth bar at top of competition view (not modal)
- Invite code input + "JOIN" button only
- No OAuth buttons (GitHub/Microsoft)
- No season subtitle

**Drift**:
- **Missing**: OAuth buttons (known constraint — W-12444 notes Spotify premium required, but GitHub/Microsoft OAuth was in the mockup)
- **Different**: Auth is inline header, not centered modal (design choice vs mockup)
- **Missing**: "JOIN THE BATTLE" branding (minor)

---

### 3. Submission Phase (pwrwt.png, kqoA5.png)

**Mockup shows**:
- Search bar with provider tabs (Spotify, YouTube, Apple, SoundCloud, Tidal)
- Search results with album art, song title, artist, duration
- "SUBMIT" button per result
- Provider status indicators in sidebar (connected/disconnected)
- Search box with "on Spotify" badge
- Submissions list below search with album art, submitter, service links

**Live site has**:
- Search bar present (when authenticated)
- No provider tabs visible (searches via iTunes API, no provider switching UI)
- Submit flow works
- Submissions display with album art, service links (Spotify, YT Music, Apple)
- Reactions (fire, heart, skull, 100) below each card

**Drift**:
- **Missing**: Provider tabs UI (search works but no visual provider selection — medium)
- **Missing**: "SEARCHING VIA" sidebar panel showing provider status (medium)
- **Different**: Search provider indicator not shown (using iTunes, not Spotify as mockup shows)
- **Present and good**: Album art, song cards, service links, reactions all work

---

### 4. Voting Phase (QNDce.png)

**Mockup shows**:
- "Cast Your Vote" header
- Song cards with "VOTE" button (pink), "YOUR SUBMISSION" disabled state, "VOTED" state (yellow)
- Voting info panel in sidebar: description, countdown timer, "1h 23m remaining"
- Reactions below each card

**Live site has**:
- VOTING badge and "RESULTS IN: NOW" countdown text
- VOTE buttons on cards (work correctly)
- Self-vote prevention works
- No dedicated "Cast Your Vote" header
- No voting info sidebar panel — just inline countdown text

**Drift**:
- **Missing**: Voting info sidebar panel with countdown timer (medium — helpful context)
- **Missing**: "Cast Your Vote" section header (minor)
- **Present and good**: Vote buttons, self-vote disabled, VOTED state all work correctly

---

### 5. Results Phase (dmaDG.png)

**Mockup shows**:
- "ROUND 7 WINNER" trophy header
- Winner card with gold border, album art, play button, song title, artist, submitter, vote count
- "Export Round 7 Playlist" bar with Spotify button + "More" dropdown
- "All Submissions" section below winner
- Reaction counts (fire: 4, guitar: 4, heart: 2) with numbers
- Sidebar: leaderboard with win count changes (up arrows), "PLAYLISTS" section with export links

**Live site has**:
- "WINNER" header with gold glow effect
- Winner card with gold border — song title, artist, submitter (no play button on winner card)
- Submission cards show "0 VOTES" (vote counts may not be populated in test data)
- "COPY PLAYLIST" and "OPEN IN SPOTIFY" buttons
- Reactions icons present but no counts visible
- Leaderboard in sidebar (no change arrows)

**Drift**:
- **Missing**: Playlist export bar with "More" dropdown (have simpler buttons instead — minor)
- **Missing**: Vote count numbers on submissions in results (may be test data issue — verify)
- **Missing**: Reaction counts (icons show but counts don't appear — medium)
- **Missing**: Leaderboard change arrows (up/down indicators — minor)
- **Missing**: "PLAYLISTS" sidebar section with "Export Round" and "Full Season" links (medium)
- **Bug**: Winner card shows broken image alt text instead of album art ("Every Rose Has Its Thorn" text where art should be)

---

### 6. Settings Page (LZbr0.png)

**Mockup shows**:
- Full settings page with left sidebar navigation (Competition, Notifications, Display, Export/Import)
- Competition Settings: name, dates, timezone, schedule times
- Notification Settings: Teams webhook URL, toggle, notification type checkboxes
- Display Settings: CRT scanlines, neon glow, grid background, animations toggles, accent color picker, reaction icon set selector, font size selector, card format selector
- Export/Import Config: JSON export and import buttons with "SAVE" and "CHANGELOG" buttons

**Live site**: Not navigated to during audit — needs verification. Settings panel exists in sidebar on competition view with theme selector (neon/classic/minimal) and display toggles.

**Expected drift**: Significant — mockup shows a full standalone page with deep configurability. Live implementation likely has a subset in the sidebar panel.

---

### 7. Profile Page (zGy5d.png)

**Mockup shows**:
- Full profile page with left sidebar nav (Profile, Music Providers, My Notifications, Connected Accounts, My Data)
- Profile section: avatar with color picker, display name, tagline
- Music Providers: Spotify (connected, default), YouTube Music (connected), Apple Music, SoundCloud, Tidal (all with connect buttons)
- Connected Accounts: GitHub (connected), Microsoft (link button)
- My Stats: wins, submissions, win rate, ranking

**Live site**: **Not implemented**. No profile page, no navigation to it, no route for it.

**Drift**: **Entirely missing** — this is a full feature gap, not cosmetic drift.

---

### 8. Playlist Export (GeiRp.png, kEkNN.png)

**Mockup shows**:
- Modal/panel with "Round 7 Playlist" showing numbered song list with album art
- Playlist name input field (editable)
- Export target selector (Spotify, YouTube, Apple)
- "CREATE PLAYLIST ON SPOTIFY" button (green, full-width)
- "Full Season Playlist" section: song count, round count, include-all toggle, auto-update toggle, "CREATE SEASON PLAYLIST" button (yellow)
- Song card playback states (kEkNN.png): idle state with play button + "0:30 preview" label, playing state with progress bar + time display

**Live site has**:
- "COPY PLAYLIST" button (copies text to clipboard)
- "OPEN IN SPOTIFY" button (opens Spotify web)
- No modal/panel — buttons are inline below submissions
- No playlist name customization
- No full season playlist feature
- No export target selection

**Drift**:
- **Missing**: Playlist creation modal with full controls (significant)
- **Missing**: Full season playlist feature (significant)
- **Missing**: Export target selection (medium)
- **Present**: Basic copy-to-clipboard and open-in-Spotify work

---

### 9. Song Card Playback (UwpSN.png)

**Mockup shows**:
- Idle state: play button on album art, "0:30 preview" badge
- Playing state: cyan/teal glow border, pause icon, progress bar with elapsed/total time, animated waveform feel

**Live site has**:
- Album art displays on cards
- No visible play button overlay
- No progress bar visible in current view
- 30-second preview may work via click but visual states not matching mockup

**Drift**:
- **Different**: Playback UI states don't match the polished mockup design (medium)
- **Needs testing**: Whether click-to-play works and what visual feedback is given

---

### 10. Round Chat / Comments (kqoA5.png bottom)

**Mockup shows**:
- "Round Chat" section at bottom of main content
- Comment bubbles with colored avatar circles, username, timestamp, message text
- Comment input field with "SEND" button

**Live site has**:
- "COMMENTS" section header
- Comments display with username and text (no avatars, no timestamps)
- Delete button on own comments
- Comment input field present (when authenticated)

**Drift**:
- **Missing**: Colored avatar circles per user (minor — nice UX touch)
- **Missing**: Timestamps on comments (medium — useful context)
- **Different**: Section titled "COMMENTS" not "Round Chat" (minor)
- **Present and good**: Comment posting and deletion work

---

### 11. Mobile Responsive (tested at 375x812)

**No specific mockup** — tested live behavior.

**Observations**:
- Layout collapses to single column correctly
- Sidebar (leaderboard, info) stacks below main content
- Round badge text wraps at narrow width (text breaks mid-word on "2026-03-26")
- Song cards readable but service link buttons are small
- VOTE button accessible
- Album art scales appropriately

**Issues**:
- **Round badge date wrapping**: Text breaks awkwardly at mobile width (minor)
- **Service link touch targets**: Spotify/YT Music/Apple buttons are small for fingers (known — was already fixed once in commit 765b424 but still tight)

---

## Critical Issues (Blocking or Significant)

| # | Issue | Severity | Screen |
|---|-------|----------|--------|
| 1 | Profile page entirely missing | High | zGy5d.png |
| 2 | Playlist creation modal/panel missing | High | GeiRp.png |
| 3 | Full season playlist feature missing | High | GeiRp.png |
| 4 | Winner card shows broken image alt text instead of album art | Medium | Results phase |
| 5 | Settings page likely subset of mockup (needs verification) | Medium | LZbr0.png |
| 6 | Reaction counts not displayed (icons only, no numbers) | Medium | Results phase |

## Minor Issues (Polish / Nice-to-Have)

| # | Issue | Screen |
|---|-------|--------|
| 1 | No "ENTER THE ARENA" / "VIEW RESULTS" buttons on picker cards | Picker |
| 2 | No champion display on completed competition card | Picker |
| 3 | No today's theme preview in active card | Picker |
| 4 | Auth is inline, not centered modal style | Auth |
| 5 | No provider tabs for search | Submission |
| 6 | No voting info sidebar panel with countdown | Voting |
| 7 | No comment avatars or timestamps | Comments |
| 8 | Round badge date text wraps at mobile width | Mobile |

---

## Recommendations

1. **Change Order needed** for: Profile page, Playlist creation, Full season playlist, Settings page parity
2. **Bug fix** for: Winner card broken album art image
3. **Polish pass** for: Reaction counts, Picker card enhancements, Voting info panel
4. **Design decision needed**: Were Profile and Playlist creation intentionally deferred, or dropped during build without documentation?
