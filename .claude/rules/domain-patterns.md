---
paths:
  - "competitions/**"
  - "js/**"
priority: 12
---

# Rocktober Domain Patterns

## Domain Concepts

- **Group**: A team or community running competitions. Has members, settings, and a display name. A group can run multiple competitions.
- **Competition**: A time-bounded series of rounds (e.g., "Rocktober 2024"). Has a name, date range, configurable settings (self-vote, theme picker mode), and a final leaderboard.
- **Round**: A single day in a competition. Has a theme, description, date, phase (submission/voting/results), and a collection of submissions. Themes are set at competition creation time.
- **Submission**: A song entry from a member for a specific round. Includes song metadata (title, artist, album, artwork URL, service links), submitter identity, and timestamp.
- **Vote**: A member's vote for a submission in a round. One vote per member per round. Self-vote configurable per competition.
- **Leaderboard**: Running scoreboard across all rounds in a competition. Points awarded for winning a round (1 point per win, or configurable).
- **Member**: A participant in a group/competition. Has a display name and identity (GitHub username or invite code).
- **Comment**: A social interaction on a submission or round. Text + optional emoji reaction.

## Business Rules

- A member can submit exactly one song per round
- A member can cast exactly one vote per round
- Self-voting is configurable per competition (on/off in config.json)
- Themes are set at competition creation time so the admin can participate without bias
- Round-robin theme picking: if enabled, members take turns choosing themes (order defined in config)
- Rounds follow phases: submission → voting → results (no going backward)
- Phase transitions are time-based (configured in competition settings) and triggered by GitHub Actions
- A round's winner is the submission with the most votes. Tie-breaking rules TBD
- Leaderboard updates after each round's winner is determined

## Data Validation

- **Song title**: Required, non-empty string
- **Artist**: Required, non-empty string
- **Theme**: Required, non-empty string, set at competition creation
- **Dates**: ISO 8601 format (YYYY-MM-DD)
- **Timestamps**: ISO 8601 with timezone
- **Member identity**: Non-empty string (GitHub username or display name)
- **Votes**: Must reference a valid submission ID within the same round
- **Submissions**: Must reference a valid member and round

## Naming Conventions

- **Domain entities in code**: camelCase in JS (`competition`, `roundData`, `submissionEntry`)
- **JSON files**: kebab-case (`day-01.json`, `config.json`, `leaderboard.json`)
- **JSON keys**: camelCase (`songTitle`, `submittedBy`, `voteCount`, `themeDescription`)
- **Directory structure**: kebab-case (`competitions/rocktober-2024/rounds/`)
- **Competition slugs**: kebab-case derived from name (`rocktober-2024`)
- **Round identifiers**: `day-NN` format (`day-01`, `day-02`, ..., `day-31`)
