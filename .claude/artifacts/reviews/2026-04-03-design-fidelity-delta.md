# Design Fidelity Delta Analysis

**Date**: 2026-04-03
**Compared**: Live site (localhost:3000) vs `design-system-v2.pen` (approved design system)
**Method**: Side-by-side screenshot comparison + CSS variable audit

---

## Executive Summary

The live CSS uses a **neutral gray palette** (#0a0a0a, #111, #1a1a1a) while the design system specifies a **cool blue-purple palette** (#0d0d12, #1a1a2e, #151525). This single drift affects every screen. Beyond the palette, the design system defines 31 tokens — the live CSS implements only 12, missing spacing, font size, border, and semantic color tokens entirely.

**Impact**: The entire site feels flatter and less polished than the design system intends. The blue-purple undertone in the design creates depth and ties the neon accents together. The pure gray in the live CSS makes the neon colors feel disconnected.

---

## 1. CSS Token Drift (Root Cause)

### Colors — Wrong Values

| Token | CSS (live) | .pen (design) | Visual Impact |
|-------|-----------|---------------|---------------|
| `--bg-dark` | `#0a0a0a` | `#0d0d12` | Body/page bg too dark, no blue tint |
| `--bg-card` | `#111` | `#1a1a2e` | Cards look flat gray, not dark-navy |
| `--bg-card-hover` | `#1a1a1a` | `#252545` | Hover state still gray |
| `--chrome-mid` | `#b0b0b0` | `#a0a0a0` | Minor — slightly lighter |
| `--text-primary` | `#e0e0e0` | `#f0f0f5` | Text not bright enough, missing warmth |
| `--text-muted` | `#888` | `#888899` | Muted text missing blue tint |

### Colors — Missing Tokens

These exist in .pen but have NO CSS variable:

| Token | .pen Value | Used For |
|-------|-----------|----------|
| `--bg-input` | `#12121e` | Form input backgrounds |
| `--bg-modal` | `#151525` | Modal panel backgrounds |
| `--border-subtle` | `#3a3a5c` | Card borders, dividers |
| `--border-active` | `#00e5ff` | Active/focus borders |
| `--text-secondary` | `#b0b0c0` | Secondary text (dates, metadata) |
| `--neon-green` | `#39ff14` | Success states |
| `--neon-yellow` | `#ffe600` | Warning states |
| `--spotify-green` | `#1DB954` | Spotify-branded elements |
| `--apple-red` | `#FC3C44` | Apple Music-branded elements |
| `--yt-red` | `#FF0000` | YouTube-branded elements |

### Spacing — Missing Tokens

| Token | .pen Value | Current CSS |
|-------|-----------|-------------|
| `--spacing-xs` | 4px | Not defined (uses magic numbers) |
| `--spacing-sm` | 8px | Not defined |
| `--spacing-md` | 16px | Not defined |
| `--spacing-lg` | 24px | Not defined |
| `--spacing-xl` | 32px | Not defined |
| `--radius-sm` | 4px | `--radius: 4px` (only one) |
| `--radius-md` | 8px | Not defined |
| `--radius-lg` | 12px | Not defined |

### Font Sizes — Missing Tokens

| Token | .pen Value | Current CSS |
|-------|-----------|-------------|
| `--font-size-xs` | 10px | Not defined |
| `--font-size-sm` | 12px | Not defined |
| `--font-size-md` | 14px | Not defined |
| `--font-size-lg` | 18px | Not defined |
| `--font-size-xl` | 24px | Not defined |
| `--font-size-title` | 32px | Not defined |

---

## 2. Per-Screen Drift

### Competition Picker

| Element | .pen Design | Live Site | Severity |
|---------|------------|-----------|----------|
| Page background | `#0d0d12` (dark navy) | `#0a0a0a` (pure black) | High — overall feel |
| Card background | `#1a1a2e` (dark navy) | `#111` (dark gray) | High — cards look flat |
| Card border | `#3a3a5c` (subtle purple) | `#333` or similar gray | Medium |
| Active card | Hot pink left border accent | No colored border accent | Medium |
| Title | "Choose Your Battle" | "SELECT COMPETITION" | Low — text difference |
| Subtitle position | Below title, centered | Below title, centered | Match |
| CTA buttons | "ENTER THE ARENA" / "VIEW RESULTS" | Present (added in quick fixes) | Match |
| Header layout | "ROCKTOBER" left, tagline right | "ROCKTOBER" centered, tagline centered | Medium — layout differs |

### Results Phase

| Element | .pen Design | Live Site | Severity |
|---------|------------|-----------|----------|
| Background | `#0d0d12` | `#0a0a0a` | High |
| Winner card border | Gold `#ffd700` | Gold present | Match |
| Song cards | Dark navy bg `#1a1a2e` with subtle border | Dark gray `#111` no visible border | High |
| Service link buttons | Pink/colored pill-style with rounded corners | Green/yellow/pink outlined buttons | Medium — style differs |
| Playlist export bar | Full-width bar below winner with Spotify + More | Three separate buttons below cards | Medium |
| Leaderboard | Right sidebar, ranking with delta arrows | Right sidebar, ranking without delta arrows | Low |
| Reaction bar | Below cards with emoji + counts | Below cards with emoji, counts visible | Match |

### Settings Page (NEW — built this session)

| Element | .pen Design | Live Site | Severity |
|---------|------------|-----------|----------|
| Overall layout | Left nav + content area | Left nav + content area | Match |
| Nav background | `#0d0d12` | `#0d0d14` | Close match |
| Active nav item | Pink bg | Pink bg | Match |
| Toggle switches | Cyan when on | Cyan when on | Match |
| Form inputs | `#12121e` bg | `#0d0d14` bg | Low — close |
| Section titles | Pink pixel font | Pink pixel font | Match |

### Profile Page (NEW — built this session)

| Element | .pen Design | Live Site | Severity |
|---------|------------|-----------|----------|
| Avatar | Colored circle with initial | Colored circle with initial | Match |
| Color picker | Row of color dots | Row of color dots | Match |
| Provider cards | Icon + name + status + button | Icon + name + status + button | Match |
| Stats grid | 4-column cards with colored values | 4-column cards with colored values | Match |

---

## 3. Priority Fix List

### P0 — Token Alignment (affects everything)

Update `:root` CSS variables to match .pen design tokens. This single change will shift the entire site's feel from "gray" to "dark navy" — affecting every screen simultaneously.

### P1 — Component Styles

1. **Song cards**: Add `border: 1px solid var(--border-subtle)` and update bg to `--bg-card`
2. **Service link buttons**: Restyle as rounded pills matching .pen
3. **Form inputs**: Use `--bg-input` for backgrounds
4. **Modal panels**: Ensure using `--bg-modal`

### P2 — Layout Differences

1. **Header**: Consider left-aligned "ROCKTOBER" with right-aligned tagline (per .pen) vs current centered layout
2. **Picker active card**: Add left border accent in pink
3. **Results playlist export**: Consolidate into bar-style layout per .pen

### P3 — Missing Decorative Elements

1. Leaderboard delta arrows (up/down indicators)
2. Active card pink left border accent
3. Comment avatars and timestamps

---

## 4. Framework Gap Identified

**No automated design fidelity gate exists.** The current verification workflow:
- Playwright visual regression: compares "same as last time" — not "matches design"
- Manual screenshot comparison: done ad-hoc during build, not enforced
- .pen design system: exists but has no automated bridge to CSS

**Proposed framework addition**: A "delta check" phase between build and review that:
1. Screenshots each live screen
2. Screenshots the corresponding .pen node
3. Compares CSS variables against .pen tokens
4. Produces a drift report
5. Auto-fixes token-level drift (CSS variable values)
6. Flags structural drift for human review
