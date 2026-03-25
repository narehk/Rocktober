#!/usr/bin/env node
/**
 * Theme Reveal Script
 *
 * Runs on schedule (default ~8am ET). For each active competition:
 * 1. Checks if today is a competition day
 * 2. Determines the round number for today
 * 3. Creates/updates the round JSON with today's theme
 * 4. Sets the phase to "submission"
 *
 * Idempotent: if the round already exists with a theme, it skips.
 */
const path = require('path');
const fs = require('fs');
const {
  listCompetitions,
  loadConfig,
  roundPath,
  loadJSON,
  writeJSON,
  getRoundNumber,
  isCompetitionDay,
  isWithinCompetition,
  getThemePicker,
  formatDate,
  log,
} = require('./utils');

function processCompetition(slug, today) {
  log('info', `Processing competition: ${slug}`);

  const config = loadConfig(slug);
  if (!config) {
    log('error', `No config.json found for competition: ${slug}`);
    return false;
  }

  // Check if today is within the competition window
  if (!isWithinCompetition(config, today)) {
    log('info', `Today (${formatDate(today)}) is outside competition window (${config.startDate} to ${config.endDate}). Skipping.`, { slug });
    return false;
  }

  // Check if today is a competition day
  if (!isCompetitionDay(config, today)) {
    log('info', `Today is not a competition day. Competition runs on: ${(config.competitionDays || []).join(', ')}. Skipping.`, { slug });
    return false;
  }

  // Determine round number
  const roundNumber = getRoundNumber(config, today);
  if (roundNumber === null) {
    log('error', `Could not determine round number for ${formatDate(today)}.`, { slug });
    return false;
  }

  log('info', `Round number for today: ${roundNumber}`, { slug });

  // Check if round already exists
  const rPath = roundPath(slug, roundNumber);
  const existingRound = loadJSON(rPath);

  if (existingRound && existingRound.theme) {
    log('info', `Round ${roundNumber} already has theme "${existingRound.theme}". Skipping (idempotent).`, { slug, round: roundNumber });
    return false;
  }

  // Get today's theme from the themes array (0-indexed by round-1)
  if (!config.themes || config.themes.length === 0) {
    log('error', `No themes configured for competition: ${slug}`);
    return false;
  }

  if (roundNumber > config.themes.length) {
    log('error', `Round ${roundNumber} exceeds available themes (${config.themes.length}).`, { slug });
    return false;
  }

  const theme = config.themes[roundNumber - 1];
  const themePicker = getThemePicker(config, roundNumber);

  // Create round data
  const roundData = existingRound || {};
  roundData.day = roundNumber;
  roundData.date = formatDate(today);
  roundData.theme = theme;
  roundData.themePicker = themePicker;
  roundData.phase = 'submission';
  if (!roundData.submissions) roundData.submissions = [];
  if (!roundData.hasOwnProperty('winner')) roundData.winner = null;

  // Ensure rounds directory exists
  const roundsDir = path.dirname(rPath);
  if (!fs.existsSync(roundsDir)) {
    fs.mkdirSync(roundsDir, { recursive: true });
  }

  writeJSON(rPath, roundData);
  log('info', `Theme revealed for round ${roundNumber}: "${theme}" (picker: ${themePicker}). Phase set to "submission".`, { slug, round: roundNumber, theme, themePicker });

  return true;
}

function main() {
  const today = new Date();
  log('info', `Theme Reveal script started. Date: ${formatDate(today)}`);

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

  // Always exit 0 — workflow checks git status for changes
  process.exit(0);
}

main();
