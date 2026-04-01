#!/usr/bin/env node
/**
 * Tally Winner Script
 *
 * Runs on schedule (default ~4:30pm ET). For each active competition:
 * 1. Checks if today is a competition day
 * 2. Reads current round votes and tallies them
 * 3. Determines the winner (highest votes; tie broken by submission order)
 * 4. Updates round JSON with winner and sets phase to "results"
 * 5. Recomputes leaderboard.json with cumulative standings
 *
 * Idempotent: if the round is already in "results" phase, it skips.
 */
const path = require('path');
const fs = require('fs');
const {
  COMPETITIONS_DIR,
  listCompetitions,
  loadConfig,
  roundPath,
  leaderboardPath,
  loadJSON,
  writeJSON,
  getRoundNumber,
  isCompetitionDay,
  isWithinCompetition,
  formatDate,
  log,
  sendTeamsNotification,
} = require('./utils');

/**
 * Determine the winner from submissions.
 * Highest vote count wins. Ties broken by submission order (first in array wins).
 */
function determineWinner(submissions) {
  if (!submissions || submissions.length === 0) return null;

  let maxVotes = -1;
  let winner = null;

  for (const sub of submissions) {
    const votes = sub.votes || 0;
    if (votes > maxVotes) {
      maxVotes = votes;
      winner = sub.submitter;
    }
  }

  return winner;
}

/**
 * Recompute leaderboard from all completed rounds for a competition.
 */
function recomputeLeaderboard(slug, config) {
  const roundsDir = path.join(COMPETITIONS_DIR, slug, 'rounds');
  if (!fs.existsSync(roundsDir)) return null;

  const files = fs.readdirSync(roundsDir).filter((f) => f.match(/^day-\d+\.json$/));

  // Initialize standings from members
  const standings = {};
  for (const member of config.members || []) {
    standings[member.name] = { name: member.name, wins: 0, submissions: 0 };
  }

  let roundsCompleted = 0;
  let latestDate = null;

  for (const file of files) {
    const round = loadJSON(path.join(roundsDir, file));
    if (!round) continue;

    // Count submissions for each member
    for (const sub of round.submissions || []) {
      if (standings[sub.submitter]) {
        standings[sub.submitter].submissions++;
      }
    }

    // Count wins only for completed rounds
    if (round.phase === 'results' && round.winner) {
      roundsCompleted++;
      if (standings[round.winner]) {
        standings[round.winner].wins++;
      }
      if (!latestDate || round.date > latestDate) {
        latestDate = round.date;
      }
    }
  }

  // Compute win rates and sort by wins descending, then by name
  const standingsArray = Object.values(standings).map((s) => ({
    ...s,
    winRate: roundsCompleted > 0 ? Math.round((s.wins / roundsCompleted) * 100) / 100 : 0,
  }));

  standingsArray.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });

  return {
    competition: slug,
    lastUpdated: latestDate ? `${latestDate}T20:30:00Z` : new Date().toISOString(),
    roundsCompleted,
    standings: standingsArray,
  };
}

async function processCompetition(slug, today) {
  log('info', `Processing competition: ${slug}`);

  const config = loadConfig(slug);
  if (!config) {
    log('error', `No config.json found for competition: ${slug}`);
    return false;
  }

  if (!isWithinCompetition(config, today)) {
    log('info', `Today (${formatDate(today)}) is outside competition window. Skipping.`, { slug });
    return false;
  }

  if (!isCompetitionDay(config, today)) {
    log('info', `Today is not a competition day. Skipping.`, { slug });
    return false;
  }

  const roundNumber = getRoundNumber(config, today);
  if (roundNumber === null) {
    log('error', `Could not determine round number for ${formatDate(today)}.`, { slug });
    return false;
  }

  const rPath = roundPath(slug, roundNumber);
  const round = loadJSON(rPath);

  if (!round) {
    log('warn', `No round file found for round ${roundNumber}. Earlier phases may not have run.`, { slug, round: roundNumber });
    return false;
  }

  // Idempotent check: only transition from "voting"
  if (round.phase === 'results') {
    log('info', `Round ${roundNumber} is already in "results" phase. Skipping (idempotent).`, { slug, round: roundNumber });
    return false;
  }

  if (round.phase !== 'voting') {
    log('warn', `Round ${roundNumber} is in "${round.phase}" phase. Expected "voting". Skipping.`, { slug, round: roundNumber });
    return false;
  }

  // Tally votes and determine winner
  const winner = determineWinner(round.submissions);
  round.winner = winner;
  round.phase = 'results';
  writeJSON(rPath, round);

  if (winner) {
    log('info', `Winner determined for round ${roundNumber}: ${winner}. Phase set to "results".`, { slug, round: roundNumber, winner });
  } else {
    log('warn', `No winner could be determined for round ${roundNumber} (no submissions or votes). Phase set to "results".`, { slug, round: roundNumber });
  }

  // Recompute leaderboard
  const leaderboard = recomputeLeaderboard(slug, config);
  if (leaderboard) {
    const lbPath = leaderboardPath(slug);
    writeJSON(lbPath, leaderboard);
    log('info', `Leaderboard updated. ${leaderboard.roundsCompleted} rounds completed.`, {
      slug,
      standings: leaderboard.standings.map((s) => `${s.name}: ${s.wins}W`).join(', '),
    });
  }

  // Send Teams notification with winner and leaderboard
  const winnerSub = (round.submissions || []).find(s => s.submitter === winner);
  const leaderLine = leaderboard?.standings?.slice(0, 3)
    .map((s, i) => `${i + 1}. ${s.name} (${s.wins}W)`)
    .join(' | ') || '';

  await sendTeamsNotification(
    `🏆 Round ${roundNumber} Winner: ${winner || 'No winner'}`,
    `**${config.name}** — ${winner ? `**${winner}** wins with "${winnerSub?.title || '?'}" by ${winnerSub?.artist || '?'}` : 'No votes cast.'}\n\n**Standings:** ${leaderLine}`
  );

  return true;
}

async function main() {
  const today = new Date();
  log('info', `Tally Winner script started. Date: ${formatDate(today)}`);

  const competitions = listCompetitions();
  if (competitions.length === 0) {
    log('warn', 'No competitions found in competitions/ directory.');
    process.exit(0);
  }

  let changed = false;
  for (const slug of competitions) {
    try {
      if (processCompetition(slug, today)) {
        changed = true;
      }
    } catch (err) {
      log('error', `Error processing competition ${slug}: ${err.message}`, { stack: err.stack });
    }
  }

  if (!changed) {
    log('info', 'No changes made. Nothing to commit.');
  }

  process.exit(0);
}

main();
