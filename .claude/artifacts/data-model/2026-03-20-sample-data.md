# Data Model: Sample Data Reference

**Date**: 2026-03-20
**Work Item**: W-11958
**Status**: Review

## Directory Structure

```
competitions/
└── rocktober-2024/
    ├── config.json
    ├── rounds/
    │   ├── day-01.json
    │   ├── day-02.json
    │   └── ... (23 days)
    └── leaderboard.json
```

---

## config.json

```json
{
  "schemaVersion": 1,
  "name": "Rocktober 2024",
  "slug": "rocktober-2024",
  "description": "23 days of themed rock music battles",
  "startDate": "2024-10-01",
  "endDate": "2024-10-31",
  "schedule": {
    "timezone": "America/Indiana/Indianapolis",
    "themeReveal": "08:00",
    "submissionOpen": "08:00",
    "submissionClose": "15:00",
    "votingOpen": "15:00",
    "votingClose": "16:30",
    "resultsReveal": "16:30"
  },
  "themeMode": "round-robin",
  "themeOrder": ["kerry", "mike", "dave", "jess", "tony"],
  "members": [
    {
      "id": "kerry",
      "name": "Kerry",
      "avatar": null
    },
    {
      "id": "mike",
      "name": "Mike",
      "avatar": null
    },
    {
      "id": "dave",
      "name": "Dave",
      "avatar": null
    },
    {
      "id": "jess",
      "name": "Jess",
      "avatar": null
    },
    {
      "id": "tony",
      "name": "Tony",
      "avatar": null
    }
  ],
  "skipDays": ["2024-10-05", "2024-10-06", "2024-10-12", "2024-10-13", "2024-10-19", "2024-10-20", "2024-10-26", "2024-10-27"]
}
```

### config.json Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | number | yes | Schema version for migration support |
| `name` | string | yes | Display name of the competition |
| `slug` | string | yes | URL-safe identifier, matches folder name |
| `description` | string | no | Short description |
| `startDate` | string (YYYY-MM-DD) | yes | First day of competition |
| `endDate` | string (YYYY-MM-DD) | yes | Last day of competition |
| `schedule.timezone` | string (IANA) | yes | Timezone for all schedule times |
| `schedule.themeReveal` | string (HH:MM) | yes | When the day's theme is revealed |
| `schedule.submissionOpen` | string (HH:MM) | yes | When submissions open |
| `schedule.submissionClose` | string (HH:MM) | yes | When submissions close |
| `schedule.votingOpen` | string (HH:MM) | yes | When voting opens |
| `schedule.votingClose` | string (HH:MM) | yes | When voting closes |
| `schedule.resultsReveal` | string (HH:MM) | yes | When winner is announced |
| `themeMode` | string | yes | `"round-robin"` or `"assigned"` |
| `themeOrder` | string[] | if round-robin | Member IDs in rotation order |
| `members` | array | yes | Competition participants |
| `members[].id` | string | yes | Unique member identifier |
| `members[].name` | string | yes | Display name |
| `members[].avatar` | string/null | no | Avatar URL |
| `skipDays` | string[] | no | Dates with no round (weekends, holidays) |

---

## day-NN.json (Round)

### Sample: day-01.json (Submission phase complete, voting complete, results in)

```json
{
  "day": 1,
  "date": "2024-10-01",
  "theme": "Songs About Cars",
  "themePicker": "kerry",
  "phase": "results",
  "submissions": [
    {
      "memberId": "kerry",
      "songTitle": "Panama",
      "artist": "Van Halen",
      "spotifyId": "3jx4cSOlqiKSasMkSiGGAE",
      "spotifyUrl": "https://open.spotify.com/track/3jx4cSOlqiKSasMkSiGGAE",
      "submittedAt": "2024-10-01T09:15:00-04:00"
    },
    {
      "memberId": "mike",
      "songTitle": "Little Red Corvette",
      "artist": "Prince",
      "spotifyId": "2LKOHdMsL0K9KwcPRlJV2S",
      "spotifyUrl": "https://open.spotify.com/track/2LKOHdMsL0K9KwcPRlJV2S",
      "submittedAt": "2024-10-01T10:30:00-04:00"
    },
    {
      "memberId": "dave",
      "songTitle": "Drive",
      "artist": "The Cars",
      "spotifyId": "41UMo04nQuacGnAx1mfuEO",
      "spotifyUrl": "https://open.spotify.com/track/41UMo04nQuacGnAx1mfuEO",
      "submittedAt": "2024-10-01T11:00:00-04:00"
    },
    {
      "memberId": "jess",
      "songTitle": "Mustang Sally",
      "artist": "Wilson Pickett",
      "spotifyId": "1emxIKpHBnVFMNIzRnJSiv",
      "spotifyUrl": "https://open.spotify.com/track/1emxIKpHBnVFMNIzRnJSiv",
      "submittedAt": "2024-10-01T12:45:00-04:00"
    },
    {
      "memberId": "tony",
      "songTitle": "Radar Love",
      "artist": "Golden Earring",
      "spotifyId": "5Nt2fMpnRMYqpqINAmUu8E",
      "spotifyUrl": "https://open.spotify.com/track/5Nt2fMpnRMYqpqINAmUu8E",
      "submittedAt": "2024-10-01T14:20:00-04:00"
    }
  ],
  "votes": {
    "kerry": "tony",
    "mike": "dave",
    "dave": "tony",
    "jess": "kerry",
    "tony": "kerry"
  },
  "winner": "tony",
  "tiebreaker": null
}
```

### Sample: day-15.json (Submission phase — voting not yet open)

```json
{
  "day": 15,
  "date": "2024-10-21",
  "theme": "One-Hit Wonders",
  "themePicker": "tony",
  "phase": "submission",
  "submissions": [
    {
      "memberId": "kerry",
      "songTitle": "Come On Eileen",
      "artist": "Dexys Midnight Runners",
      "spotifyId": "1L7HJZfHJuTbFCLahFByUE",
      "spotifyUrl": "https://open.spotify.com/track/1L7HJZfHJuTbFCLahFByUE",
      "submittedAt": "2024-10-21T08:30:00-04:00"
    },
    {
      "memberId": "mike",
      "songTitle": "Take On Me",
      "artist": "a-ha",
      "spotifyId": "2WfaOiMkCvy7F5fcp2zZ8L",
      "spotifyUrl": "https://open.spotify.com/track/2WfaOiMkCvy7F5fcp2zZ8L",
      "submittedAt": "2024-10-21T09:45:00-04:00"
    }
  ],
  "votes": {},
  "winner": null,
  "tiebreaker": null
}
```

### day-NN.json Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `day` | number | yes | Round number (1-indexed) |
| `date` | string (YYYY-MM-DD) | yes | Calendar date of this round |
| `theme` | string | yes | The day's theme |
| `themePicker` | string | yes | Member ID who chose the theme |
| `phase` | string | yes | `"pending"`, `"submission"`, `"voting"`, `"results"` |
| `submissions` | array | yes | Song submissions (empty array if none yet) |
| `submissions[].memberId` | string | yes | Who submitted |
| `submissions[].songTitle` | string | yes | Song name |
| `submissions[].artist` | string | yes | Artist name |
| `submissions[].spotifyId` | string | yes | Spotify track ID |
| `submissions[].spotifyUrl` | string | yes | Full Spotify track URL |
| `submissions[].submittedAt` | string (ISO 8601) | yes | Submission timestamp |
| `votes` | object | yes | Map of voterId → votedForId (empty if voting not started) |
| `winner` | string/null | yes | Member ID of winner, null if not decided |
| `tiebreaker` | string/null | no | Tiebreak method if used (e.g., `"theme-picker"`) |

### Phase State Machine

```
pending → submission → voting → results
```

- `pending` — before themeReveal time
- `submission` — after themeReveal, before submissionClose
- `voting` — after votingOpen, before votingClose
- `results` — after resultsReveal

---

## leaderboard.json

```json
{
  "competitionSlug": "rocktober-2024",
  "lastUpdated": "2024-10-31T16:30:00-04:00",
  "standings": [
    {
      "memberId": "tony",
      "name": "Tony",
      "wins": 7,
      "submissions": 23,
      "winRate": 0.304
    },
    {
      "memberId": "kerry",
      "name": "Kerry",
      "wins": 6,
      "submissions": 23,
      "winRate": 0.261
    },
    {
      "memberId": "jess",
      "name": "Jess",
      "wins": 5,
      "submissions": 22,
      "winRate": 0.227
    },
    {
      "memberId": "dave",
      "name": "Dave",
      "wins": 3,
      "submissions": 21,
      "winRate": 0.143
    },
    {
      "memberId": "mike",
      "name": "Mike",
      "wins": 2,
      "submissions": 20,
      "winRate": 0.100
    }
  ]
}
```

### leaderboard.json Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `competitionSlug` | string | yes | Links to parent competition |
| `lastUpdated` | string (ISO 8601) | yes | When standings were last computed |
| `standings` | array | yes | Sorted by wins desc, then winRate desc |
| `standings[].memberId` | string | yes | Member identifier |
| `standings[].name` | string | yes | Display name |
| `standings[].wins` | number | yes | Total round wins |
| `standings[].submissions` | number | yes | Total rounds participated |
| `standings[].winRate` | number | yes | wins / submissions (3 decimal places) |

---

## Design Decisions

1. **Times in config, not per-round** — Schedule times are competition-wide. Individual rounds inherit from config. If a round needs an exception, it can override (future enhancement, not v1).

2. **Votes as object, not array** — `{ voterId: votedForId }` is simpler than an array of vote objects and naturally prevents double-voting (one key per voter).

3. **No self-vote in schema** — Enforced at the app level, not in JSON structure. The schema allows it; the worker rejects it.

4. **skipDays in config** — Weekends and holidays where no round occurs. Keeps day numbering sequential (day 1, 2, 3...) while skipping calendar dates.

5. **Phase is derived but stored** — Phase could be computed from timestamps + schedule, but storing it makes the frontend simpler (just read the phase, don't compute it). GitHub Actions update the phase field as cron jobs fire.

6. **Round-robin via themeOrder** — Day N's picker is `themeOrder[(N-1) % themeOrder.length]`. Simple, predictable, no state to track.
