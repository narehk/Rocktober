# Plan: Implement 8 Reopened Detail Items (W-12567 Change Order)

## Context

The v2 build phase skipped 8 Detail items without documentation. A UI fidelity audit (2026-04-02) caught the gaps. These are approved MVP requirements from discovery — they need implementation plans, not scope cuts.

## Already Delivered (this session)

- **Winner card broken album art** — Added `onerror` fallback, `album-art-wrap`, service links, vote count
- **Reaction counts invisible** — CSS font-size `0.35rem` → `0.55rem`
- **Picker card enhancements** — Theme preview, champion display, CTA buttons
- **Service link button overflow** — Added `flex-wrap: wrap` to `.open-links` (was clipping Spotify/YT Music/Apple buttons at narrow card widths)
- **Vote count grammar** — "1 VOTES" → "1 VOTE" (singular/plural)
- **All 78 Playwright tests passing** (baselines updated)

## Framework Improvement (filed for WorkSpaceFramework)

**Debug overlay tool** — Claude struggles with screenshot zoom verification because viewport coordinates shift after scrolling. Need a reusable, toggleable debug overlay that draws bounding boxes with coordinates on target elements. This is a framework-level tool, not project-specific. Should be added to `visual-workflow.md` as the standard verification pathway. Primary check: use `preview_inspect` on CSS selectors for computed values. Overlay for visual layout confirmation.

## Phase 0: Build the Design System (BEFORE implementation)

The existing `design-system.pen` was a demo of pencil.dev tooling, not the actual design system. The real visual specs are the 11 mockup PNGs in `.claude/artifacts/rocktober2-ui/`. Before implementing any of the 8 items, we need a proper `.pen` design system that:

1. **Defines all reusable components** — built from the mockup PNGs as reference
2. **Covers all screens** needed for the 8 items
3. **Uses the existing token set** (31 variables already defined — colors, fonts, spacing, radii)
4. **Becomes the source of truth** that implementation verifies against per `visual-workflow.md`

### Components to build (from mockups):

| Component | Source Mockup | Used By |
|-----------|--------------|---------|
| Auth Modal | GgOKB.png | 12253, 12254 |
| Picker Card (active) | HQqMn.png | Already implemented, needs .pen spec |
| Picker Card (completed) | HQqMn.png | Already implemented, needs .pen spec |
| Song Card (results variant) | dmaDG.png | Winner card, submission cards |
| Service Link Buttons | pwrwt.png, kqoA5.png | All song cards |
| Reaction Bar | kqoA5.png | All song cards |
| Winner Card | dmaDG.png | Results phase |
| Playlist Modal | GeiRp.png | 12281 |
| Season Playlist Panel | GeiRp.png | 12281, 12282 |
| Song Playback States | kEkNN.png, UwpSN.png | Song cards |
| Settings Page Layout | LZbr0.png | 12287, 12291 |
| Settings Nav | LZbr0.png | 12287 |
| Settings Form Controls | LZbr0.png | 12287 |
| Profile Page Layout | zGy5d.png | 12289, 12290 |
| Profile Avatar | zGy5d.png | 12289 |
| Provider Connect Card | zGy5d.png | 12290 |
| Voting Info Panel | QNDce.png | Voting phase sidebar |

### Screens to compose:

| Screen | Source Mockup | Size |
|--------|--------------|------|
| Competition Picker | HQqMn.png | 1280x800 |
| Auth Modal (overlay) | GgOKB.png | 480x auto |
| Submission Phase | pwrwt.png, kqoA5.png | 1280x800 |
| Voting Phase | QNDce.png | 1280x800 (update existing) |
| Results Phase | dmaDG.png | 1280x800 |
| Settings Page | LZbr0.png | 1280x800 |
| Profile Page | zGy5d.png | 1280x800 |
| Playlist Modal | GeiRp.png | 600x auto |

### Design Direction — Usability over pure aesthetics

The current site leans too dark — form supersedes function. The 80s arcade aesthetic is the vibe, but it needs to serve readability and usability first:

- **Contrast**: Boost text contrast against dark backgrounds. Muted text (`#555555`) on dark bg (`#0a0a0a`) is hard to read — raise muted to at least `#888888`
- **Touch targets**: Service link buttons (Spotify/YT Music/Apple) need minimum 44px touch targets on mobile
- **Information hierarchy**: Winners, vote counts, and CTAs should pop visually. Secondary info (dates, metadata) can be quieter but still readable
- **Color as function, not decoration**: Neon colors should signal interactivity and state, not just look cool. Pink = action, Blue = info, Gold = winner, Green = success
- **Accessibility**: WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text) as the baseline

### Workflow:
1. Read each mockup PNG to extract layout, structure, feature requirements
2. Build reusable components in `design-system.pen` — using existing tokens but adjusting for usability
3. Compose full screens from components
4. Screenshot each screen for review

### Versioning

Pencil.dev has no built-in version control. New `.pen` file per design iteration:
- `design-system.pen` — original demo (keep as-is)
- `design-system-v2.pen` — this iteration: full component library + screens
- Future change orders → `design-system-v3.pen`, etc.

Git history provides the diff. Distinct files allow side-by-side comparison.

### APPROVAL GATE

**Stop here for user review.** The `design-system-v2.pen` is presented for approval before any implementation begins. User reviews screenshots of all screens and components, provides feedback, and iterates until approved. Only then does Phase 1+ begin.

---

## Remaining: 8 Reopened Detail Items

## Architecture Baseline

- **Frontend**: `index.html` + `js/app.js` (1643 lines) + `css/styles.css` — vanilla JS, no frameworks
- **Backend**: `worker/index.js` (660 lines) — Cloudflare Worker with HMAC auth, iTunes search proxy, GitHub Contents API for data writes
- **Data**: JSON files in `competitions/{slug}/` committed to GitHub repo
- **User state**: localStorage only (session tokens, theme, votes)
- **Unused secrets**: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` exist in Worker but are not used
- **Search**: Currently iTunes API — trackIds are iTunes format, not Spotify URIs

---

## Phase 0.5: Dogfood Infrastructure (BEFORE feature work)

**Test data must flow through the system, not be pre-loaded.** The current test competitions were hand-seeded into JSON files — they never went through the Worker endpoints. This means the full write path (create → join → submit → vote → tally) has never been tested end-to-end.

Before implementing any of the 8 reopened items, we need:

### 0.5A. Create Competition (Worker + UI)

**Worker endpoint**: `POST /competition/create`
- Accepts: name, slug, startDate, endDate, timezone, competitionDays, members (initial list), themes (optional)
- Creates: `config.json` in `competitions/{slug}/`, adds entry to `registry.json`
- Auth: Requires admin token or first-user-becomes-admin pattern

**Frontend**: Create Competition modal (designed in `design-system-v2.pen` screen 6)
- Accessible from Picker screen via "Create Competition" button
- Form fields: name, dates, timezone, competition days
- On success: redirects to new competition

### 0.5B. Competition Reset (Worker endpoint)

**Worker endpoint**: `POST /competition/reset`
- Clears all round data (submissions, votes, comments, winners)
- Keeps config.json and members intact
- Requires admin auth
- Confirmation dialog in UI (designed in `design-system-v2.pen` — Confirm Dialog component)

### 0.5C. Round Phase Management (Worker endpoint)

**Worker endpoint**: `POST /competition/advance-phase`
- Manually advances a round's phase: submission → voting → results
- Used for testing and admin override when cron hasn't fired
- Requires admin auth

### 0.5D. Member Management (Worker endpoint)

**Worker endpoint**: `POST /competition/members`
- Add/remove members from a competition
- Used by Admin panel (designed in `design-system-v2.pen` screen 9)

**Why this is Phase 0.5**: Without these endpoints, every feature we build will be tested against pre-loaded data that never proved the write path works. The Create Competition flow is the foundation — everything else builds on it.

---

## Phase 1: Foundation (parallel — no cross-dependencies)

### 1A. Spotify Search Migration (prerequisite for 12281/12282)

**Why**: Track IDs from iTunes can't create Spotify playlists. Switching search to Spotify gives us native Spotify URIs on all new submissions and unblocks playlist creation.

**Worker changes** (`worker/index.js`):
- Replace iTunes search in `GET /search` handler (lines 244-278) with Spotify Web API
- Implement client credentials flow: `POST https://accounts.spotify.com/api/token` with existing `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET`
- Cache access token in module-level variable (1-hour expiry)
- Call `GET https://api.spotify.com/v1/search?type=track&q={query}&limit=10`
- Return same response shape: `{ trackId, title, artist, album, albumArt, duration, previewUrl }`
- `trackId` becomes Spotify track ID (e.g., `3EYOJ0MxVb0FoTMFKB6bOd`)

**Frontend**: No changes needed — same API contract. `exportToSpotify()` can detect Spotify IDs and open `https://open.spotify.com/track/{id}` directly.

**Backward compat**: Existing round JSON with old iTunes trackIds still works for display. Only new submissions get Spotify IDs.

### 1B. GitHub OAuth (12253)

**Worker** (`worker/index.js`):
- `GET /auth/github` — Construct GitHub authorization URL with `client_id`, `redirect_uri` (Worker URL), `scope=user:email`, `state` (signed: slug + CSRF nonce). Return 302 redirect.
- `GET /auth/github/callback` — Exchange code for token via `POST https://github.com/login/oauth/access_token`. Call `GET https://api.github.com/user/emails` for verified email. Look up email in `OAUTH_MAPPINGS` secret (JSON: `{"email":"memberName"}`). Generate HMAC session token (same as invite code flow). Redirect to frontend: `index.html#competition={slug}&token={token}&name={name}`.

**Frontend** (`index.html`, `js/app.js`, `css/styles.css`):
- Replace inline auth bar with centered auth modal overlay
- Three options: "Continue with GitHub", "Continue with Microsoft", expandable "Use invite code"
- "Continue with GitHub" opens `WORKER_URL/auth/github?competition={slug}` (full-page redirect)
- On page load, `init()` checks for `token`/`name` in URL fragment, stores session, clears fragment

**New secrets**: `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `OAUTH_MAPPINGS`

**Constraint**: Requires registering a GitHub OAuth App and pre-mapping member emails in `OAUTH_MAPPINGS`.

### 1C. Microsoft OAuth (12254)

**Worker** (`worker/index.js`):
- `GET /auth/microsoft` — Redirect to `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` with `scope=openid profile email`
- `GET /auth/microsoft/callback` — Exchange code for tokens. Decode `id_token` JWT payload (base64, no signature check needed — just received from Microsoft over TLS). Extract `email` or `preferred_username`. Same member lookup via `OAUTH_MAPPINGS`. Issue HMAC token. Redirect to frontend.

**Frontend**: Same modal from 1B — "Continue with Microsoft" button opens `WORKER_URL/auth/microsoft?competition={slug}`.

**New secrets**: `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET`

**Constraint**: Requires registering an Azure AD app. The `common` tenant works for personal + work accounts.

---

## Phase 2: Feature Pages (can start after Phase 1, items are parallel within phase)

### 2A. Competition Settings Page (12287)

**New files**: `settings.html`, `js/settings.js`

**Frontend**:
- Standalone page with left sidebar nav: Competition, Notifications, Display, Export/Import
- **Competition**: Name, dates, timezone, schedule times, competition days — read from `config.json`, write via Worker
- **Notifications**: Teams webhook URL, notification type toggles — new `notifications` key in `config.json`
- **Display**: CRT scanlines, neon glow, grid background, animations, accent color picker, reaction icon set, font size, card format — localStorage (client-side preferences)
- **Export/Import**: Covered by 12291

**Worker** (`worker/index.js`):
- `POST /config/update` — Accepts slug + partial config object. Reads current config, merges, writes via GitHub Contents API. Auth required (add `admins` field to config.json).

**CSS**: New settings page layout styles (left nav + content panels, form controls in 80s aesthetic)

### 2B. User Profile Page (12289)

**New files**: `profile.html`, `js/profile.js`

**Frontend**:
- Left sidebar nav: Profile, Music Providers, My Notifications, Connected Accounts, My Data
- **Profile**: Avatar (colored circle with initial, color picker → localStorage), display name (read-only from membership), tagline (localStorage or repo via Worker)
- **Music Providers**: Show connected/disconnected status for each provider. Spotify functional (token in localStorage from 12281). Others: "Coming Soon" until 12290.
- **Connected Accounts**: Show GitHub/Microsoft OAuth status from localStorage session data
- **My Stats**: Wins, submissions, win rate, ranking — computed from `leaderboard.json` (no extra fetches needed, data already aggregated)

**Worker**: Optional `POST /profile/update` if tagline/avatar should be visible to other users (stored in `profiles.json` in competition directory).

### 2C. Season Playlist Export (12281)

**Worker** (`worker/index.js`):
- `GET /auth/spotify` — Redirect to Spotify authorization URL with `scope=playlist-modify-public playlist-modify-private`. State includes slug + member name (signed).
- `GET /auth/spotify/callback` — Exchange code for `access_token` + `refresh_token`. Redirect to frontend with tokens in URL fragment. Frontend stores in localStorage.
- `POST /playlist/create` — Accepts `{ competition, type: "season"|"round", roundNum?, spotifyToken, name? }`. Reads round JSON files. Collects Spotify track IDs from submissions. Creates playlist via `POST https://api.spotify.com/v1/users/{user_id}/playlists`. Adds tracks via `POST https://api.spotify.com/v1/playlists/{id}/tracks`. Returns playlist URL.

**Frontend** (`js/app.js` or new modal):
- Playlist creation modal: numbered song list with album art, playlist name input, export target selector (Spotify functional, others display-only)
- "CREATE PLAYLIST ON SPOTIFY" button — if no Spotify token, initiates OAuth first
- Season playlist section: song count, round count, "CREATE SEASON PLAYLIST" button
- Store `spotifyAccessToken`/`spotifyRefreshToken` in localStorage

**Constraint**: Requires Spotify OAuth app registration with redirect URI pointing to Worker. User must have a Spotify account.

### 2D. Config Export/Import (12291)

Lives on the settings page (12287).

**Frontend** (`js/settings.js`):
- **Export**: Fetch `config.json`, create `Blob`, trigger download as `{slug}-config.json`
- **Import**: File input (`.json`), `FileReader`, validate schema (required fields: name, slug, startDate, endDate, members, themes), show preview/diff, on confirm send to `POST /config/update`

**Dependencies**: Uses Worker endpoint from 12287.

---

## Phase 3: Automation & Multi-Provider (depends on Phase 2)

### 3A. Season Playlist Auto-Update (12282)

**GitHub Action** (`.github/workflows/playlist-sync.yml`):
- Triggered after `tally-winner.yml` completes (via `workflow_run` trigger)
- Script reads all round files for competitions with `autoUpdate: true` in config
- Calls Spotify API to replace playlist tracks (using service-account refresh token stored as GitHub Actions secret)
- Updates `config.json` with `lastSynced` timestamp

**Config schema addition**: `"playlist": { "seasonPlaylistId": "...", "autoUpdate": true, "lastSynced": "..." }`

**Frontend**: Auto-update toggle in playlist modal writes `autoUpdate` flag to config via Worker.

**Constraint**: Needs a service-level Spotify refresh token (from a designated "Rocktober" Spotify account) stored as a GitHub Actions secret, so auto-update doesn't depend on any single user's token.

### 3B. Music Provider Management (12290)

Lives on the profile page (12289).

**Phased delivery**:
1. **Spotify**: Already functional from 12281. Connect/disconnect buttons manage localStorage tokens.
2. **YouTube Music**: New Worker OAuth endpoints (`/auth/youtube`, `/auth/youtube/callback`). Google OAuth with `youtube` scope. New secrets: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`.
3. **Apple Music**: MusicKit JS (CDN-hosted, not an npm dep — allowed per dependency philosophy). Requires Apple Developer Program membership and MusicKit key.
4. **SoundCloud, Tidal**: Limited public APIs. Implement when/if API access is available.

**Worker**: One OAuth redirect+callback pair per provider (same pattern as GitHub/Microsoft).

---

## New Worker Endpoints (9 total)

| Endpoint | Method | Phase | Purpose |
|----------|--------|-------|---------|
| `/auth/github` | GET | 1 | GitHub OAuth redirect |
| `/auth/github/callback` | GET | 1 | GitHub OAuth callback |
| `/auth/microsoft` | GET | 1 | Microsoft OAuth redirect |
| `/auth/microsoft/callback` | GET | 1 | Microsoft OAuth callback |
| `/auth/spotify` | GET | 2 | Spotify user OAuth redirect |
| `/auth/spotify/callback` | GET | 2 | Spotify user OAuth callback |
| `/playlist/create` | POST | 2 | Create Spotify playlist |
| `/config/update` | POST | 2 | Update competition config |
| `/profile/update` | POST | 2 | Update user profile (optional) |

## New Secrets (7 total)

| Secret | Phase | Purpose |
|--------|-------|---------|
| `GITHUB_OAUTH_CLIENT_ID` | 1 | GitHub OAuth app |
| `GITHUB_OAUTH_CLIENT_SECRET` | 1 | GitHub OAuth app |
| `MICROSOFT_OAUTH_CLIENT_ID` | 1 | Azure AD app |
| `MICROSOFT_OAUTH_CLIENT_SECRET` | 1 | Azure AD app |
| `OAUTH_MAPPINGS` | 1 | Email-to-member JSON map |
| `GOOGLE_OAUTH_CLIENT_ID` | 3 | YouTube Music OAuth |
| `GOOGLE_OAUTH_CLIENT_SECRET` | 3 | YouTube Music OAuth |

Existing `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` become actively used in Phase 1.

## New Frontend Files (4 total)

| File | Phase | Purpose |
|------|-------|---------|
| `settings.html` | 2 | Competition settings page |
| `js/settings.js` | 2 | Settings page logic |
| `profile.html` | 2 | User profile page |
| `js/profile.js` | 2 | Profile page logic |

## Critical Path

```
Spotify search migration → 12281 playlist export → 12282 auto-update
```

Everything else parallelizes around this chain.

## External Registration Required

Before Phase 1 can begin:
1. **GitHub OAuth App** — Register at github.com/settings/developers. Need: callback URL = Worker URL + `/auth/github/callback`
2. **Azure AD App** — Register at portal.azure.com. Need: redirect URI = Worker URL + `/auth/microsoft/callback`
3. **Spotify App** — Already exists (creds in Worker secrets). Add redirect URI: Worker URL + `/auth/spotify/callback`. Add scopes: `playlist-modify-public`, `playlist-modify-private`.

## Verification

After each phase:
1. Run `npx playwright test` — all 78+ tests must pass
2. Update visual regression baselines for intentional UI changes
3. Screenshot verify new pages against mockup PNGs in `.claude/artifacts/rocktober2-ui/`
4. Test OAuth flows end-to-end with real provider accounts
5. Test playlist creation with a real Spotify account
