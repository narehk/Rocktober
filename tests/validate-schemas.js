/**
 * ROCKTOBER — JSON Schema Validator
 * Validates competition JSON files against expected shapes.
 * Zero dependencies — uses Node.js built-ins only.
 *
 * Usage: node tests/validate-schemas.js [competition-slug]
 * Default: validates all competitions in competitions/
 */
const fs = require('fs');
const path = require('path');

const COMPETITIONS_DIR = path.join(__dirname, '..', 'competitions');

let errors = 0;
let passed = 0;

function fail(file, message) {
  console.error(`  FAIL  ${file}: ${message}`);
  errors++;
}

function pass(file) {
  console.log(`  OK    ${file}`);
  passed++;
}

function assert(condition, file, message) {
  if (!condition) fail(file, message);
  else return true;
  return false;
}

// --- Config Validation ---
function validateConfig(filePath) {
  const rel = path.relative(COMPETITIONS_DIR, filePath);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    fail(rel, `Invalid JSON: ${e.message}`);
    return null;
  }

  const checks = [
    [typeof data.name === 'string', 'missing or invalid "name"'],
    [typeof data.slug === 'string', 'missing or invalid "slug"'],
    [typeof data.schemaVersion === 'number', 'missing or invalid "schemaVersion"'],
    [typeof data.startDate === 'string', 'missing or invalid "startDate"'],
    [typeof data.endDate === 'string', 'missing or invalid "endDate"'],
    [Array.isArray(data.members), 'missing or invalid "members" array'],
    [['assigned', 'round-robin'].includes(data.themeMode), 'themeMode must be "assigned" or "round-robin"'],
    [typeof data.selfVoteAllowed === 'boolean', 'missing or invalid "selfVoteAllowed"'],
    [data.schedule && typeof data.schedule.timezone === 'string', 'missing schedule.timezone'],
    [data.schedule && typeof data.schedule.submissionOpen === 'string', 'missing schedule.submissionOpen'],
    [data.schedule && typeof data.schedule.votingOpen === 'string', 'missing schedule.votingOpen'],
    [data.schedule && typeof data.schedule.resultsReveal === 'string', 'missing schedule.resultsReveal'],
  ];

  let valid = true;
  for (const [condition, msg] of checks) {
    if (!assert(condition, rel, msg)) valid = false;
  }

  if (valid) pass(rel);

  // Validate members have name and order
  if (Array.isArray(data.members)) {
    for (const m of data.members) {
      if (!m.name) fail(rel, `member missing "name": ${JSON.stringify(m)}`);
    }
  }

  return data;
}

// --- Round Validation ---
function validateRound(filePath, config) {
  const rel = path.relative(COMPETITIONS_DIR, filePath);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    fail(rel, `Invalid JSON: ${e.message}`);
    return;
  }

  const checks = [
    [typeof data.day === 'number', 'missing or invalid "day"'],
    [typeof data.date === 'string', 'missing or invalid "date"'],
    [typeof data.theme === 'string', 'missing or invalid "theme"'],
    [typeof data.themePicker === 'string', 'missing or invalid "themePicker"'],
    [['submission', 'voting', 'results'].includes(data.phase), 'phase must be "submission", "voting", or "results"'],
    [Array.isArray(data.submissions), 'missing or invalid "submissions" array'],
  ];

  let valid = true;
  for (const [condition, msg] of checks) {
    if (!assert(condition, rel, msg)) valid = false;
  }

  // Validate submissions
  if (Array.isArray(data.submissions)) {
    for (const sub of data.submissions) {
      if (!sub.submitter) fail(rel, `submission missing "submitter"`);
      if (!sub.title) fail(rel, `submission missing "title"`);
      if (!sub.artist) fail(rel, `submission missing "artist"`);
      if (!sub.trackId) fail(rel, `submission missing "trackId"`);
    }

    // Check self-vote if config says no self-voting and phase is results
    if (config && !config.selfVoteAllowed && data.phase === 'results') {
      // Votes should not include self-votes (we can't fully validate without vote records, but flag duplicates)
      const submitters = new Set(data.submissions.map(s => s.submitter));
      if (submitters.size !== data.submissions.length) {
        fail(rel, 'duplicate submitters found');
      }
    }
  }

  // Winner validation
  if (data.phase === 'results') {
    if (!assert(typeof data.winner === 'string', rel, 'results phase requires "winner" field')) valid = false;
  }

  if (valid) pass(rel);
}

// --- Leaderboard Validation ---
function validateLeaderboard(filePath) {
  const rel = path.relative(COMPETITIONS_DIR, filePath);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    fail(rel, `Invalid JSON: ${e.message}`);
    return;
  }

  const checks = [
    [typeof data.competition === 'string', 'missing or invalid "competition"'],
    [typeof data.roundsCompleted === 'number', 'missing or invalid "roundsCompleted"'],
    [Array.isArray(data.standings), 'missing or invalid "standings" array'],
  ];

  let valid = true;
  for (const [condition, msg] of checks) {
    if (!assert(condition, rel, msg)) valid = false;
  }

  if (Array.isArray(data.standings)) {
    for (const entry of data.standings) {
      if (!entry.name) fail(rel, 'standing entry missing "name"');
      if (typeof entry.wins !== 'number') fail(rel, `standing "${entry.name}" missing "wins"`);
      if (typeof entry.submissions !== 'number') fail(rel, `standing "${entry.name}" missing "submissions"`);
    }

    // Verify sorted by wins descending
    for (let i = 1; i < data.standings.length; i++) {
      if (data.standings[i].wins > data.standings[i - 1].wins) {
        fail(rel, 'standings not sorted by wins descending');
        break;
      }
    }
  }

  if (valid) pass(rel);
}

// --- Main ---
function main() {
  const targetSlug = process.argv[2];
  const dirs = targetSlug
    ? [path.join(COMPETITIONS_DIR, targetSlug)]
    : fs.readdirSync(COMPETITIONS_DIR)
        .map(d => path.join(COMPETITIONS_DIR, d))
        .filter(d => fs.statSync(d).isDirectory());

  console.log(`\nROCKTOBER Schema Validator\n${'='.repeat(40)}\n`);

  for (const dir of dirs) {
    const slug = path.basename(dir);
    console.log(`Competition: ${slug}`);

    // Config
    const configPath = path.join(dir, 'config.json');
    let config = null;
    if (fs.existsSync(configPath)) {
      config = validateConfig(configPath);
    } else {
      fail(`${slug}/config.json`, 'file not found');
    }

    // Rounds
    const roundsDir = path.join(dir, 'rounds');
    if (fs.existsSync(roundsDir)) {
      const rounds = fs.readdirSync(roundsDir)
        .filter(f => f.endsWith('.json'))
        .sort();
      for (const r of rounds) {
        validateRound(path.join(roundsDir, r), config);
      }
    }

    // Leaderboard
    const lbPath = path.join(dir, 'leaderboard.json');
    if (fs.existsSync(lbPath)) {
      validateLeaderboard(lbPath);
    }

    console.log('');
  }

  // Summary
  console.log(`${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${errors} failed`);
  console.log('');

  process.exit(errors > 0 ? 1 : 0);
}

main();
