/**
 * Shared utilities for Rocktober GitHub Actions scripts.
 * Node.js built-in modules only — no npm dependencies.
 */
const fs = require('fs');
const path = require('path');

const COMPETITIONS_DIR = path.join(__dirname, '..', '..', 'competitions');

/**
 * Get the short day-of-week string (Mon, Tue, etc.) for a date.
 */
function getDayOfWeek(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

/**
 * Parse a date string (YYYY-MM-DD) into a Date object at midnight UTC.
 */
function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Format a Date as YYYY-MM-DD.
 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Load and parse a JSON file. Returns null if file doesn't exist.
 */
function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Write a JSON file with pretty-printing.
 */
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * List all competition slugs (directory names under competitions/).
 */
function listCompetitions() {
  if (!fs.existsSync(COMPETITIONS_DIR)) return [];
  return fs.readdirSync(COMPETITIONS_DIR).filter((name) => {
    const configPath = path.join(COMPETITIONS_DIR, name, 'config.json');
    return fs.existsSync(configPath);
  });
}

/**
 * Load a competition's config.json.
 */
function loadConfig(slug) {
  const configPath = path.join(COMPETITIONS_DIR, slug, 'config.json');
  return loadJSON(configPath);
}

/**
 * Get the path to a round JSON file.
 */
function roundPath(slug, dayNumber) {
  const padded = String(dayNumber).padStart(2, '0');
  return path.join(COMPETITIONS_DIR, slug, 'rounds', `day-${padded}.json`);
}

/**
 * Get the path to the leaderboard JSON file.
 */
function leaderboardPath(slug) {
  return path.join(COMPETITIONS_DIR, slug, 'leaderboard.json');
}

/**
 * Determine the round number for a given date within a competition.
 * Counts only competition days (e.g., weekdays) from startDate up to and including the target date.
 * Returns null if the date is outside the competition window or not a competition day.
 */
function getRoundNumber(config, targetDate) {
  const start = parseDate(config.startDate);
  const end = parseDate(config.endDate);
  const target = parseDate(formatDate(targetDate));

  if (target < start || target > end) return null;

  const competitionDays = config.competitionDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const targetDay = getDayOfWeek(target);

  if (!competitionDays.includes(targetDay)) return null;

  // Count competition days from start through target
  let round = 0;
  const cursor = new Date(start);
  while (cursor <= target) {
    const dayName = getDayOfWeek(cursor);
    if (competitionDays.includes(dayName)) {
      round++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return round;
}

/**
 * Check if today is a competition day.
 */
function isCompetitionDay(config, date) {
  const competitionDays = config.competitionDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  return competitionDays.includes(getDayOfWeek(date));
}

/**
 * Check if a date falls within the competition window.
 */
function isWithinCompetition(config, date) {
  const start = parseDate(config.startDate);
  const end = parseDate(config.endDate);
  const target = parseDate(formatDate(date));
  return target >= start && target <= end;
}

/**
 * Determine the theme picker for a round based on round-robin order.
 */
function getThemePicker(config, roundNumber) {
  if (!config.members || config.members.length === 0) return null;
  const sorted = [...config.members].sort((a, b) => a.order - b.order);
  const index = (roundNumber - 1) % sorted.length;
  return sorted[index].name;
}

/**
 * Structured log helper for Action visibility.
 */
function log(level, message, data) {
  const entry = { timestamp: new Date().toISOString(), level, message, ...data };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

module.exports = {
  COMPETITIONS_DIR,
  getDayOfWeek,
  parseDate,
  formatDate,
  loadJSON,
  writeJSON,
  listCompetitions,
  loadConfig,
  roundPath,
  leaderboardPath,
  getRoundNumber,
  isCompetitionDay,
  isWithinCompetition,
  getThemePicker,
  log,
};
