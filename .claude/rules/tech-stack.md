---
paths:
  - "**/*.html"
  - "**/*.css"
  - "**/*.js"
  - "competitions/**"
priority: 10
---

# Rocktober Tech Stack Rules

## Language & Framework

- **Runtime**: Browser-native (no Node.js build step for frontend)
- **Language**: Vanilla JavaScript (ES2020+) — no TypeScript, no transpilation
- **Framework**: None — pure HTML/CSS/JS. No React, no Vue, no jQuery
- **Modules**: ES modules via `<script type="module">` where beneficial, otherwise classic `<script>`
- **Worker**: Cloudflare Worker (JavaScript) for server-side proxy

## Code Style

- **Formatting**: Consistent indentation (2 spaces), semicolons optional but be consistent
- **Naming**: camelCase for JS functions/variables, kebab-case for CSS classes, kebab-case for file names
- **CSS**: No preprocessors (no Sass/Less). Raw CSS with custom properties (variables) for theming
- **HTML**: Semantic elements (`<main>`, `<section>`, `<article>`, `<nav>`). Accessibility attributes on interactive elements
- **Comments**: Explain the "why", not the "what". Document non-obvious CSS tricks (scanline effects, glow math)

## Patterns

- **State management**: None — read JSON, render DOM. No client-side state frameworks
- **Data fetching**: `fetch()` to load JSON files from the repo. No axios, no libraries
- **DOM manipulation**: `document.querySelector`, `createElement`, template literals for HTML generation. No virtual DOM
- **Error handling**: Graceful degradation — if JSON fails to load, show a friendly error in the 80s aesthetic
- **Separation**: HTML for structure, CSS for presentation, JS for behavior. No inline styles, no inline scripts

## Database

- **Type**: JSON files in the git repository
- **Schema**: Defined per entity type in `competitions/<slug>/`
- **Migrations**: Not applicable — schema changes are backward-compatible additions to JSON
- **Naming**: kebab-case for files (`day-01.json`), camelCase for JSON keys (`submittedBy`, `songTitle`)
- **Validation**: JSON schema validation via test scripts (not runtime)

## API Conventions

- **Cloudflare Worker endpoints**:
  - `POST /search` — Spotify search proxy
  - `POST /submit` — Submit a song (commits to repo via GitHub API)
  - `POST /vote` — Cast a vote (commits to repo via GitHub API)
  - `GET /health` — Worker health check
- **Response format**: `{ "ok": true, "data": {...} }` or `{ "ok": false, "error": "message" }`
- **Auth**: GitHub OAuth token in Authorization header for write operations
