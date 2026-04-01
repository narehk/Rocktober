/**
 * ROCKTOBER — App Module
 * Vanilla JS, zero dependencies.
 * Multi-competition support with picker UI and hash-based routing.
 */
const Rocktober = (() => {
  'use strict';

  // ---------------------
  // Configuration
  // ---------------------
  const WORKER_URL = 'https://rocktober-worker.narehk.workers.dev';
  const POLL_INTERVAL_MS = 60_000;
  const SEARCH_DEBOUNCE_MS = 300;

  // ---------------------
  // DOM References
  // ---------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    // Picker screen
    pickerScreen:   $('#picker-screen'),
    pickerGrid:     $('#picker-grid'),
    pickerLoading:  $('#picker-loading'),
    // Competition screen
    compScreen:     $('#competition-screen'),
    backBtn:        $('#back-to-picker'),
    // Existing elements
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
    songSearch:     $('#song-search'),
    searchInput:    $('#search-input'),
    searchResults:  $('#search-results'),
    searchStatus:   $('#search-status'),
    // Round navigation
    prevRound:      $('#prev-round'),
    nextRound:      $('#next-round'),
    phaseCountdown: $('#phase-countdown'),
    // Auth
    authBar:        $('#auth-bar'),
    inviteCode:     $('#invite-code'),
    authSubmit:     $('#auth-submit'),
    authStatus:     $('#auth-status'),
    authUser:       $('#auth-user'),
    authName:       $('#auth-name'),
    authLogout:     $('#auth-logout'),
  };

  // ---------------------
  // State
  // ---------------------
  let registry = null;
  let config = null;
  let currentRound = null;
  let leaderboard = null;
  let pollTimer = null;
  let currentUser = null;
  let currentSlug = null;
  let searchTimer = null;
  let submitting = false;
  let currentProvider = 'itunes'; // Active search provider
  let viewingRoundNum = null;   // Which round the user is looking at
  let liveRoundNum = null;      // The actual current round (today's)
  let countdownTimer = null;
  let authToken = null;         // Session token from Worker auth

  // ---------------------
  // Routing
  // ---------------------

  /**
   * Read competition slug from URL hash (#competition=slug) or query param.
   */
  function getSlugFromURL() {
    // Hash takes priority: #competition=test-2026
    const hash = window.location.hash.slice(1);
    if (hash) {
      const params = new URLSearchParams(hash);
      if (params.has('competition')) return params.get('competition');
    }
    // Fallback to query param: ?competition=test-2026
    const search = new URLSearchParams(window.location.search);
    if (search.has('competition')) return search.get('competition');
    // No auto-resume — always show picker unless URL specifies a competition
    return null;
  }

  /**
   * Set the URL hash to the selected competition.
   */
  function setSlugInURL(slug) {
    window.location.hash = `competition=${slug}`;
    localStorage.setItem('rocktober-last-competition', slug);
  }

  /**
   * Clear the URL hash (back to picker).
   */
  function clearSlugFromURL() {
    history.pushState(null, '', window.location.pathname + window.location.search);
  }

  // ---------------------
  // Data Loading
  // ---------------------

  async function fetchJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
    return res.json();
  }

  async function loadRegistry() {
    return fetchJSON('competitions/registry.json');
  }

  async function loadConfig(slug) {
    return fetchJSON(`competitions/${slug}/config.json`);
  }

  async function loadRound(slug, dayNum) {
    const padded = String(dayNum).padStart(2, '0');
    return fetchJSON(`competitions/${slug}/rounds/day-${padded}.json`);
  }

  async function loadLeaderboard(slug) {
    return fetchJSON(`competitions/${slug}/leaderboard.json`);
  }

  // ---------------------
  // Date & Phase Logic
  // ---------------------

  function getCurrentRoundNumber(cfg) {
    const tz = cfg.schedule?.timezone || 'America/Indiana/Indianapolis';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const startStr = cfg.startDate;
    const endStr = cfg.endDate;

    if (todayStr < startStr) return 0;

    if (todayStr > endStr) {
      return cfg.totalRounds || -1;
    }

    const todayMs = new Date(todayStr + 'T00:00:00').getTime();
    const startMs = new Date(startStr + 'T00:00:00').getTime();
    const diffDays = Math.round((todayMs - startMs) / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }

  let cachedMaxRound = {};  // slug -> highest known round number

  async function findLatestRound(slug, maxRound) {
    // Use cached max if we've already probed this competition
    const cachedMax = cachedMaxRound[slug];
    const startFrom = cachedMax || maxRound;

    for (let i = startFrom; i >= 1; i--) {
      try {
        const round = await loadRound(slug, i);
        cachedMaxRound[slug] = i;  // Cache the highest found
        return { round, num: i };
      } catch { /* keep searching */ }
    }
    return null;
  }

  function toCompetitionDate(dateStr, timeStr, timezone) {
    const [hours, minutes] = timeStr.split(':').map(Number);
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

  function getCurrentPhase(round, cfg) {
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
  // Round Navigation
  // ---------------------

  /**
   * Navigate to a different round (prev/next).
   */
  async function navigateToRound(roundNum) {
    if (!config || !currentSlug || roundNum < 1) return;
    const maxRound = config.totalRounds || 31;
    if (roundNum > maxRound) return;

    try {
      const round = await loadRound(currentSlug, roundNum);
      viewingRoundNum = roundNum;
      currentRound = round;

      const phase = getCurrentPhase(round, config);
      const isLive = (roundNum === liveRoundNum);

      renderTheme(round, roundNum);
      renderSubmissions(round.submissions, phase, round.day);
      toggleSearchPanel(isLive ? phase : 'none'); // Only show search on live round
      if (phase === 'results') {
        renderWinner(round);
      } else {
        dom.winnerDisplay.classList.add('hidden');
      }
      renderComments(round);
      updateRoundNav(roundNum);
      updateCountdown(round, config);
    } catch {
      // Round doesn't exist — don't navigate
    }
  }

  /**
   * Update prev/next button states.
   */
  function updateRoundNav(roundNum) {
    if (!dom.prevRound || !dom.nextRound) return;
    dom.prevRound.disabled = (roundNum <= 1);
    // Disable next if at or beyond the latest available round
    const maxRound = config?.totalRounds || 31;
    dom.nextRound.disabled = (roundNum >= maxRound);
  }

  /**
   * Initialize round navigation handlers.
   */
  function initRoundNav() {
    dom.prevRound?.addEventListener('click', () => {
      if (viewingRoundNum > 1) navigateToRound(viewingRoundNum - 1);
    });
    dom.nextRound?.addEventListener('click', () => {
      navigateToRound(viewingRoundNum + 1);
    });
  }

  // ---------------------
  // Countdown Timer
  // ---------------------

  /**
   * Compute the next phase transition time and start a countdown.
   */
  function updateCountdown(round, cfg) {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    if (!dom.phaseCountdown) return;

    // Only show countdown for today's round with a schedule
    if (!cfg?.schedule || !round?.date) {
      dom.phaseCountdown.classList.add('hidden');
      return;
    }

    const tz = cfg.schedule.timezone;
    const phase = getCurrentPhase(round, cfg);

    // Determine what we're counting down to
    let targetTime = null;
    let targetLabel = '';

    if (phase === 'pre') {
      targetTime = toCompetitionDate(round.date, cfg.schedule.submissionOpen, tz);
      targetLabel = 'SUBMISSIONS OPEN IN';
    } else if (phase === 'submission') {
      targetTime = toCompetitionDate(round.date, cfg.schedule.votingOpen, tz);
      targetLabel = 'VOTING OPENS IN';
    } else if (phase === 'voting') {
      targetTime = toCompetitionDate(round.date, cfg.schedule.resultsReveal, tz);
      targetLabel = 'RESULTS IN';
    } else {
      // results — no countdown
      dom.phaseCountdown.classList.add('hidden');
      return;
    }

    if (!targetTime) {
      dom.phaseCountdown.classList.add('hidden');
      return;
    }

    dom.phaseCountdown.classList.remove('hidden');

    function tick() {
      const now = new Date();
      const diff = targetTime - now;
      if (diff <= 0) {
        dom.phaseCountdown.textContent = `${targetLabel}: NOW`;
        clearInterval(countdownTimer);
        countdownTimer = null;
        // Refresh to pick up phase change
        setTimeout(() => refreshRound(viewingRoundNum), 2000);
        return;
      }
      const hours = Math.floor(diff / 3_600_000);
      const mins = Math.floor((diff % 3_600_000) / 60_000);
      const secs = Math.floor((diff % 60_000) / 1000);
      const parts = [];
      if (hours > 0) parts.push(`${hours}H`);
      parts.push(`${String(mins).padStart(2, '0')}M`);
      parts.push(`${String(secs).padStart(2, '0')}S`);
      dom.phaseCountdown.textContent = `${targetLabel} ${parts.join(' ')}`;
    }

    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  // ---------------------
  // Auth & Session
  // ---------------------

  /**
   * Get the session key for a competition.
   */
  function sessionKey(slug) {
    return `rocktober-session-${slug}`;
  }

  /**
   * Load saved session from localStorage.
   */
  function loadSession(slug) {
    try {
      const raw = localStorage.getItem(sessionKey(slug));
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (session.name && session.token) return session;
      return null;
    } catch { return null; }
  }

  /**
   * Save session to localStorage.
   */
  function saveSession(slug, name, token) {
    localStorage.setItem(sessionKey(slug), JSON.stringify({ name, token }));
  }

  /**
   * Clear session from localStorage.
   */
  function clearSession(slug) {
    localStorage.removeItem(sessionKey(slug));
  }

  /**
   * Authenticate with invite code via Worker.
   */
  async function authenticate(code) {
    if (!currentSlug) return;

    dom.authSubmit.disabled = true;
    showAuthStatus('AUTHENTICATING...');

    try {
      const res = await fetch(`${WORKER_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competition: currentSlug,
          code: code.trim().toUpperCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAuthStatus(data.error || 'INVALID CODE');
        dom.authSubmit.disabled = false;
        return;
      }

      // Success — save session
      authToken = data.token;
      currentUser = data.name;
      saveSession(currentSlug, data.name, data.token);
      showAuthenticatedUI(data.name);

      // Re-render with user identity
      if (currentRound) {
        const phase = getCurrentPhase(currentRound, config);
        renderSubmissions(currentRound.submissions, phase, currentRound.day);
        toggleSearchPanel(phase);
      }
    } catch (err) {
      console.error('Auth error:', err);
      showAuthStatus('CONNECTION FAILED');
    } finally {
      dom.authSubmit.disabled = false;
    }
  }

  /**
   * Log out — clear session and show login UI.
   */
  function logout() {
    if (!currentSlug) return;
    clearSession(currentSlug);
    authToken = null;
    currentUser = null;
    showLoginUI();

    // Re-render without user identity
    if (currentRound) {
      const phase = getCurrentPhase(currentRound, config);
      renderSubmissions(currentRound.submissions, phase, currentRound.day);
      toggleSearchPanel(phase);
    }
  }

  /**
   * Show the login prompt.
   */
  function showLoginUI() {
    dom.authBar.classList.remove('hidden');
    dom.authUser.classList.add('hidden');
    dom.userSelect.classList.add('hidden');
    dom.authStatus.classList.add('hidden');
    dom.inviteCode.value = '';
  }

  /**
   * Show the authenticated user display.
   */
  function showAuthenticatedUI(name) {
    dom.authBar.classList.add('hidden');
    dom.authUser.classList.remove('hidden');
    dom.userSelect.classList.add('hidden');
    dom.authName.textContent = name;
    showSettings();
  }

  /**
   * Show auth status message.
   */
  function showAuthStatus(msg) {
    dom.authStatus.textContent = msg;
    dom.authStatus.classList.remove('hidden');
  }

  /**
   * Initialize auth: restore session or show login.
   * Falls back to the v1 user dropdown if Worker auth isn't available.
   */
  function initAuth(members) {
    if (!members || members.length === 0) return;

    // Try to restore session
    const session = loadSession(currentSlug);
    if (session) {
      const validNames = members.map(m => m.name);
      if (validNames.includes(session.name)) {
        authToken = session.token;
        currentUser = session.name;
        showAuthenticatedUI(session.name);
        return;
      }
      // Session user no longer in members — clear
      clearSession(currentSlug);
    }

    // No valid session — show login
    showLoginUI();
  }

  /**
   * Initialize auth event handlers.
   */
  function initAuthHandlers() {
    dom.authSubmit?.addEventListener('click', () => {
      const code = dom.inviteCode?.value?.trim();
      if (code) authenticate(code);
    });

    dom.inviteCode?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const code = dom.inviteCode.value.trim();
        if (code) authenticate(code);
      }
    });

    dom.authLogout?.addEventListener('click', logout);
  }

  // ---------------------
  // User Identity (v1 fallback)
  // ---------------------

  function initUser(members) {
    // Auth system handles identity now — this is the fallback for when
    // Worker auth isn't configured (e.g., local development)
    if (!members || members.length === 0) return;

    // If auth is active, don't show the old dropdown
    if (authToken) return;

    const stored = localStorage.getItem(`rocktober-user-${currentSlug}`);
    const validNames = members.map(m => m.name);

    dom.currentUser.innerHTML = validNames
      .map(name => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`)
      .join('');

    if (stored && validNames.includes(stored)) {
      currentUser = stored;
      dom.currentUser.value = stored;
    } else {
      currentUser = validNames[0];
      localStorage.setItem(`rocktober-user-${currentSlug}`, currentUser);
    }

    // Only show dropdown if auth bar isn't visible (Worker not available)
    // The dropdown shows after auth fails to reach the Worker
  }

  // ---------------------
  // Voting
  // ---------------------

  function voteKey(roundDay) {
    return `rocktober-vote-${currentSlug}-day-${String(roundDay).padStart(2, '0')}`;
  }

  function getStoredVote(roundDay) {
    return localStorage.getItem(voteKey(roundDay));
  }

  async function handleVote(trackId, submitter, roundDay) {
    const selfVoteAllowed = config?.selfVoteAllowed ?? false;
    if (!selfVoteAllowed && submitter === currentUser) return;
    // Allow vote changing — if already voted for the same track, ignore
    const existingVoteId = getStoredVote(roundDay);
    if (existingVoteId === trackId) return;

    localStorage.setItem(voteKey(roundDay), trackId);
    const phase = getCurrentPhase(currentRound, config);
    renderSubmissions(currentRound.submissions, phase, roundDay);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${WORKER_URL}/vote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          competition: currentSlug,
          day: roundDay,
          voter: currentUser,
          trackId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        localStorage.removeItem(voteKey(roundDay));
        renderSubmissions(currentRound.submissions, phase, roundDay);
        console.error('Vote failed:', data.error);
        return;
      }

      const sub = (currentRound.submissions || []).find(s => s.trackId === trackId);
      if (sub) sub.votes = (sub.votes || 0) + 1;

    } catch (err) {
      localStorage.removeItem(voteKey(roundDay));
      renderSubmissions(currentRound.submissions, phase, roundDay);
      console.error('Vote error:', err);
    }
  }

  function initVoteHandler() {
    dom.submissionsGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.vote-btn');
      if (!btn || btn.disabled) return;
      handleVote(btn.dataset.track, btn.dataset.submitter, currentRound?.day);
    });
  }

  // ---------------------
  // Rendering — Picker
  // ---------------------

  function renderPicker(competitions) {
    if (!competitions || competitions.length === 0) {
      dom.pickerGrid.innerHTML = '<p class="no-data">No competitions available.</p>';
      return;
    }

    dom.pickerGrid.innerHTML = competitions.map(comp => {
      const statusClass = comp.status === 'active' ? 'status-active' :
                          comp.status === 'completed' ? 'status-completed' :
                          'status-upcoming';
      const statusLabel = comp.status.toUpperCase();

      return `
        <button class="comp-card" data-slug="${escapeHTML(comp.slug)}">
          <span class="comp-card-status ${statusClass}">${statusLabel}</span>
          <h3 class="comp-card-name">${escapeHTML(comp.name)}</h3>
          <p class="comp-card-dates">${escapeHTML(comp.startDate)} &mdash; ${escapeHTML(comp.endDate)}</p>
          <p class="comp-card-meta">${comp.memberCount} members &middot; ${comp.totalRounds} rounds</p>
          ${comp.description ? `<p class="comp-card-desc">${escapeHTML(comp.description)}</p>` : ''}
        </button>`;
    }).join('');
  }

  function initPickerHandler() {
    dom.pickerGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.comp-card');
      if (!card) return;
      e.preventDefault();
      const slug = card.dataset.slug;
      if (slug) {
        enterCompetition(slug);
        setSlugInURL(slug);
      }
    });
  }

  // ---------------------
  // Rendering — Competition
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
      ? `Picked by <strong>${escapeHTML(round.themePicker)}</strong>`
      : '';

    // Show date on the badge for non-live rounds
    if (round.date && viewingRoundNum !== liveRoundNum) {
      dom.roundBadge.textContent += ` \u2022 ${round.date}`;
    }

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
    toggleExportButton(submissions);
    dom.submissionsGrid.innerHTML = submissions.map(sub => {
      let voteButton = '';
      if (phase === 'voting') {
        const selfVoteAllowed = config?.selfVoteAllowed ?? false;
        const isOwnSong = !selfVoteAllowed && currentUser && sub.submitter === currentUser;
        const isVoted = existingVote === sub.trackId;
        const hasVoted = !!existingVote;

        if (isOwnSong) {
          voteButton = `<button class="vote-btn own-song" disabled>YOUR SONG</button>`;
        } else if (isVoted) {
          voteButton = `<button class="vote-btn voted" data-track="${escapeHTML(sub.trackId || '')}" data-submitter="${escapeHTML(sub.submitter || '')}">VOTED</button>`;
        } else {
          voteButton = `<button class="vote-btn" data-track="${escapeHTML(sub.trackId || '')}" data-submitter="${escapeHTML(sub.submitter || '')}">VOTE</button>`;
        }
      }

      const voteCount = phase === 'results' && sub.votes !== undefined
        ? `<span class="neon-blue-text pixel-text" style="font-size:0.5rem;margin-top:0.5rem;display:inline-block">${sub.votes} VOTES</span>`
        : '';

      const previewUrl = sub.previewUrl || '';
      const playBtn = previewUrl
        ? `<button class="play-btn" data-preview="${escapeHTML(previewUrl)}" data-track="${escapeHTML(sub.trackId || '')}" aria-label="Play preview">▶</button>`
        : '';

      const searchQuery = encodeURIComponent(`${sub.title || ''} ${sub.artist || ''}`);
      const openLinks = `<div class="open-links">
        <a href="https://open.spotify.com/search/${searchQuery}" target="_blank" rel="noopener" class="open-link open-spotify">Spotify</a>
        <a href="https://music.youtube.com/search?q=${searchQuery}" target="_blank" rel="noopener" class="open-link open-ytm">YT Music</a>
        <a href="https://music.apple.com/us/search?term=${searchQuery}" target="_blank" rel="noopener" class="open-link open-apple">Apple</a>
      </div>`;

      return `
        <div class="song-card${phase === 'results' && sub.submitter === currentRound?.winner ? ' winner-highlight' : ''}">
          <div class="album-art-wrap">
            <img class="album-art"
                 src="${sub.albumArt || ''}"
                 alt="${sub.title || 'Album art'}"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 80%22><rect fill=%22%23111%22 width=%2280%22 height=%2280%22/><text x=%2240%22 y=%2244%22 text-anchor=%22middle%22 fill=%22%23333%22 font-size=%2212%22>?</text></svg>'">
            ${playBtn}
          </div>
          <div class="song-info">
            <div class="song-title">${escapeHTML(sub.title || 'Unknown')}</div>
            <div class="song-artist">${escapeHTML(sub.artist || 'Unknown Artist')}</div>
            <div class="song-submitter">${escapeHTML(sub.submitter || 'Anonymous')}</div>
            ${openLinks}
            ${voteButton}
            ${voteCount}
            ${buildReactionsHTML(sub)}
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
           <img class="album-art" src="${winner.albumArt || ''}" alt="${escapeHTML(winner.title)}">
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
  // Settings
  // ---------------------

  function initSettings() {
    const themeSelect = $('#setting-theme');
    const sfxToggle = $('#setting-sfx');

    // Load saved settings
    const savedTheme = localStorage.getItem('rocktober-theme') || 'neon';
    const savedSfx = localStorage.getItem('rocktober-sfx') !== 'false';

    if (themeSelect) themeSelect.value = savedTheme;
    if (sfxToggle) sfxToggle.checked = savedSfx;

    themeSelect?.addEventListener('change', () => {
      localStorage.setItem('rocktober-theme', themeSelect.value);
    });

    sfxToggle?.addEventListener('change', () => {
      localStorage.setItem('rocktober-sfx', sfxToggle.checked);
    });
  }

  function showSettings() {
    const section = $('#settings-section');
    if (!section) return;

    section.classList.toggle('hidden', !currentUser);

    const nameEl = $('#setting-display-name');
    if (nameEl) nameEl.textContent = currentUser || '—';
  }

  // ---------------------
  // Playback & Export
  // ---------------------

  let audioPlayer = null;
  let playingTrackId = null;

  /**
   * Toggle 30-second preview playback for a track.
   */
  function togglePreview(previewUrl, trackId) {
    if (!previewUrl) return;

    // If same track is playing, stop it
    if (playingTrackId === trackId && audioPlayer) {
      audioPlayer.pause();
      audioPlayer = null;
      playingTrackId = null;
      updatePlayButtons();
      return;
    }

    // Stop any current playback
    if (audioPlayer) {
      audioPlayer.pause();
    }

    audioPlayer = new Audio(previewUrl);
    playingTrackId = trackId;
    updatePlayButtons();

    audioPlayer.play().catch(() => {
      playingTrackId = null;
      updatePlayButtons();
    });

    audioPlayer.addEventListener('ended', () => {
      playingTrackId = null;
      updatePlayButtons();
    });
  }

  /**
   * Update play button visual states.
   */
  function updatePlayButtons() {
    $$('.play-btn').forEach(btn => {
      const isPlaying = btn.dataset.track === playingTrackId;
      btn.classList.toggle('playing', isPlaying);
      btn.textContent = isPlaying ? '⏸' : '▶';
    });
  }

  /**
   * Copy the current round's track list to clipboard.
   */
  function exportPlaylist() {
    if (!currentRound?.submissions) return;

    const theme = currentRound.theme || 'Rocktober';
    const trackList = currentRound.submissions
      .map(s => `${s.title} - ${s.artist} (${s.submitter})`)
      .join('\n');

    const fullText = `${theme}\n${'—'.repeat(30)}\n${trackList}`;

    navigator.clipboard.writeText(fullText).then(() => {
      const btn = $('#export-playlist');
      if (btn) {
        btn.textContent = 'COPIED!';
        setTimeout(() => { btn.textContent = 'COPY PLAYLIST'; }, 3000);
      }
    }).catch(() => {});
  }

  /**
   * Open all tracks in Spotify search (one tab per track).
   * For single tracks, opens directly. For multiple, opens the first
   * and copies the rest to clipboard.
   */
  function exportToSpotify() {
    if (!currentRound?.submissions) return;

    const subs = currentRound.submissions.filter(s => s.title && s.artist);
    if (subs.length === 0) return;

    // Open first track in Spotify search
    const first = subs[0];
    window.open(`https://open.spotify.com/search/${encodeURIComponent(`${first.title} ${first.artist}`)}`, '_blank');

    if (subs.length > 1) {
      const btn = $('#export-spotify');
      if (btn) {
        btn.textContent = `OPENED 1/${subs.length}`;
        setTimeout(() => { btn.textContent = 'OPEN IN SPOTIFY'; }, 3000);
      }
    }
  }

  function initPlayback() {
    // Play button clicks via delegation
    dom.submissionsGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.play-btn');
      if (!btn) return;
      e.stopPropagation();
      togglePreview(btn.dataset.preview, btn.dataset.track);
    });

    // Export buttons
    $('#export-playlist')?.addEventListener('click', exportPlaylist);
    $('#export-spotify')?.addEventListener('click', exportToSpotify);
  }

  /**
   * Show/hide the export button based on submissions.
   */
  function toggleExportButton(submissions) {
    const section = $('#export-section');
    if (!section) return;
    const hasTracks = submissions && submissions.some(s => s.trackId);
    section.classList.toggle('hidden', !hasTracks);
  }

  // ---------------------
  // Social — Comments & Reactions
  // ---------------------

  const REACTIONS = ['🔥', '❤️', '💀', '💯'];

  function renderComments(round) {
    const section = $('#comments-section');
    const list = $('#comments-list');
    const form = $('#comment-form');
    if (!section || !list) return;

    section.classList.remove('hidden');

    const comments = round?.comments || [];
    if (comments.length === 0) {
      list.innerHTML = '<p class="no-comments">No comments yet. Be the first!</p>';
    } else {
      list.innerHTML = comments.map(c => {
        const canDelete = currentUser && c.author === currentUser;
        const deleteBtn = canDelete
          ? `<button class="comment-delete" data-id="${escapeHTML(c.id || '')}" aria-label="Delete comment">&times;</button>`
          : '';
        return `
        <div class="comment-item">
          <span class="comment-author">${escapeHTML(c.author)}</span>
          <span class="comment-text">${escapeHTML(c.text)}</span>
          ${deleteBtn}
        </div>`;
      }).join('');
      list.scrollTop = list.scrollHeight;
    }

    // Show comment form if authenticated
    if (form) {
      form.classList.toggle('hidden', !currentUser);
    }
  }

  function buildReactionsHTML(sub) {
    const reactions = sub.reactions || {};
    return `<div class="reactions-bar">
      ${REACTIONS.map(emoji => {
        const users = reactions[emoji] || [];
        const count = users.length;
        const isActive = currentUser && users.includes(currentUser);
        return `<button class="reaction-btn${isActive ? ' active' : ''}"
                  data-emoji="${emoji}" data-track="${escapeHTML(sub.trackId || '')}"
                  ${!currentUser ? 'disabled' : ''}
                >${emoji}${count > 0 ? `<span class="reaction-count">${count}</span>` : ''}</button>`;
      }).join('')}
    </div>`;
  }

  async function handleComment(text) {
    if (!currentUser || !currentRound || !currentSlug) return;

    const commentInput = $('#comment-input');
    const commentSubmit = $('#comment-submit');
    if (commentSubmit) commentSubmit.disabled = true;

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${WORKER_URL}/comment`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          competition: currentSlug,
          day: currentRound.day,
          author: currentUser,
          text: text.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Comment failed:', data.error);
        return;
      }

      // Update local state
      if (!currentRound.comments) currentRound.comments = [];
      currentRound.comments.push({ author: currentUser, text: text.trim() });
      renderComments(currentRound);
      if (commentInput) commentInput.value = '';
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      if (commentSubmit) commentSubmit.disabled = false;
    }
  }

  async function handleReaction(emoji, trackId) {
    if (!currentUser || !currentRound || !currentSlug) return;

    // Optimistic toggle
    const sub = (currentRound.submissions || []).find(s => s.trackId === trackId);
    if (!sub) return;
    if (!sub.reactions) sub.reactions = {};
    if (!sub.reactions[emoji]) sub.reactions[emoji] = [];

    const idx = sub.reactions[emoji].indexOf(currentUser);
    if (idx >= 0) {
      sub.reactions[emoji].splice(idx, 1);
    } else {
      sub.reactions[emoji].push(currentUser);
    }

    // Re-render submissions to show updated reactions
    const phase = getCurrentPhase(currentRound, config);
    renderSubmissions(currentRound.submissions, phase, currentRound.day);

    // Persist to Worker
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      await fetch(`${WORKER_URL}/react`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          competition: currentSlug,
          day: currentRound.day,
          user: currentUser,
          trackId,
          emoji,
        }),
      });
    } catch (err) {
      console.error('Reaction error:', err);
    }
  }

  async function handleDeleteComment(commentId) {
    if (!currentUser || !currentRound || !currentSlug) return;

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${WORKER_URL}/comment`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          competition: currentSlug,
          day: currentRound.day,
          commentId,
          user: currentUser,
        }),
      });

      if (res.ok) {
        currentRound.comments = (currentRound.comments || []).filter(c => c.id !== commentId);
        renderComments(currentRound);
      }
    } catch (err) {
      console.error('Delete comment error:', err);
    }
  }

  function initSocialHandlers() {
    // Comment submission
    $('#comment-submit')?.addEventListener('click', () => {
      const text = $('#comment-input')?.value?.trim();
      if (text) handleComment(text);
    });

    $('#comment-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = e.target.value.trim();
        if (text) handleComment(text);
      }
    });

    // Comment delete via delegation
    $('#comments-list')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.comment-delete');
      if (!btn) return;
      handleDeleteComment(btn.dataset.id);
    });

    // Reaction clicks via delegation on submissions grid
    dom.submissionsGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.reaction-btn');
      if (!btn || btn.disabled) return;
      handleReaction(btn.dataset.emoji, btn.dataset.track);
    });
  }

  // ---------------------
  // Song Search & Submission
  // ---------------------

  function toggleSearchPanel(phase) {
    if (!dom.songSearch) return;
    // Only show search on the live round's submission phase
    if (phase === 'submission' && currentUser && viewingRoundNum === liveRoundNum) {
      dom.songSearch.classList.remove('hidden');
    } else {
      dom.songSearch.classList.add('hidden');
    }
  }

  function initSearch() {
    if (!dom.searchInput) return;

    dom.searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const query = dom.searchInput.value.trim();
      if (query.length < 2) {
        hideSearchResults();
        return;
      }
      searchTimer = setTimeout(() => performSearch(query), SEARCH_DEBOUNCE_MS);
    });

    dom.searchResults?.addEventListener('click', (e) => {
      const btn = e.target.closest('.submit-btn');
      if (!btn || submitting) return;
      const trackData = JSON.parse(btn.dataset.track);
      handleSubmission(trackData);
    });

    // Provider tab switching
    $('#provider-tabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('.provider-tab');
      if (!tab) return;
      const provider = tab.dataset.provider;
      if (provider === currentProvider) return;

      // Update active tab
      $$('.provider-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentProvider = provider;

      // Clear results and re-search if there's a query
      hideSearchResults();
      const query = dom.searchInput?.value?.trim();
      if (query && query.length >= 2) {
        performSearch(query);
      }
    });
  }

  async function performSearch(query) {
    showSearchStatus('Searching...');

    try {
      const res = await fetch(`${WORKER_URL}/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Search failed (${res.status})`);
      }

      const data = await res.json();
      renderSearchResults(data.tracks || []);
    } catch (err) {
      console.error('Search error:', err);
      showSearchStatus(`Search failed: ${err.message}`);
    }
  }

  function showSearchStatus(msg) {
    if (!dom.searchStatus) return;
    dom.searchStatus.textContent = msg;
    dom.searchStatus.classList.remove('hidden');
  }

  function hideSearchResults() {
    dom.searchResults?.classList.add('hidden');
    dom.searchStatus?.classList.add('hidden');
  }

  function renderSearchResults(tracks) {
    if (!dom.searchResults) return;

    dom.searchStatus.classList.add('hidden');

    if (tracks.length === 0) {
      showSearchStatus('No results found.');
      dom.searchResults.classList.add('hidden');
      return;
    }

    dom.searchResults.classList.remove('hidden');
    dom.searchResults.innerHTML = tracks.map(track => {
      const trackJSON = escapeHTML(JSON.stringify(track));
      return `
        <div class="search-result-card">
          <img class="search-album-art"
               src="${track.albumArt || ''}"
               alt="${escapeHTML(track.title)}"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 60 60%22><rect fill=%22%23111%22 width=%2260%22 height=%2260%22/><text x=%2230%22 y=%2234%22 text-anchor=%22middle%22 fill=%22%23333%22 font-size=%2210%22>?</text></svg>'">
          <div class="search-track-info">
            <div class="search-track-title">${escapeHTML(track.title)}</div>
            <div class="search-track-artist">${escapeHTML(track.artist)}</div>
          </div>
          <button class="submit-btn" data-track="${trackJSON}">SUBMIT</button>
        </div>`;
    }).join('');
  }

  async function handleSubmission(track) {
    if (submitting || !currentUser || !currentRound || !config) return;
    submitting = true;

    const existing = (currentRound.submissions || []).find(s => s.submitter === currentUser);
    if (existing) {
      const ok = confirm(
        `You already submitted "${existing.title}" by ${existing.artist}.\n\nReplace with "${track.title}" by ${track.artist}?`
      );
      if (!ok) {
        submitting = false;
        return;
      }
    }

    showSearchStatus('Submitting...');

    try {
      const submitHeaders = { 'Content-Type': 'application/json' };
      if (authToken) submitHeaders['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${WORKER_URL}/submit`, {
        method: 'POST',
        headers: submitHeaders,
        body: JSON.stringify({
          competition: currentSlug,
          day: currentRound.day,
          submitter: currentUser,
          track: {
            trackId: track.trackId,
            title: track.title,
            artist: track.artist,
            albumArt: track.albumArt || '',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      // Re-fetch the round from source after successful submission
      // to avoid stale local state causing duplicate cards
      try {
        const freshRound = await loadRound(currentSlug, currentRound.day);
        currentRound = freshRound;
      } catch {
        // Fallback: update local state manually
        if (data.submission) {
          const subs = currentRound.submissions || [];
          const idx = subs.findIndex(s => s.submitter === currentUser);
          if (idx >= 0) {
            subs[idx] = data.submission;
          } else {
            subs.push(data.submission);
          }
          currentRound.submissions = subs;
        }
      }

      const phase = getCurrentPhase(currentRound, config);
      renderSubmissions(currentRound.submissions, phase, currentRound.day);

      dom.searchInput.value = '';
      hideSearchResults();
      showSearchStatus(data.replaced
        ? `Replaced! Now playing: "${track.title}"`
        : `Submitted! "${track.title}" is locked in.`
      );
      setTimeout(() => dom.searchStatus?.classList.add('hidden'), 4000);

    } catch (err) {
      console.error('Submit error:', err);
      showSearchStatus(`Submit failed: ${err.message}`);
    } finally {
      submitting = false;
    }
  }

  // ---------------------
  // Screen Transitions
  // ---------------------

  function showPickerScreen() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    // Reset competition state
    config = null;
    currentRound = null;
    leaderboard = null;
    currentUser = null;
    currentSlug = null;
    viewingRoundNum = null;
    liveRoundNum = null;
    authToken = null;

    dom.compScreen.classList.add('hidden');
    dom.pickerScreen.classList.remove('hidden');
    dom.userSelect.classList.add('hidden');
    dom.authBar?.classList.add('hidden');
    dom.authUser?.classList.add('hidden');

    // Update header
    $('.tagline').textContent = 'Daily Themed Playlist Battles';
  }

  function showCompetitionScreen() {
    dom.pickerScreen.classList.add('hidden');
    dom.compScreen.classList.remove('hidden');
  }

  // ---------------------
  // Enter a Competition
  // ---------------------

  async function enterCompetition(slug) {
    currentSlug = slug;
    showCompetitionScreen();
    showLoading();

    try {
      config = await loadConfig(slug);
      renderCompInfo(config);
      initAuth(config.members);

      // Update tagline with competition name
      $('.tagline').textContent = config.name || slug;

      const roundNum = getCurrentRoundNumber(config);
      if (roundNum <= 0) {
        dom.loading.classList.add('hidden');
        dom.themeDisplay.classList.remove('hidden');
        dom.themeTitle.textContent = 'COMING SOON';
        dom.roundBadge.textContent = 'NOT STARTED';
        dom.phaseBadge.textContent = 'waiting';
        dom.phaseBadge.className = 'phase-badge';
        dom.phaseCountdown?.classList.add('hidden');
        updateRoundNav(0);
        return;
      }

      let actualRoundNum = roundNum;
      try {
        currentRound = await loadRound(slug, roundNum);
      } catch {
        const latest = await findLatestRound(slug, config.totalRounds || roundNum);
        if (latest) {
          currentRound = latest.round;
          actualRoundNum = latest.num;
        } else {
          throw new Error('No round data available.');
        }
      }

      liveRoundNum = actualRoundNum;
      viewingRoundNum = actualRoundNum;

      const phase = getCurrentPhase(currentRound, config);

      renderTheme(currentRound, actualRoundNum);
      renderSubmissions(currentRound.submissions, phase, currentRound.day);
      toggleSearchPanel(phase);
      if (phase === 'results') renderWinner(currentRound);
      renderComments(currentRound);
      updateRoundNav(actualRoundNum);
      updateCountdown(currentRound, config);

      try {
        leaderboard = await loadLeaderboard(slug);
        renderLeaderboard(leaderboard);
      } catch {
        // Leaderboard may not exist yet
      }

      pollTimer = setInterval(() => refreshRound(liveRoundNum), POLL_INTERVAL_MS);

    } catch (err) {
      console.error('Competition load failed:', err);
      showError(err.message || 'Could not load competition data.');
    }
  }

  // ---------------------
  // Refresh
  // ---------------------

  async function refreshRound(roundNum) {
    try {
      const round = await loadRound(currentSlug, roundNum);
      const oldPhase = getCurrentPhase(currentRound, config);
      const newPhase = getCurrentPhase(round, config);

      // Only update UI if the user is viewing the live round
      const isViewingLive = (viewingRoundNum === roundNum);

      if (oldPhase !== newPhase || JSON.stringify(round) !== JSON.stringify(currentRound)) {
        if (isViewingLive) {
          currentRound = round;
          renderTheme(round, roundNum);
          renderSubmissions(round.submissions, newPhase, round.day);
          toggleSearchPanel(newPhase);
          if (newPhase === 'results') renderWinner(round);
          updateCountdown(round, config);
        } else {
          // Stash the update but don't disrupt the user's view
          currentRound = round;
        }

        try {
          leaderboard = await loadLeaderboard(currentSlug);
          renderLeaderboard(leaderboard);
        } catch { /* ok */ }
      }
    } catch {
      // Silent fail on poll
    }
  }

  // ---------------------
  // App Lifecycle
  // ---------------------

  async function init() {
    initVoteHandler();
    initSearch();
    initPickerHandler();
    initRoundNav();
    initAuthHandlers();
    initSocialHandlers();
    initPlayback();
    initSettings();

    // Back button
    dom.backBtn?.addEventListener('click', () => {
      clearSlugFromURL();
      showPickerScreen();
    });

    // Handle browser back/forward (only react if slug actually changed)
    window.addEventListener('hashchange', () => {
      const slug = getSlugFromURL();
      if (slug && slug !== currentSlug) {
        enterCompetition(slug);
      } else if (!window.location.hash && currentSlug) {
        showPickerScreen();
      }
    });

    // Load registry
    try {
      registry = await loadRegistry();
      renderPicker(registry.competitions);
      dom.pickerLoading.classList.add('hidden');
    } catch (err) {
      console.error('Registry load failed:', err);
      dom.pickerLoading.classList.add('hidden');
      dom.pickerGrid.innerHTML = '<p class="no-data">Could not load competitions.</p>';
    }

    // Check if URL already has a competition selected
    const slug = getSlugFromURL();
    if (slug) {
      // Verify slug exists in registry
      const exists = registry?.competitions?.some(c => c.slug === slug);
      if (exists) {
        enterCompetition(slug);
      } else {
        // Invalid slug — show picker
        clearSlugFromURL();
        showPickerScreen();
      }
    }
  }

  // ---------------------
  // Boot
  // ---------------------
  document.addEventListener('DOMContentLoaded', init);

  return {
    init,
    getRegistry: () => registry,
    getConfig: () => config,
    getCurrentRound: () => currentRound,
    getLeaderboard: () => leaderboard,
    getCurrentUser: () => currentUser,
    getCurrentSlug: () => currentSlug,
  };
})();
