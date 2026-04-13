/**
 * Rocktober Canvas — Engine
 * Canvas lifecycle, DPI scaling, render-on-dirty loop.
 */

import { colors } from './theme.js';

export class Engine {
  /** @type {HTMLCanvasElement} */
  canvas = null;
  /** @type {CanvasRenderingContext2D} */
  ctx = null;
  /** @type {import('./scene.js').CanvasNode|null} */
  root = null;

  #dpr = 1;
  #width = 0;   // CSS pixels
  #height = 0;
  #renderScheduled = false;
  #animationCallbacks = new Set();
  #running = false;
  #fallbackTimer = null;

  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.#dpr = window.devicePixelRatio || 1;
    this.#resize();
    window.addEventListener('resize', () => this.#resize());
    // Guard against construction before layout settles (headless, display transitions)
    requestAnimationFrame(() => this.#resize());
  }

  /** Force a resize recalculation. Call after making the canvas visible. */
  forceResize() {
    this.#resize();
  }

  /** CSS-pixel width of the canvas. */
  get width() { return this.#width; }
  /** CSS-pixel height of the canvas. */
  get height() { return this.#height; }
  get dpr() { return this.#dpr; }

  /** Set the root scene node. */
  setRoot(node) {
    this.root = node;
    node._engine = this;
    this.requestRender();
  }

  /** Schedule a single render pass on next rAF (coalesced). */
  requestRender() {
    if (this.#renderScheduled) return;
    this.#renderScheduled = true;
    requestAnimationFrame((t) => this.#frame(t));
    // Fallback: if rAF doesn't fire within 100ms (headless, hidden tab), use setTimeout
    this.#fallbackTimer = setTimeout(() => {
      if (this.#renderScheduled) this.#frame(performance.now());
    }, 100);
  }

  /** Synchronous immediate render. Use sparingly — for initial paint and debugging. */
  renderNow() {
    this.#frame(performance.now());
  }

  /**
   * Register a per-frame callback (for animations).
   * Return a dispose function.
   */
  onFrame(cb) {
    this.#animationCallbacks.add(cb);
    // Keep rAF loop going while animations are active
    if (!this.#running) this.#startLoop();
    return () => {
      this.#animationCallbacks.delete(cb);
      if (this.#animationCallbacks.size === 0) this.#running = false;
    };
  }

  // --- Private ---

  #resize() {
    this.#dpr = window.devicePixelRatio || 1;
    this.#width = window.innerWidth;
    this.#height = window.innerHeight;
    this.canvas.width = this.#width * this.#dpr;
    this.canvas.height = this.#height * this.#dpr;
    this.canvas.style.width = this.#width + 'px';
    this.canvas.style.height = this.#height + 'px';
    this.ctx.setTransform(this.#dpr, 0, 0, this.#dpr, 0, 0);
    this.requestRender();
  }

  #frame(timestamp) {
    this.#renderScheduled = false;
    if (this.#fallbackTimer) {
      clearTimeout(this.#fallbackTimer);
      this.#fallbackTimer = null;
    }

    // Tick animations
    for (const cb of this.#animationCallbacks) {
      cb(timestamp);
    }

    // Clear
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = colors.bgDark;
    ctx.fillRect(0, 0, this.#width, this.#height);

    // Draw scene graph
    if (this.root) {
      this.root.drawTree(ctx);
    }

    ctx.restore();

    // Keep loop running if there are active animations
    if (this.#running) {
      requestAnimationFrame((t) => this.#frame(t));
    }
  }

  #startLoop() {
    if (this.#running) return;
    this.#running = true;
    this.#renderScheduled = false;
    requestAnimationFrame((t) => this.#frame(t));
  }
}
