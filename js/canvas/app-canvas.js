/**
 * Rocktober Canvas — App Entry Point
 * Full app with all features wired: particles, transitions, auth modal, search.
 */

import { Engine } from './engine.js';
import { CanvasNode, TextNode } from './scene.js';
import { EventManager } from './events.js';
import { A11yManager } from './a11y.js';
import { DebugOverlay } from './debug.js';
import { computeLayout } from './layout.js';
import { tween } from './animation.js';
import { colors, fonts, fontSizes, spacing, radii, glowLayers } from './theme.js';
import { drawScanlines, drawGridBackground } from './effects/scanlines.js';
import { voteParticles, winnerParticles } from './effects/particles.js';
import { drawGlitchTransition, drawPixelDissolve } from './effects/transitions.js';
import { buildPickerScreen } from './screens/picker.js';
import { buildCompetitionScreen } from './screens/competition.js';
import { ModalNode } from './components/modal.js';
import { InputNode } from './components/input.js';
import { ButtonNode } from './components/button.js';
import { SongCardNode } from './components/card.js';
import {
  loadRegistry, loadConfig, loadRound, loadLeaderboard,
  findLatestRound, getCurrentRoundNumber, getCurrentPhase,
  getSlugFromURL, setSlugInURL, clearSlugFromURL,
  loadSession, saveSession, clearSession,
  WORKER_URL, SEARCH_DEBOUNCE_MS, bustCache,
} from '../data.js';

// --- Globals ---
let engine, events, a11y, debug;
let currentScreen = null;
let currentSlug = null;
let currentConfig = null;
let currentUser = null;
let authToken = null;
let viewingRoundNum = null;
let liveRoundNum = null;

// Effects state
let activeParticles = [];
let transitionProgress = -1; // -1 = no transition
let transitionType = null;
let transitionCallback = null;
let overlayContainer = null;

// Search state
let searchTimer = null;

async function main() {
  // Wait for Press Start 2P (with timeout)
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise(resolve => setTimeout(resolve, 3000)),
    ]);
  } catch (e) {
    console.warn('[Canvas] Font loading error:', e);
  }

  // Hide loading, show canvas
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'none';
  const canvas = document.getElementById('canvas');
  canvas.style.display = 'block';

  // DOM overlay container for hybrid inputs
  overlayContainer = document.getElementById('canvas-overlays');
  if (overlayContainer) overlayContainer.style.pointerEvents = 'none';

  // Initialize engine
  engine = new Engine(canvas);
  engine.forceResize();
  events = new EventManager(engine);
  a11y = new A11yManager(engine);
  debug = new DebugOverlay(engine);

  // Hook effects into render pass
  const origSetRoot = engine.setRoot.bind(engine);
  engine.setRoot = (node) => {
    origSetRoot(node);
    const origDrawTree = node.drawTree.bind(node);
    node.drawTree = (ctx) => {
      drawGridBackground(ctx, engine.width, engine.height);
      origDrawTree(ctx);

      // Draw active particles
      for (const emitter of activeParticles) {
        emitter.draw(ctx);
      }
      // Clean up dead emitters
      activeParticles = activeParticles.filter(e => e.particles.length > 0);

      // Draw screen transition overlay
      if (transitionProgress >= 0 && transitionProgress < 1) {
        if (transitionType === 'glitch') {
          drawGlitchTransition(ctx, engine.width, engine.height, transitionProgress);
        } else if (transitionType === 'dissolve') {
          drawPixelDissolve(ctx, engine.width, engine.height, transitionProgress);
        }
      }

      drawScanlines(ctx, engine.width, engine.height);
      debug.drawOverlay(ctx, node);
    };
  };

  // Route based on URL
  const slug = getSlugFromURL();
  if (slug) {
    await showCompetition(slug);
  } else {
    await showPicker();
  }

  // Listen for hash changes
  window.addEventListener('hashchange', async () => {
    const newSlug = getSlugFromURL();
    if (newSlug) {
      await showCompetition(newSlug);
    } else {
      await showPicker();
    }
  });

  // Resize
  window.addEventListener('resize', () => {
    if (currentScreen === 'picker') showPicker();
    else if (currentScreen === 'competition' && currentSlug) showCompetition(currentSlug);
  });

  console.log('[Rocktober Canvas] Running — full app with effects.');
}

// ============================================================
// SCREEN TRANSITIONS
// ============================================================

function playTransition(type, duration, callback) {
  transitionType = type;
  transitionProgress = 0;
  transitionCallback = callback;

  const startTime = performance.now();
  const dispose = engine.onFrame((timestamp) => {
    const elapsed = timestamp - startTime;
    transitionProgress = Math.min(elapsed / duration, 1);
    engine.requestRender();

    if (transitionProgress >= 1) {
      transitionProgress = -1;
      transitionType = null;
      dispose();
      if (transitionCallback) {
        transitionCallback();
        transitionCallback = null;
      }
    }
  });
}

// ============================================================
// PICKER SCREEN
// ============================================================

async function showPicker() {
  currentScreen = 'picker';
  currentSlug = null;
  clearDOMOverlays();

  let competitions = [];
  try {
    const reg = await loadRegistry();
    competitions = reg.competitions || [];

    for (const comp of competitions) {
      if (comp.status === 'active') {
        try {
          const cfg = await loadConfig(comp.slug);
          comp._memberCount = cfg.members?.length || comp.memberCount;
          const roundNum = getCurrentRoundNumber(cfg);
          comp._roundNum = roundNum;
          if (roundNum > 0) {
            try {
              const round = await loadRound(comp.slug, roundNum);
              comp._theme = round.theme;
              comp._phase = getCurrentPhase(round, cfg);
            } catch {}
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error('[Canvas] Failed to load registry:', err);
  }

  const root = buildPickerScreen({
    competitions,
    width: engine.width,
    height: engine.height,
    onSelect: (slug) => {
      setSlugInURL(slug);
      // Play glitch transition into competition
      playTransition('glitch', 400, () => showCompetition(slug));
    },
  });

  mountScreen(root);
}

// ============================================================
// COMPETITION SCREEN
// ============================================================

async function showCompetition(slug) {
  currentScreen = 'competition';
  currentSlug = slug;
  clearDOMOverlays();

  // Restore session
  const session = loadSession(slug);
  if (session) {
    currentUser = session.name;
    authToken = session.token;
  }

  // Load data
  let cfg = null, round = null, lb = null, roundNum = 0, phase = 'submission';
  try {
    cfg = await loadConfig(slug);
    currentConfig = cfg;

    roundNum = getCurrentRoundNumber(cfg);
    liveRoundNum = roundNum;
    viewingRoundNum = roundNum;

    if (roundNum > 0) {
      try {
        round = await loadRound(slug, roundNum);
      } catch {
        const latest = await findLatestRound(slug, cfg.totalRounds || 31);
        if (latest) {
          round = latest.round;
          viewingRoundNum = latest.num;
        }
      }
    }

    phase = getCurrentPhase(round, cfg);

    try { lb = await loadLeaderboard(slug); } catch {}
  } catch (err) {
    console.error('[Canvas] Failed to load competition:', err);
  }

  renderCompetitionScreen(cfg, round, viewingRoundNum, lb, phase);

  // Fire winner particles if results phase with a winner
  if (phase === 'results' && round?.winner) {
    const emitters = winnerParticles(engine, engine.width);
    activeParticles.push(...emitters);
  }
}

function renderCompetitionScreen(cfg, round, roundNum, lb, phase) {
  const root = buildCompetitionScreen({
    config: cfg,
    round,
    roundNum,
    leaderboard: lb,
    phase,
    currentUser,
    width: engine.width,
    height: engine.height,
    onBack: () => {
      playTransition('dissolve', 500, () => {
        clearSlugFromURL();
        showPicker();
      });
    },
    onPrevRound: () => navigateRound(roundNum - 1),
    onNextRound: () => navigateRound(roundNum + 1),
    onVote: (trackId, submitter) => handleVote(trackId, submitter, round?.day),
  });

  // --- Add search bar during submission phase (live round only) ---
  if (phase === 'submission' && viewingRoundNum === liveRoundNum) {
    addSearchBar(root, cfg);
  }

  // --- Add auth modal (hidden, shown on demand) ---
  const authModal = buildAuthModal(root);
  root.addChild(authModal);

  mountScreen(root);

  // Mount DOM overlays for any InputNodes
  mountDOMInputs(root);
}

async function navigateRound(roundNum) {
  if (!currentSlug || !currentConfig || roundNum < 1) return;
  if (roundNum > (currentConfig.totalRounds || 31)) return;

  try {
    const round = await loadRound(currentSlug, roundNum);
    viewingRoundNum = roundNum;
    const phase = getCurrentPhase(round, currentConfig);
    let lb = null;
    try { lb = await loadLeaderboard(currentSlug); } catch {}
    renderCompetitionScreen(currentConfig, round, roundNum, lb, phase);
  } catch (err) {
    console.error('[Canvas] Failed to load round:', err);
    a11y.announce(`Round ${roundNum} not available`);
  }
}

// ============================================================
// VOTING
// ============================================================

async function handleVote(trackId, submitter, roundDay) {
  if (!currentSlug || !trackId) {
    // Show auth modal if not authenticated
    if (!authToken) {
      showAuthModal();
      return;
    }
    return;
  }

  if (!authToken) {
    showAuthModal();
    return;
  }

  try {
    const res = await fetch(`${WORKER_URL}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        competition: currentSlug,
        trackId,
        submitter,
      }),
    });

    if (res.ok) {
      bustCache();
      a11y.announce(`Voted for ${submitter}'s submission`);

      // Fire vote celebration particles at center of screen
      const emitter = voteParticles(engine, engine.width / 2, engine.height / 2);
      activeParticles.push(emitter);

      if (roundDay) {
        localStorage.setItem(`rocktober-vote-${currentSlug}-${roundDay}`, trackId);
      }
      // Reload to show updated state
      await showCompetition(currentSlug);
    } else {
      const data = await res.json().catch(() => ({}));
      a11y.announce(data.error || 'Vote failed');
    }
  } catch (err) {
    console.error('[Canvas] Vote error:', err);
    a11y.announce('Vote failed — connection error');
  }
}

// ============================================================
// AUTH MODAL
// ============================================================

let _authModal = null;

function buildAuthModal(root) {
  _authModal = new ModalNode({
    id: 'auth-modal',
    title: 'ENTER INVITE CODE',
    panelWidth: 400,
    panelHeight: 220,
    width: root.width,
    height: root.height,
    visible: false,
    onClose: () => _authModal.hide(),
  });
  _authModal.build();

  const content = _authModal.contentContainer;

  // Status text
  const statusText = new TextNode({
    id: 'auth-status',
    content: '',
    font: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.neonPink,
    width: 340,
    height: fontSizes.sm * 1.4,
  });

  // Invite code input
  const codeInput = new InputNode({
    id: 'auth-code-input',
    placeholder: 'INVITE CODE',
    width: 340,
    height: 40,
  });

  // Submit button
  const submitBtn = new ButtonNode({
    id: 'auth-submit-btn',
    label: 'JOIN',
    color: colors.neonGreen,
    width: 120,
    height: 38,
  });

  submitBtn.onClick = async () => {
    const code = codeInput.value.trim();
    if (!code) return;

    statusText.content = 'AUTHENTICATING...';
    statusText.color = colors.neonBlue;
    engine.requestRender();

    try {
      const res = await fetch(`${WORKER_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competition: currentSlug,
          code: code.toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        statusText.content = data.error || 'INVALID CODE';
        statusText.color = colors.neonPink;
        engine.requestRender();
        return;
      }

      // Success
      authToken = data.token;
      currentUser = data.name;
      saveSession(currentSlug, data.name, data.token);
      a11y.announce(`Signed in as ${data.name}`);
      _authModal.hide();

      // Re-render competition with auth
      await showCompetition(currentSlug);
    } catch (err) {
      statusText.content = 'CONNECTION FAILED';
      statusText.color = colors.neonPink;
      engine.requestRender();
    }
  };

  // Also submit on Enter
  codeInput.onSubmit = () => submitBtn.onClick();

  content.addChild(statusText);
  content.addChild(codeInput);
  content.addChild(submitBtn);

  return _authModal;
}

function showAuthModal() {
  if (_authModal) {
    _authModal.show();
    a11y.announce('Enter invite code to join');
    engine.requestRender();

    // Mount the input DOM overlay
    const codeInput = _authModal.contentContainer.findById('auth-code-input');
    if (codeInput && overlayContainer) {
      codeInput.mountDOM(overlayContainer);
      // Recompute position after modal layout
      setTimeout(() => codeInput.syncPosition(), 50);
    }
  }
}

// ============================================================
// SEARCH BAR
// ============================================================

function addSearchBar(root, cfg) {
  const searchY = root.height - 80;
  const searchW = Math.min(500, root.width - spacing.lg * 2 - 280);

  const searchBar = new CanvasNode({
    id: 'search-section',
    x: spacing.lg,
    y: searchY,
    width: searchW,
    height: 60,
    layout: 'flex',
    direction: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  });

  const searchInput = new InputNode({
    id: 'search-input',
    placeholder: 'Search for a song...',
    width: searchW - 100,
    height: 36,
  });

  searchInput.onChange = (value) => {
    clearTimeout(searchTimer);
    if (!value || value.length < 2) return;
    searchTimer = setTimeout(() => doSearch(value), SEARCH_DEBOUNCE_MS);
  };

  searchInput.onSubmit = (value) => {
    if (value && value.length >= 2) doSearch(value);
  };

  const searchBtn = new ButtonNode({
    id: 'search-btn',
    label: '🔍',
    color: colors.neonBlue,
    width: 44,
    height: 36,
    fontSize: fontSizes.md,
  });
  searchBtn.onClick = () => {
    if (searchInput.value.length >= 2) doSearch(searchInput.value);
  };

  searchBar.addChild(searchInput);
  searchBar.addChild(searchBtn);
  root.addChild(searchBar);
}

async function doSearch(query) {
  if (!currentSlug) return;
  try {
    const res = await fetch(
      `${WORKER_URL}/search?q=${encodeURIComponent(query)}&competition=${currentSlug}`
    );
    if (!res.ok) return;
    const data = await res.json();
    a11y.announce(`${data.tracks?.length || 0} results found`);
    // TODO: render search results as a floating panel of SongCardNodes
    console.log('[Canvas] Search results:', data.tracks?.length || 0);
  } catch (err) {
    console.error('[Canvas] Search error:', err);
  }
}

// ============================================================
// HELPERS
// ============================================================

function mountScreen(root) {
  computeLayout(root, engine.width, engine.height);
  engine.setRoot(root);
  engine.renderNow();
  a11y.sync(root);
}

/** Find all InputNodes in VISIBLE parts of the tree and mount their DOM overlays. */
function mountDOMInputs(node) {
  if (!overlayContainer) return;
  if (!node.visible) return; // skip hidden subtrees (e.g. auth modal)
  if (node instanceof InputNode) {
    node.mountDOM(overlayContainer);
  }
  for (const child of node.children) {
    mountDOMInputs(child);
  }
}

/** Remove all DOM overlays (call on screen switch). */
function clearDOMOverlays() {
  if (overlayContainer) {
    overlayContainer.innerHTML = '';
  }
}

main();
