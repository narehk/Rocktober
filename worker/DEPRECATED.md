# Worker — DEPRECATED

This Cloudflare Worker has been replaced by GitHub Actions workflows (as of Change Order #12144).

## What replaced it

| Old (Worker) | New (GitHub Actions) |
|-------------|---------------------|
| `POST /vote` | `.github/workflows/vote.yml` → `process-vote.js` |
| `POST /submit` | `.github/workflows/submit-song.yml` → `process-submission.js` |
| `GET /search` | Spotify oEmbed (public, no auth) — called directly from browser |

## Why

Eliminated Cloudflare dependency. The entire stack now runs on GitHub (Pages + Actions) with zero external accounts needed.

## Can I delete this directory?

Yes. It's kept for reference only. The `index.js` and `wrangler.toml` are no longer deployed.
