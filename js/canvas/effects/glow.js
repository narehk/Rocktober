/**
 * Rocktober Canvas — Neon Glow Effect
 * Multi-pass rendering that replicates the CSS 4-layer text-shadow glow.
 * Supports caching to offscreen canvas for static elements.
 */

import { glowLayers, colors } from '../theme.js';

/**
 * Draw text with neon glow effect.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {object} opts
 * @param {string} opts.font
 * @param {string} opts.color - base text color (also used for inner glow layers)
 * @param {string} [opts.magenta] - outer glow color (defaults to hotMagenta)
 * @param {Array<{blur:number, color:string}>} [opts.layers] - custom glow layers
 */
export function drawGlowText(ctx, text, x, y, opts = {}) {
  const font = opts.font || "14px 'Press Start 2P', monospace";
  const color = opts.color || colors.neonPink;
  const layers = opts.layers || glowLayers(color, opts.magenta);

  ctx.font = font;
  ctx.textBaseline = 'top';

  // Glow passes — draw from outermost (most blur) to innermost
  for (const layer of layers) {
    ctx.save();
    ctx.shadowColor = layer.color;
    ctx.shadowBlur = layer.blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = layer.color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // Final crisp text on top
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/**
 * Draw a rectangle with neon glow border.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {object} opts
 * @param {string} opts.color - glow color
 * @param {number} [opts.radius=0] - corner radius
 * @param {number} [opts.lineWidth=2]
 * @param {number} [opts.intensity=1] - glow multiplier (0-1 for dim, >1 for bright)
 */
export function drawGlowRect(ctx, x, y, w, h, opts = {}) {
  const color = opts.color || colors.neonBlue;
  const radius = opts.radius || 0;
  const lineWidth = opts.lineWidth || 2;
  const intensity = opts.intensity || 1;

  const blurs = [7, 20, 42].map(b => b * intensity);

  for (const blur of blurs) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    if (radius > 0) {
      ctx.roundRect(x, y, w, h, radius);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Crisp border on top
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  if (radius > 0) {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.stroke();
}

/**
 * Create a cached glow texture on an offscreen canvas.
 * Use for static elements that don't change content frequently.
 * @param {number} width
 * @param {number} height
 * @param {function(CanvasRenderingContext2D): void} drawFn - draw the content
 * @returns {HTMLCanvasElement} offscreen canvas to drawImage() from
 */
export function cacheGlow(width, height, drawFn) {
  // Add padding for glow overflow
  const padding = 100;
  const offscreen = document.createElement('canvas');
  offscreen.width = width + padding * 2;
  offscreen.height = height + padding * 2;
  const ctx = offscreen.getContext('2d');
  ctx.translate(padding, padding);
  drawFn(ctx);
  return offscreen;
}
