/**
 * Process a song submission dispatched via repository_dispatch.
 * Validates and writes the submission to the round JSON.
 *
 * Usage: node process-submission.js '{"competition":"test-2026","day":4,"submitter":"Kerry","track":{...}}'
 */
const { loadConfig, loadJSON, writeJSON, roundPath, log } = require('./utils');

const payload = JSON.parse(process.argv[2] || '{}');
const { competition, day, submitter, track } = payload;

// --- Validate required fields ---
if (!competition || !day || !submitter || !track || !track.trackId || !track.title || !track.artist) {
  log('error', 'Missing required fields', { competition, day, submitter, hasTrack: !!track });
  process.exit(0);
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
if (round.phase !== 'submission') {
  log('warn', 'Not in submission phase', { phase: round.phase, day });
  process.exit(0);
}

// --- Validate membership ---
const isMember = config.members.some((m) => m.name === submitter);
if (!isMember) {
  log('warn', 'Submitter is not a member', { submitter });
  process.exit(0);
}

// --- Build submission object ---
const entry = {
  submitter,
  title: track.title,
  artist: track.artist,
  albumArt: track.albumArt || '',
  trackId: track.trackId,
  votes: 0,
};

// --- Replace or add ---
if (!round.submissions) round.submissions = [];
const existingIdx = round.submissions.findIndex((s) => s.submitter === submitter);
if (existingIdx >= 0) {
  round.submissions[existingIdx] = entry;
  log('info', 'Submission replaced', { submitter, trackId: track.trackId });
} else {
  round.submissions.push(entry);
  log('info', 'Submission added', { submitter, trackId: track.trackId });
}

writeJSON(filePath, round);
log('info', 'Submission persisted', { submitter, day, competition });
