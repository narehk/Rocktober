# ROCKTOBER

A daily themed playlist competition where group members each submit a song matching the day's theme, then vote on a winner.

Originally built for a city government team that ran Rocktober manually over Teams and Spotify — setting up playlists, creating ballots, tallying results by hand. This app automates the entire daily cycle so the organizer can play too.

## The Daily Round

Each weekday follows the same rhythm:

1. **Theme reveal** — A theme drops in the morning (e.g., "Songs About Cars," "Power Ballads")
2. **Submission** — Players search Spotify and submit their pick
3. **Voting** — At 3 PM, submissions lock and voting opens
4. **Winner** — At 4:30 PM, votes are tallied, the winner is crowned, and the leaderboard updates

The schedule runs automatically. Themes are set upfront so the organizer doesn't know what's coming either.

## Features

- **Spotify search** — Find and submit songs with album art, artist info, and track previews
- **Configurable voting** — Self-vote on or off, one vote per round
- **Live leaderboard** — Wins, submissions, and win rate tracked across the competition
- **Phase-aware UI** — The interface changes based on what part of the day it is
- **Automated lifecycle** — GitHub Actions handle theme reveals, ballot opens, and vote tallies on a schedule
- **Git as the database** — All competition data is JSON. Git history is the audit trail.

## Running Locally

```bash
node serve.js
```

Open **http://localhost:3000?competition=test-2026** to explore the test competition with pre-loaded rounds across all phases.

## Setting Up a Competition

Create a folder under `competitions/` with a `config.json`:

- **members** — Who's playing (names used for submissions and votes)
- **themes** — One per round day, with title, description, and who picked it
- **schedule** — When submissions open, when voting starts, when results post
- **settings** — Self-vote rules, timezone

Rounds are generated from the theme list. The app determines today's round from the start date and schedule.

## Deployment

The app runs on **GitHub Pages** (static hosting, free). Submissions and votes are persisted through a **Cloudflare Worker** that proxies the Spotify API and writes back to the repo via GitHub's API.

GitHub Actions run on cron to advance the competition through its daily phases.

**Why a personal account?** Rocktober is developed for a City of South Bend team but hosted under a personal GitHub account. GitHub Pages requires public repositories on free organization plans — since the city's GitHub org restricts public repos, hosting here keeps the app free to deploy while ADO (Azure DevOps) remains the system of record for work tracking.

## Status

**Shipped**: Project scaffolding, competition data model, daily round UI, Spotify song search, vote persistence, leaderboard, GitHub Actions automation

**In progress**: Social layer (comments and reactions on submissions), Teams webhook notifications
