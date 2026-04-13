# Dogfood Test Plan — April 2026

## What I'm Creating

A real competition called **"Spring Shred 2026"** that runs for one week, Monday through Friday. Five members, five daily themes. The kind of thing a small group of coworkers would actually set up.

## Competition Details

- **Name**: Spring Shred 2026
- **Start**: Monday April 7, 2026
- **End**: Friday April 11, 2026
- **Days**: Mon–Fri only
- **Timezone**: America/Indiana/Indianapolis
- **Members**: Kerry, Marcus, Tanya, Devon, Aaliyah (the original Rocktober crew)

## What I'll Do (in order, using only the live site UI)

1. **Go to the picker screen** — should show "No competitions available" since we just wiped everything
2. **Click "+ CREATE COMPETITION"** — fill out the form with the details above
3. **Verify** the competition loads after creation
4. **Open Admin panel** — add the 5 members one at a time
5. **Log out** — then log back in as Kerry using the invite code flow
6. **Search for a song** and submit it for today's round
7. **Log out and log in as Marcus** — submit a different song
8. **Vote** as Marcus for Kerry's submission
9. **Open Admin** — advance the round from submission → voting → results
10. **Verify** the winner is displayed correctly

## What I'm Testing

- Create Competition flow (form → Worker → redirect)
- Member management (Admin panel → add members)
- Auth flow (invite code → session)
- Song search (Spotify or iTunes)
- Submission flow (search → submit → see card)
- Voting flow (vote button → confirmation)
- Phase advancement (Admin → advance → winner tally)
- Data persistence (all data lives in GitHub repo via Worker)

## Success Criteria

The full lifecycle works end-to-end through the UI. No curl, no direct JSON editing, no backend shortcuts.
