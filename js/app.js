/**
 * ROCKTOBER — App Module
 * Vanilla JS, zero dependencies.
 * Loads competition data from JSON, renders the daily round experience.
 */
const Rocktober = (() => {
  'use strict';

  // ---------------------
  // Configuration
  // ---------------------
  const DEFAULT_COMPETITION = 'rocktober-2024';
  const POLL_INTERVAL_MS = 60_000; // 1 min phase check

  // ---------------------
  // DOM References
  // ---------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    loading:        $('#loading'),
    error:          $('#error'),
    errorMessage:   $('#error-message'),
    themeDisplay:   $('#theme-display'),
    roundBadge:     $('#round-badge'),
    themeTitle:     $('#theme-title'),
    themePicker:    $('#theme-picker'),
    phaseBadge:     $('#phase-badge'),
    submissionsGrid:$('#submissions-grid'),
    winnerDisplay:  $('#winner-display'),
    winnerCard:     $('#winner-card'),
    leaderboard:    $('#leaderboard'),
    compInfo:       $('#comp-info'),
    userSelect:     $('#user-select'),
    currentUser:    $('#current-user'),
  };

  // ---------------------
  // State
  // ---------------------
  let config = null;
  let currentRound = null;
  let leaderboard = null;
  let pollTimer = null;
  let currentUser = null;

  // ---------------------
  // Data Loading
  // ---------------------

  /**
   * Fetch JSON with error handling
   */
  async function fetchJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
    return res.json();
  }

  /**
   * Load competition config
   */
  async function loadConfig(slug = DEFAULT_COMPETITION) {
    return fetchJSON(`competitions/${slug}/config.json`);
  }

  /**
   * Load a specific round
   */
  async function loadRound(slug, dayNum) {
    const padded = String(dayNum).padStart(2, '0');
    return fetchJSON(`competitions/${slug}/rounds/day-${padded}.json`);
  }

  /**
   * Load leaderboard
   */
  async function loadLeaderboard(slug) {
    return fetchJSON(`competitions/${slug}/leaderboard.json`);
  }

  // ---------------------
  // Date & Phase Logic
  // ---------------------

  /**
   * Determine current round number from config dates
   */
  function getCurrentRoundNumber(cfg) {
    const now = new Date();
    const start = new Date(cfg.startDate);
    const end = new Date(cfg.endDate);

    if (now < start) return 0;  // Competition hasn't started

    if (now > end) {
      // Competition ended — show the latest round
      return cfg.totalRounds || -1;
    }

    const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }

  /**
   * Find the latest available round by probing from totalRounds downward.
   * Used when the computed round doesn't exist (e.g., sample data).
   */
  async function findLatestRound(slug, maxRound) {
    for (let i = maxRound; i >= 1; i--) {
      try {
        return { round: await loadRound(slug, i), num: i };
      } catch { /* keep searching */ }
    }
    return null;
  }

  /**
   * Build a Date object for a specific time in the competition timezone.
   * Uses Intl.DateTimeFormat to resolve the UTC offset for that date/timezone,
   * which handles DST correctly.
   */
  function toCompetitionDate(dateStr, timeStr, timezone) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Create a date at noon UTC to safely resolve timezone offset
    const probe = new Date(`${dateStr}T12:00:00Z`);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(probe);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    // Parse offset like "GMT-5" or "GMT+5:30"
    const offsetStr = (tzPart?.value || 'GMT').replace('GMT', '') || '+0';
    const match = offsetStr.match(/^([+-]?)(\d{1,2})(?::(\d{2}))?$/);
    const sign = match[1] === '-' ? -1 : 1;
    const offH = parseInt(match[2], 10);
    const offM = parseInt(match[3] || '0', 10);
    const totalOffsetMs = sign * (offH * 60 + offM) * 60_000;
    // Build UTC time = local time - offset
    const localMs = new Date(`${dateStr}T${timeStr}:00`).getTime();
    return new Date(localMs - totalOffsetMs);
  }

  /**
   * Compute phase from schedule times + timezone for a given round date.
   * Returns 'pre', 'submission', 'voting', or 'results'.
   */
  function computePhaseFromSchedule(roundDate, schedule) {
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

  /**
   * Determine current phase from round data and config schedule.
   * Uses schedule-based computation for today's round, falls back to
   * stored phase for historical rounds.
   */
  function getCurrentPhase(round, cfg) {
    if (!round) return 'submission';
    if (round.winner) return 'results';

    // For today's round, compute from schedule
    if (cfg?.schedule && round.date) {
      const today = new Date().toISOString().slice(0, 10);
      if (round.date === today) {
        return computePhaseFromSchedule(round.date, cfg.schedule);
      }
    }

    // Historical or missing schedule — use stored phase
    return round.phase || 'submission';
  }

  // ---------------------
  // User Identity
  // ---------------------

  /**
   * Initialize user identity from localStorage or member selection.
   */
  function initUser(members) {
    if (!members || members.length === 0) return;

    const stored = localStorage.getItem('rocktober-user');
    const validNames = members.map(m => m.name);

    // Populate dropdown
    dom.currentUser.innerHTML = validNames
      .map(name => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`)
      .join('');

    if (stored && validNames.includes(stored)) {
      currentUser = stored;
      dom.currentUser.value = stored;
    } else {
      currentUser = validNames[0];
      localStorage.setItem('rocktober-user', currentUser);
    }

    dom.userSelect.classList.remove('hidden');

    dom.currentUser.addEventListener('change', () => {
      currentUser = dom.currentUser.value;
      localStorage.setItem('rocktober-user', currentUser);
      // Re-render submissions to update vote button states
      if (currentRound) {
        const phase = getCurrentPhase(currentRound, config);
        renderSubmissions(currentRound.submissions, phase, currentRound.day);
      }
    });
  }

  // ---------------------
  // Voting
  // ---------------------

  /**
   * Get the localStorage key for a vote on a specific round.
   */
  function voteKey(roundDay) {
    const slug = config?.slug || DEFAULT_COMPETITION;
    return `rocktober-vote-${slug}-day-${String(roundDay).padStart(2, '0')}`;
  }

  /**
   * Get the stored vote for a round (returns trackId or null).
   */
  function getStoredVote(roundDay) {
    return localStorage.getItem(voteKey(roundDay));
  }

  /**
   * Handle a vote action. Stores in localStorage for now;
   * W-11970 will add Cloudflare Worker POST.
   */
  function handleVote(trackId, submitter, roundDay) {
    if (submitter === currentUser) return;
    if (getStoredVote(roundDay)) return;

    localStorage.setItem(voteKey(roundDay), trackId);

    // Re-render to show voted state
    const phase = getCurrentPhase(currentRound, config);
    renderSubmissions(currentRound.submissions, phase, roundDay);
  }

  /**
   * Attach vote click handler via event delegation (call once).
   */
  function initVoteHandler() {
    dom.submissionsGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.vote-btn');
      if (!btn || btn.disabled) return;
      handleVote(btn.dataset.track, btn.dataset.submitter, currentRound?.day);
    });
  }

  // ---------------------
  // Rendering
  // ---------------------

  function showLoading() {
    dom.loading.classList.remove('hidden');
    dom.error.classList.add('hidden');
    dom.themeDisplay.classList.add('hidden');
    dom.submissionsGrid.classList.add('hidden');
    dom.winnerDisplay.classList.add('hidden');
  }

  function showError(message) {
    dom.loading.classList.add('hidden');
    dom.error.classList.remove('hidden');
    dom.errorMessage.textContent = message;
  }

  function renderTheme(round, roundNum) {
    dom.loading.classList.add('hidden');
    dom.themeDisplay.classList.remove('hidden');

    dom.roundBadge.textContent = `ROUND ${String(roundNum).padStart(2, '0')}`;
    dom.themeTitle.textContent = round.theme || 'TBD';
    dom.themePicker.innerHTML = round.themePicker
      ? `Picked by <strong>${round.themePicker}</strong>`
      : '';

    const phase = getCurrentPhase(round, config);
    dom.phaseBadge.textContent = phase;
    dom.phaseBadge.className = `phase-badge ${phase}`;
  }

  function renderSubmissions(submissions, phase, roundDay) {
    if (!submissions || submissions.length === 0) {
      dom.submissionsGrid.classList.add('hidden');
      return;
    }

    const existingVote = roundDay ? getStoredVote(roundDay) : null;

    dom.submissionsGrid.classList.remove('hidden');
    dom.submissionsGrid.innerHTML = submissions.map(sub => {
      let voteButton = '';
      if (phase === 'voting') {
        const isOwnSong = currentUser && sub.submitter === currentUser;
        const isVoted = existingVote === sub.trackId;
        const hasVoted = !!existingVote;

        if (isOwnSong) {
          voteButton = `<button class="vote-btn own-song" disabled>YOUR SONG</button>`;
        } else if (isVoted) {
          voteButton = `<button class="vote-btn voted" disabled>VOTED</button>`;
        } else if (hasVoted) {
          voteButton = `<button class="vote-btn" disabled data-track="${escapeHTML(sub.trackId || '')}" data-submitter="${escapeHTML(sub.submitter || '')}">VOTE</button>`;
        } else {
          voteButton = `<button class="vote-btn" data-track="${escapeHTML(sub.trackId || '')}" data-submitter="${escapeHTML(sub.submitter || '')}">VOTE</button>`;
        }
      }

      const voteCount = phase === 'results' && sub.votes !== undefined
        ? `<span class="neon-blue-text pixel-text" style="font-size:0.5rem;margin-top:0.5rem;display:inline-block">${sub.votes} VOTES</span>`
        : '';

      return `
        <div class="song-card${phase === 'results' && sub.submitter === currentRound?.winner ? ' winner-highlight' : ''}">
          <img class="album-art"
               src="${sub.albumArt || ''}"
               alt="${sub.title || 'Album art'}"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 80%22><rect fill=%22%23111%22 width=%2280%22 height=%2280%22/><text x=%2240%22 y=%2244%22 text-anchor=%22middle%22 fill=%22%23333%22 font-size=%2212%22>?</text></svg>'">
          <div class="song-info">
            <div class="song-title">${escapeHTML(sub.title || 'Unknown')}</div>
            <div class="song-artist">${escapeHTML(sub.artist || 'Unknown Artist')}</div>
            <div class="song-submitter">${escapeHTML(sub.submitter || 'Anonymous')}</div>
            ${voteButton}
            ${voteCount}
          </div>
        </div>`;
    }).join('');
  }

  function renderWinner(round) {
    if (!round.winner) {
      dom.winnerDisplay.classList.add('hidden');
      return;
    }

    const winner = round.submissions?.find(s => s.submitter === round.winner);
    dom.winnerDisplay.classList.remove('hidden');
    dom.winnerCard.innerHTML = winner
      ? `<div class="song-card" style="border-color:var(--gold)">
           <img class="album-art" src="${winner.albumArt || ''}" alt="${winner.title}">
           <div class="song-info">
             <div class="song-title" style="color:var(--gold)">${escapeHTML(winner.title)}</div>
             <div class="song-artist">${escapeHTML(winner.artist)}</div>
             <div class="song-submitter">${escapeHTML(winner.submitter)}</div>
           </div>
         </div>`
      : `<p class="neon-text">${escapeHTML(round.winner)}</p>`;
  }

  function renderLeaderboard(lb) {
    if (!lb || !lb.standings || lb.standings.length === 0) {
      dom.leaderboard.innerHTML = '<p class="no-data">No standings yet.</p>';
      return;
    }

    dom.leaderboard.innerHTML = lb.standings.map((entry, i) => `
      <div class="lb-entry">
        <span class="lb-rank">${i + 1}.</span>
        <span class="lb-name">${escapeHTML(entry.name)}</span>
        <span class="lb-wins">${entry.wins}W</span>
      </div>
    `).join('');
  }

  function renderCompInfo(cfg) {
    if (!cfg) return;
    dom.compInfo.innerHTML = `
      <p style="font-size:0.75rem;margin-bottom:0.5rem"><strong style="color:var(--neon-pink)">${escapeHTML(cfg.name || 'Competition')}</strong></p>
      <p style="font-size:0.7rem;color:var(--text-muted)">
        ${cfg.members ? cfg.members.length + ' members' : ''}<br>
        ${cfg.startDate || ''} &mdash; ${cfg.endDate || ''}
      </p>
    `;
  }

  // ---------------------
  // Utilities
  // ---------------------

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------------------
  // App Lifecycle
  // ---------------------

  async function init() {
    showLoading();

    try {
      // Load config
      config = await loadConfig();
      renderCompInfo(config);
      initUser(config.members);
      initVoteHandler();

      // Determine current round
      const roundNum = getCurrentRoundNumber(config);
      if (roundNum <= 0) {
        dom.loading.classList.add('hidden');
        dom.themeDisplay.classList.remove('hidden');
        dom.themeTitle.textContent = 'COMING SOON';
        dom.roundBadge.textContent = 'NOT STARTED';
        dom.phaseBadge.textContent = 'waiting';
        dom.phaseBadge.className = 'phase-badge';
        return;
      }

      // Load round data (with fallback for sample/ended competitions)
      const slug = config.slug || DEFAULT_COMPETITION;
      let actualRoundNum = roundNum;
      try {
        currentRound = await loadRound(slug, roundNum);
      } catch {
        // Computed round doesn't exist — find the latest available
        const latest = await findLatestRound(slug, config.totalRounds || roundNum);
        if (latest) {
          currentRound = latest.round;
          actualRoundNum = latest.num;
        } else {
          throw new Error('No round data available.');
        }
      }
      const phase = getCurrentPhase(currentRound, config);

      // Render
      renderTheme(currentRound, actualRoundNum);
      renderSubmissions(currentRound.submissions, phase, currentRound.day);
      if (phase === 'results') renderWinner(currentRound);

      // Load leaderboard
      try {
        leaderboard = await loadLeaderboard(slug);
        renderLeaderboard(leaderboard);
      } catch {
        // Leaderboard may not exist yet — that's fine
      }

      // Start polling for phase changes
      pollTimer = setInterval(() => refreshRound(actualRoundNum), POLL_INTERVAL_MS);

    } catch (err) {
      console.error('Rocktober init failed:', err);
      showError(err.message || 'Could not load competition data.');
    }
  }

  async function refreshRound(roundNum) {
    try {
      const slug = config?.slug || DEFAULT_COMPETITION;
      const round = await loadRound(slug, roundNum);
      const oldPhase = getCurrentPhase(currentRound, config);
      const newPhase = getCurrentPhase(round, config);

      if (oldPhase !== newPhase || JSON.stringify(round) !== JSON.stringify(currentRound)) {
        currentRound = round;
        renderTheme(round, roundNum);
        renderSubmissions(round.submissions, newPhase, round.day);
        if (newPhase === 'results') renderWinner(round);

        // Refresh leaderboard on phase change
        try {
          leaderboard = await loadLeaderboard(slug);
          renderLeaderboard(leaderboard);
        } catch { /* ok */ }
      }
    } catch {
      // Silent fail on poll — don't disrupt the UI
    }
  }

  // ---------------------
  // Boot
  // ---------------------
  document.addEventListener('DOMContentLoaded', init);

  // Public API (for testing / console access)
  return {
    init,
    getConfig: () => config,
    getCurrentRound: () => currentRound,
    getLeaderboard: () => leaderboard,
    getCurrentUser: () => currentUser,
  };
})();
