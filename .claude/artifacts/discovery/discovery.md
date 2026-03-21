# Project Discovery

**Started**: 2026-03-19
**Status**: complete
**Phase**: 5-synthesis

## Vision & Purpose
- **Name**: Rocktober
- **Pitch**: A daily themed playlist competition where group members each submit a song matching the day's theme, then vote on a winner.
- **Users**: Originally a city government team; designed to be usable by any team, friend group, or community.
- **Problem**: Currently a manual process — setting up Spotify playlists, creating ballots, delivering results — all done by hand or over Teams. Tedious to manage and not everyone uses Spotify.
- **Success**: The daily cycle (theme → submit → vote → winner) runs with minimal manual effort. Social interaction is central — comments, reactions, and fun engagement around the songs. The app should feel like a shared experience, not just a tool.

## Existing Materials
| Type | Reference | Notes |
|------|-----------|-------|
| Past data | `C:\Users\kerry.joseph\Downloads\Rocktober (1).csv` | 23 days of Rocktober 2024 themes, descriptions, Spotify playlist IDs, dates. Some have winners, some don't. Great reference for theme style and tone. |
| Brand direction | (verbal) | 80s arcade meets hair metal band aesthetic. No logo yet. |

## Constraints & Context
- **Timeline**: No hard deadline. Side project to prove out Claude Code capabilities using the WorkSpaceFramework. Steady progress, not rushed.
- **Team**: Solo developer (Kerry Joseph)
- **Hosting**: GitHub Pages (free, static)
- **Compliance**: None (social/fun app, no sensitive data)
- **Budget**: $0 — entire stack runs on free tiers (GitHub Pages, GitHub Actions, Cloudflare Worker free, Spotify API free)
- **Skill level**: Experienced (framework author, testing Claude Code capabilities)
- **Work Provider**: ado
- **Provider Config**: Organization: https://dev.azure.com/southbendin, Project: Digital - Product Portfolio, Process Template: Digital Product Portfolio - Electric Boogaloo
- **Doc Provider**: ado, Target: Digital---Project-Portfolio.wiki

## Domain
- **Entities**: Groups (team/community running a competition), Competitions (e.g. "Rocktober 2024"), Rounds (daily theme + description), Submissions (song + submitter), Ballots/Votes, Comments, Members, Leaderboards
- **Key journeys**:
  1. **Competition Setup**: Admin creates competition, sets all themes upfront (so they can play too), configures settings (self-voting on/off, theme picker mode). Option for round-robin theme picking where members take turns choosing themes.
  2. **Daily Round**: Theme reveals at start of day → members browse and submit a song → ballot opens ~3pm → members vote (self-vote configurable) → winner announced ~4:30 → leaderboard updates
  3. **Social Interaction**: Members comment on submissions, react, trash-talk, celebrate — the fun layer
  4. **Leaderboard**: Running scoreboard across the competition, updated after each round
- **Integrations**:
  - **Music search**: In-app song search (needs a music metadata API — Spotify Web API, MusicBrainz, or similar)
  - **Notifications**: Channel notifications (theme reveal, ballot open, winner announcement). Teams first, but designed with an extensible provider pattern for Slack, Google Chat, etc. later.
  - **Music service links**: Support links from any service (Spotify, YouTube, Apple Music) — not locked to one platform
- **Risks**:
  - Song search quality — finding the right track across services
  - Timing automation — reliably triggering ballot open and winner announcements on schedule
  - UX friction — must be easier than the manual Teams/Spotify process or people won't adopt
  - Hosting and cost — keeping it free/cheap while scaling if it catches on beyond the original team

## Tech Stack
**Status**: confirmed
| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Pure HTML/CSS/JS (vanilla, zero dependencies) | No build step, no node_modules. Hand-crafted 80s arcade + hair metal aesthetic. |
| Hosting | GitHub Pages | Free forever. Static site served from the repo. |
| Database | JSON files in the repo | Git history = audit trail. Simple, human-readable, zero cost. |
| Scheduling | GitHub Actions (cron) | Theme reveal, ballot open, winner tally — all via scheduled commits. |
| Submissions | Cloudflare Worker (free) or GitHub API | Receives form posts, commits JSON back to repo via GitHub API. |
| Music Search | Spotify Web API (client credentials) | Free tier, excellent metadata. Proxied through worker to hide credentials. |
| Notifications | Teams Incoming Webhooks (extensible provider pattern) | Free. Triggered by GitHub Actions on events. |
| Comments | GitHub Discussions or Issues API | Loaded client-side and rendered in the UI. Zero backend needed. |
| Auth | GitHub OAuth or simple invite codes | GitHub Pages + GitHub API makes OAuth natural. Invite codes for non-GitHub users. |
| Styling | Hand-crafted CSS | CRT scanlines, neon glow, pixel fonts, chrome text. No framework needed. |

## Epics
**Status**: approved
| ID | Title | Category |
|----|-------|----------|
| W-11957 | Project Scaffolding & Static Site Shell | ui |
| W-11958 | Competition & Round Data Model | backend |
| W-11959 | Frontend — Daily Round Experience | ui |
| W-11960 | Song Search & Submission | backend |
| W-11961 | Voting & Leaderboard | ui |
| W-11962 | GitHub Actions — Scheduled Automation | infrastructure |
| W-11963 | Social Layer — Comments & Reactions | ui |
| W-11964 | Notifications — Teams Webhook Integration | infrastructure |
