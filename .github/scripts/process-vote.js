/**
 * Process a vote dispatched via repository_dispatch.
 * Validates the vote and writes it to the round JSON.
 *
 * Usage: node process-vote.js '{"competition":"test-2026","day":3,"voter":"Kerry","trackId":"abc123"}'
 */
const { loadConfig, loadJSON, writeJSON, roundPath, log } = require('./utils');

const payload = JSON.parse(process.argv[2] || '{}');
const { competition, day, voter, trackId } = payload;

// --- Validate required fields ---
if (!competition || !day || !voter || !trackId) {
  log('error', 'Missing required fields', { competition, day, voter, trackId });
  process.exit(0); // exit 0 so the workflow doesn't show as failed
}

// --- Load data ---
const config = loadConfig(competition);
if (!config) {
  log('error', 'Competition not found', { competition });
  process.exit(0);
}

const filePath = roundPath(competition, day);
const round = loadJSON(filePath);
if (!round) {
  log('error', 'Round not found', { competition, day });
  process.exit(0);
}

// --- Validate phase ---
if (round.phase !== 'voting') {
  log('warn', 'Not in voting phase', { phase: round.phase, day });
  process.exit(0);
}

// --- Validate membership ---
const isMember = config.members.some((m) => m.name === voter);
if (!isMember) {
  log('warn', 'Voter is not a member', { voter });
  process.exit(0);
}

// --- Check self-vote ---
if (!config.selfVoteAllowed) {
  const submission = round.submissions.find((s) => s.trackId === trackId);
  if (submission && submission.submitter === voter) {
    log('warn', 'Self-vote not allowed', { voter, trackId });
    process.exit(0);
  }
}

// --- Check duplicate vote ---
if (!round.votes) round.votes = [];
const alreadyVoted = round.votes.some((v) => v.voter === voter);
if (alreadyVoted) {
  log('warn', 'Duplicate vote', { voter, day });
  process.exit(0);
}

// --- Apply vote ---
round.votes.push({ voter, trackId });

const sub = round.submissions.find((s) => s.trackId === trackId);
if (sub) {
  sub.votes = (sub.votes || 0) + 1;
}

writeJSON(filePath, round);
log('info', 'Vote recorded', { voter, trackId, day, competition });
