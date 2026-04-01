#!/usr/bin/env node
/**
 * Ballot Open Script
 *
 * Runs on schedule (default ~3pm ET). For each active competition:
 * 1. Checks if today is a competition day
 * 2. Finds today's round JSON
 * 3. Transitions phase from "submission" to "voting"
 *
 * Idempotent: if the round is already in "voting" or "results", it skips.
 */
const {
  listCompetitions,
  loadConfig,
  roundPath,
  loadJSON,
  writeJSON,
  getRoundNumber,
  isCompetitionDay,
  isWithinCompetition,
  formatDate,
  log,
  sendTeamsNotification,
} = require('./utils');

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
    log('warn', `No round file found for round ${roundNumber}. Theme reveal may not have run yet.`, { slug, round: roundNumber });
    return false;
  }

  // Idempotent check: only transition from "submission"
  if (round.phase === 'voting') {
    log('info', `Round ${roundNumber} is already in "voting" phase. Skipping (idempotent).`, { slug, round: roundNumber });
    return false;
  }

  if (round.phase === 'results') {
    log('info', `Round ${roundNumber} is already in "results" phase. Skipping.`, { slug, round: roundNumber });
    return false;
  }

  if (round.phase !== 'submission') {
    log('warn', `Round ${roundNumber} is in unexpected phase "${round.phase}". Expected "submission". Skipping.`, { slug, round: roundNumber });
    return false;
  }

  // Transition to voting
  round.phase = 'voting';
  writeJSON(rPath, round);
  log('info', `Ballot opened for round ${roundNumber}. Phase changed from "submission" to "voting".`, { slug, round: roundNumber, submissions: round.submissions.length });

  const config = loadConfig(slug);
  await sendTeamsNotification(
    `🗳️ Voting Open — Round ${roundNumber}`,
    `**${config?.name || slug}** — ${round.submissions.length} songs submitted. Cast your vote!`
  );

  return true;
}

async function main() {
  const today = new Date();
  log('info', `Ballot Open script started. Date: ${formatDate(today)}`);

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
