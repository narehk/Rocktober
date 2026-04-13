/**
 * Rocktober Canvas — CRT Scanline Overlay
 * Replicates the CSS repeating-linear-gradient scanline effect.
 * Draws once to an offscreen canvas pattern, then tiles it.
 */

/**
 * Create a scanline pattern that can be applied as a full-canvas overlay.
 * Matches CSS: repeating-linear-gradient(0deg,
 *   rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px,
 *   transparent 1px, transparent 3px)
 * @returns {HTMLCanvasElement} tiny pattern tile
 */
function createScanlinePattern() {
  const tile = document.createElement('canvas');
  tile.width = 1;
  tile.height = 3;
  const ctx = tile.getContext('2d');

  // 1px dark line
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(0, 0, 1, 1);

  // 2px transparent gap (canvas is already transparent)
  return tile;
}

let _pattern = null;
let _vignette = null;

/**
 * Draw CRT scanline overlay across the entire canvas.
 * Call this LAST in the render pass, after all scene content.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width  - canvas CSS-pixel width
 * @param {number} height - canvas CSS-pixel height
 * @param {object} [opts]
 * @param {boolean} [opts.vignette=true] - add darkened edges
 * @param {number} [opts.vignetteStrength=0.4] - how dark the edges get
 */
export function drawScanlines(ctx, width, height, opts = {}) {
  const vignette = opts.vignette !== false;
  const vignetteStrength = opts.vignetteStrength || 0.4;

  // Scanline pattern (cached after first call)
  if (!_pattern) {
    const tile = createScanlinePattern();
    _pattern = ctx.createPattern(tile, 'repeat');
  }

  ctx.save();
  ctx.fillStyle = _pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Vignette — radial gradient darkening edges
  if (vignette) {
    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.max(width, height) * 0.7;
    const grad = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(0, 0, 0, ${vignetteStrength})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

/**
 * Draw a subtle grid background matching the CSS body background.
 * Vertical + horizontal lines at 40px spacing, ~6% opacity neon blue.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 */
export function drawGridBackground(ctx, width, height) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.06)';
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = 0; x <= width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }

  ctx.restore();
}
