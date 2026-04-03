/**
 * ROCKTOBER — Settings Page
 * Standalone settings management for competition config, display prefs, and export/import.
 */
(() => {
  'use strict';

  const WORKER_URL = 'https://rocktober-worker.narehk.workers.dev';
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  let config = null;
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
  // Load Competition Config
  // ---------------------

  function getSlugFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('competition') || localStorage.getItem('rocktober-last-competition');
  }

  async function loadConfig(slug) {
    const res = await fetch(`competitions/${slug}/config.json`);
    if (!res.ok) throw new Error('Config not found');
    return res.json();
  }

  function populateCompetitionForm(cfg) {
    $('#setting-comp-name').value = cfg.name || '';
    $('#setting-comp-start').value = cfg.startDate || '';
    $('#setting-comp-end').value = cfg.endDate || '';
    $('#setting-comp-tz').value = cfg.schedule?.timezone || 'America/Indiana/Indianapolis';
    $('#setting-sub-open').value = cfg.schedule?.submissionOpen || '08:00';
    $('#setting-vote-open').value = cfg.schedule?.votingOpen || '15:00';
    $('#setting-results-reveal').value = cfg.schedule?.resultsReveal || '16:30';
    $('#setting-self-vote').checked = cfg.selfVoteAllowed || false;

    // Notifications
    const notif = cfg.notifications || {};
    $('#setting-webhook').value = notif.webhookUrl || '';
    $('#setting-notif-enabled').checked = notif.enabled || false;
    $('#notif-theme').checked = notif.themeReveal !== false;
    $('#notif-voting').checked = notif.votingOpen !== false;
    $('#notif-winner').checked = notif.winnerAnnounced !== false;
    $('#notif-reminder').checked = notif.submissionReminder || false;
  }

  // ---------------------
  // Save Competition Settings
  // ---------------------

  async function saveCompetitionSettings() {
    const btn = $('#comp-settings-save');
    btn.disabled = true;
    btn.textContent = 'SAVING...';

    const token = getAdminToken();
    if (!token) { btn.disabled = false; btn.textContent = 'SAVE CHANGES'; return; }

    const updates = {
      name: $('#setting-comp-name').value.trim(),
      startDate: $('#setting-comp-start').value,
      endDate: $('#setting-comp-end').value,
      selfVoteAllowed: $('#setting-self-vote').checked,
      schedule: {
        timezone: $('#setting-comp-tz').value,
        submissionOpen: $('#setting-sub-open').value,
        votingOpen: $('#setting-vote-open').value,
        votingClose: $('#setting-vote-open').value,
        resultsReveal: $('#setting-results-reveal').value,
        submissionClose: $('#setting-vote-open').value,
      },
    };

    try {
      const res = await fetch(`${WORKER_URL}/config/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ competition: currentSlug, config: updates }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }

      btn.textContent = 'SAVED ✓';
      setTimeout(() => { btn.textContent = 'SAVE CHANGES'; }, 2000);

      // Reload config
      config = await loadConfig(currentSlug);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      btn.disabled = false;
      if (btn.textContent === 'SAVING...') btn.textContent = 'SAVE CHANGES';
    }
  }

  // ---------------------
  // Save Notification Settings
  // ---------------------

  async function saveNotificationSettings() {
    const btn = $('#notif-settings-save');
    btn.disabled = true;
    btn.textContent = 'SAVING...';

    const token = getAdminToken();
    if (!token) { btn.disabled = false; btn.textContent = 'SAVE CHANGES'; return; }

    const updates = {
      notifications: {
        webhookUrl: $('#setting-webhook').value.trim(),
        enabled: $('#setting-notif-enabled').checked,
        themeReveal: $('#notif-theme').checked,
        votingOpen: $('#notif-voting').checked,
        winnerAnnounced: $('#notif-winner').checked,
        submissionReminder: $('#notif-reminder').checked,
      },
    };

    try {
      const res = await fetch(`${WORKER_URL}/config/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ competition: currentSlug, config: updates }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }

      btn.textContent = 'SAVED ✓';
      setTimeout(() => { btn.textContent = 'SAVE CHANGES'; }, 2000);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      btn.disabled = false;
      if (btn.textContent === 'SAVING...') btn.textContent = 'SAVE CHANGES';
    }
  }

  // ---------------------
  // Display Settings (localStorage)
  // ---------------------

  function initDisplaySettings() {
    const prefs = JSON.parse(localStorage.getItem('rocktober-display') || '{}');

    const scanlines = $('#display-scanlines');
    const glow = $('#display-glow');
    const grid = $('#display-grid');
    const animations = $('#display-animations');

    scanlines.checked = prefs.scanlines !== false;
    glow.checked = prefs.glow !== false;
    grid.checked = prefs.grid !== false;
    animations.checked = prefs.animations !== false;

    function save() {
      localStorage.setItem('rocktober-display', JSON.stringify({
        scanlines: scanlines.checked,
        glow: glow.checked,
        grid: grid.checked,
        animations: animations.checked,
      }));
      applyDisplaySettings();
    }

    scanlines.addEventListener('change', save);
    glow.addEventListener('change', save);
    grid.addEventListener('change', save);
    animations.addEventListener('change', save);

    applyDisplaySettings();
  }

  function applyDisplaySettings() {
    const prefs = JSON.parse(localStorage.getItem('rocktober-display') || '{}');
    const crt = document.querySelector('.crt-overlay');
    if (crt) crt.style.display = prefs.scanlines === false ? 'none' : '';

    document.body.classList.toggle('no-glow', prefs.glow === false);
    document.body.classList.toggle('no-grid', prefs.grid === false);
    document.body.classList.toggle('no-animations', prefs.animations === false);
  }

  // ---------------------
  // Export/Import
  // ---------------------

  function initExportImport() {
    $('#config-export')?.addEventListener('click', async () => {
      if (!config || !currentSlug) return;
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSlug}-config.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    $('#config-import-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          // Validate required fields
          if (!imported.name || !imported.slug || !imported.startDate || !imported.endDate) {
            alert('Invalid config: missing required fields (name, slug, startDate, endDate)');
            return;
          }

          // Show diff preview
          const preview = $('#import-preview');
          const diff = $('#import-diff');
          preview.classList.remove('hidden');

          const changes = [];
          for (const key of Object.keys(imported)) {
            const oldVal = JSON.stringify(config[key]);
            const newVal = JSON.stringify(imported[key]);
            if (oldVal !== newVal) {
              changes.push(`${key}: ${oldVal || '(none)'} → ${newVal}`);
            }
          }
          diff.textContent = changes.length > 0 ? changes.join('\n') : 'No changes detected.';

          // Wire up apply/cancel
          $('#import-cancel').onclick = () => preview.classList.add('hidden');
          $('#import-apply').onclick = async () => {
            const token = getAdminToken();
            if (!token) return;

            try {
              const res = await fetch(`${WORKER_URL}/config/update`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ competition: currentSlug, config: imported }),
              });

              if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Import failed');
              }

              preview.classList.add('hidden');
              config = await loadConfig(currentSlug);
              populateCompetitionForm(config);
              alert('Config imported successfully!');
            } catch (err) {
              alert(`Error: ${err.message}`);
            }
          };
        } catch {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    });
  }

  // ---------------------
  // Auth Helper
  // ---------------------

  function getAdminToken() {
    let token = localStorage.getItem('rocktober-admin-token');
    if (!token) {
      token = prompt('Enter admin token:');
      if (token) localStorage.setItem('rocktober-admin-token', token);
    }
    return token;
  }

  function getSession() {
    if (!currentSlug) return null;
    try {
      const raw = localStorage.getItem(`rocktober-session-${currentSlug}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  // ---------------------
  // Worker: POST /config/update (needs to be added to Worker)
  // ---------------------

  // Note: The /config/update endpoint is defined in the plan (Phase 2A).
  // If it doesn't exist yet, saves will fail gracefully with an error message.

  // ---------------------
  // Init
  // ---------------------

  async function init() {
    initNav();
    initDisplaySettings();
    initExportImport();

    currentSlug = getSlugFromURL();
    if (!currentSlug) {
      $('.settings-main').innerHTML = '<p style="color:var(--text-muted);padding:40px">No competition selected. <a href="index.html" style="color:var(--neon-blue)">Go back</a></p>';
      return;
    }

    // Show user name
    const session = getSession();
    if (session?.name) {
      $('#settings-user').textContent = session.name.toUpperCase();
    }

    try {
      config = await loadConfig(currentSlug);
      populateCompetitionForm(config);
    } catch (err) {
      console.error('Failed to load config:', err);
    }

    // Save handlers
    $('#comp-settings-save')?.addEventListener('click', (e) => {
      e.preventDefault();
      saveCompetitionSettings();
    });

    $('#notif-settings-save')?.addEventListener('click', (e) => {
      e.preventDefault();
      saveNotificationSettings();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
