/**
 * Rocktober — Shared Data Layer
 * Used by both the DOM renderer (app.js) and Canvas renderer (app-canvas.js).
 * Pure data functions — no DOM manipulation.
 */

// ---------------------
// Configuration
// ---------------------
export const WORKER_URL = 'https://rocktober-worker.narehk.workers.dev';
export const POLL_INTERVAL_MS = 60_000;
export const SEARCH_DEBOUNCE_MS = 300;

// ---------------------
// Cache busting
// ---------------------
let cacheBustTs = null;

export function bustCache() {
  cacheBustTs = Date.now();
}

// ---------------------
// Data Loading
// ---------------------

export async function fetchJSON(path) {
  const url = cacheBustTs ? `${path}?t=${cacheBustTs}` : path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

export async function loadRegistry() {
  return fetchJSON('competitions/registry.json');
}

export async function loadConfig(slug) {
  return fetchJSON(`competitions/${slug}/config.json`);
}

export async function loadRound(slug, dayNum) {
  const padded = String(dayNum).padStart(2, '0');
  return fetchJSON(`competitions/${slug}/rounds/day-${padded}.json`);
}

export async function loadLeaderboard(slug) {
  return fetchJSON(`competitions/${slug}/leaderboard.json`);
}

let cachedMaxRound = {};

export async function findLatestRound(slug, maxRound) {
  const cachedMax = cachedMaxRound[slug];
  const startFrom = cachedMax || maxRound;
  for (let i = startFrom; i >= 1; i--) {
    try {
      const round = await loadRound(slug, i);
      cachedMaxRound[slug] = i;
      return { round, num: i };
    } catch { /* keep searching */ }
  }
  return null;
}

// ---------------------
// Date & Phase Logic
// ---------------------

export function getCurrentRoundNumber(cfg) {
  const tz = cfg.schedule?.timezone || 'America/Indiana/Indianapolis';
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const startStr = cfg.startDate;
  const endStr = cfg.endDate;

  if (todayStr < startStr) return 0;
  if (todayStr > endStr) return cfg.totalRounds || -1;

  const todayMs = new Date(todayStr + 'T00:00:00').getTime();
  const startMs = new Date(startStr + 'T00:00:00').getTime();
  const diffDays = Math.round((todayMs - startMs) / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

export function toCompetitionDate(dateStr, timeStr, timezone) {
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  }).formatToParts(probe);
  const tzPart = parts.find(p => p.type === 'timeZoneName');
  const offsetStr = (tzPart?.value || 'GMT').replace('GMT', '') || '+0';
  const match = offsetStr.match(/^([+-]?)(\d{1,2})(?::(\d{2}))?$/);
  const sign = match[1] === '-' ? -1 : 1;
  const offH = parseInt(match[2], 10);
  const offM = parseInt(match[3] || '0', 10);
  const totalOffsetMs = sign * (offH * 60 + offM) * 60_000;
  const localMs = new Date(`${dateStr}T${timeStr}:00`).getTime();
  return new Date(localMs - totalOffsetMs);
}

export function computePhaseFromSchedule(roundDate, schedule) {
  const tz = schedule.timezone;
  const now = new Date();
  const subOpen = toCompetitionDate(roundDate, schedule.submissionOpen, tz);
  const votingOpen = toCompetitionDate(roundDate, schedule.votingOpen, tz);
  const resultsReveal = toCompetitionDate(roundDate, schedule.resultsReveal, tz);

  if (now < subOpen) return 'pre';
  if (now < votingOpen) return 'submission';
  if (now < resultsReveal) return 'voting';
  return 'results';
}

export function getCurrentPhase(round, cfg) {
  if (!round) return 'submission';
  if (round.winner) return 'results';

  if (cfg?.schedule && round.date) {
    const today = new Date().toISOString().slice(0, 10);
    if (round.date === today) {
      return computePhaseFromSchedule(round.date, cfg.schedule);
    }
  }

  return round.phase || 'submission';
}

// ---------------------
// Routing
// ---------------------

export function getSlugFromURL() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const params = new URLSearchParams(hash);
    if (params.has('competition')) return params.get('competition');
  }
  const search = new URLSearchParams(window.location.search);
  if (search.has('competition')) return search.get('competition');
  return null;
}

export function setSlugInURL(slug) {
  window.location.hash = `competition=${slug}`;
  localStorage.setItem('rocktober-last-competition', slug);
}

export function clearSlugFromURL() {
  history.pushState(null, '', window.location.pathname + window.location.search);
}

// ---------------------
// Session / Auth
// ---------------------

function sessionKey(slug) {
  return `rocktober-session-${slug}`;
}

export function loadSession(slug) {
  try {
    const raw = localStorage.getItem(sessionKey(slug));
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.name && session.token) return session;
    return null;
  } catch { return null; }
}

export function saveSession(slug, name, token) {
  localStorage.setItem(sessionKey(slug), JSON.stringify({ name, token }));
}

export function clearSession(slug) {
  localStorage.removeItem(sessionKey(slug));
}
