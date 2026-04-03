/**
 * ROCKTOBER — Profile Page
 * User profile, music providers, connected accounts, stats.
 */
(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  let currentSlug = null;

  // ---------------------
  // Navigation
  // ---------------------

  function initNav() {
    const navItems = $$('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        const section = item.dataset.section;
        $$('.settings-section').forEach(s => s.classList.add('hidden'));
        $(`#section-${section}`)?.classList.remove('hidden');
      });
    });
  }

  // ---------------------
  // Profile
  // ---------------------

  function initProfile() {
    const session = getSession();
    if (!session) return;

    const name = session.name;
    $('#profile-name').value = name;
    $('#profile-user').textContent = name.toUpperCase();
    $('#profile-avatar').textContent = name.charAt(0).toUpperCase();

    // Load saved avatar color
    const savedColor = localStorage.getItem('rocktober-avatar-color') || '#ff2d95';
    $('#profile-avatar').style.background = savedColor;
    $$('.color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.color === savedColor);
    });

    // Load saved tagline
    const savedTagline = localStorage.getItem('rocktober-tagline') || '';
    $('#profile-tagline').value = savedTagline;

    // Color picker
    $('#avatar-colors')?.addEventListener('click', (e) => {
      const dot = e.target.closest('.color-dot');
      if (!dot) return;
      const color = dot.dataset.color;
      localStorage.setItem('rocktober-avatar-color', color);
      $('#profile-avatar').style.background = color;
      $$('.color-dot').forEach(d => d.classList.toggle('active', d === dot));
    });

    // Auto-save tagline
    $('#profile-tagline')?.addEventListener('input', (e) => {
      localStorage.setItem('rocktober-tagline', e.target.value);
    });
  }

  // ---------------------
  // Stats
  // ---------------------

  async function loadStats() {
    if (!currentSlug) return;
    const session = getSession();
    if (!session) return;

    try {
      const res = await fetch(`competitions/${currentSlug}/leaderboard.json`);
      if (!res.ok) return;
      const lb = await res.json();

      const standings = lb.standings || [];
      const me = standings.find(s => s.name === session.name);
      const rank = standings.findIndex(s => s.name === session.name) + 1;

      // Count total submissions across rounds
      let totalSubmissions = 0;
      const configRes = await fetch(`competitions/${currentSlug}/config.json`);
      const config = configRes.ok ? await configRes.json() : null;
      const totalRounds = config?.totalRounds || 31;

      for (let i = 1; i <= totalRounds; i++) {
        try {
          const roundRes = await fetch(`competitions/${currentSlug}/rounds/day-${String(i).padStart(2, '0')}.json`);
          if (!roundRes.ok) continue;
          const round = await roundRes.json();
          if ((round.submissions || []).some(s => s.submitter === session.name)) {
            totalSubmissions++;
          }
        } catch { break; }
      }

      const wins = me?.wins || 0;
      const winRate = totalSubmissions > 0 ? Math.round((wins / totalSubmissions) * 100) : 0;

      $('#stat-wins').textContent = wins;
      $('#stat-submissions').textContent = totalSubmissions;
      $('#stat-winrate').textContent = `${winRate}%`;
      $('#stat-ranking').textContent = rank > 0 ? `#${rank}` : '#—';
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  // ---------------------
  // Connected Accounts
  // ---------------------

  function initAccounts() {
    const session = getSession();
    if (!session) return;

    // Check if session was created via OAuth (token contains the info)
    // For now, show connected status based on session existence
    if (session.token) {
      // We can't determine OAuth method from token alone, but we know they're authenticated
      // This will be enriched when OAuth providers store their method in session
    }
  }

  // ---------------------
  // Spotify Connect
  // ---------------------

  function initProviders() {
    const WORKER_URL = 'https://rocktober-worker.narehk.workers.dev';

    // Check Spotify token in localStorage
    const spotifyToken = localStorage.getItem('rocktober-spotify-token');
    if (spotifyToken) {
      $('#spotify-status').textContent = 'Connected';
      $('#spotify-status').style.color = '#00ff88';
      const btn = $('#spotify-connect');
      btn.textContent = 'DEFAULT';
      btn.classList.add('provider-default');
    }

    $('#spotify-connect')?.addEventListener('click', () => {
      if (!currentSlug) return;
      // Spotify user OAuth for playlist creation
      window.location.href = `${WORKER_URL}/auth/spotify?competition=${encodeURIComponent(currentSlug)}`;
    });
  }

  // ---------------------
  // Helpers
  // ---------------------

  function getSession() {
    if (!currentSlug) return null;
    try {
      const raw = localStorage.getItem(`rocktober-session-${currentSlug}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function getSlugFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('competition') || localStorage.getItem('rocktober-last-competition');
  }

  // ---------------------
  // Init
  // ---------------------

  async function init() {
    currentSlug = getSlugFromURL();
    initNav();
    initProfile();
    initAccounts();
    initProviders();
    await loadStats();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
