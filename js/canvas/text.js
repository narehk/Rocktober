/**
 * Rocktober Canvas — Text Utilities
 * Standalone functions for text measurement, word wrapping, and drawing.
 */

/**
 * Measure text and compute word-wrapped lines.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {string} font - e.g. "14px 'Press Start 2P', monospace"
 * @param {number} maxWidth - max line width in px (0 = no wrap)
 * @returns {{ lines: string[], lineHeight: number, totalHeight: number, maxLineWidth: number }}
 */
export function measureText(ctx, text, font, maxWidth = 0) {
  ctx.font = font;
  const metrics = ctx.measureText('Mg');
  // Approximate line height from font metrics where available
  const ascent = metrics.actualBoundingBoxAscent || 0;
  const descent = metrics.actualBoundingBoxDescent || 0;
  const measured = ascent + descent;
  const fontSize = parseFloat(font) || 14;
  const lineHeight = measured > 0 ? measured * 1.4 : fontSize * 1.4;

  if (!text) {
    return { lines: [''], lineHeight, totalHeight: lineHeight, maxLineWidth: 0 };
  }

  if (!maxWidth || maxWidth <= 0) {
    const w = ctx.measureText(text).width;
    return { lines: [text], lineHeight, totalHeight: lineHeight, maxLineWidth: w };
  }

  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  let maxW = 0;

  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    const tw = ctx.measureText(test).width;
    if (tw > maxWidth && current) {
      const cw = ctx.measureText(current).width;
      if (cw > maxW) maxW = cw;
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) {
    const cw = ctx.measureText(current).width;
    if (cw > maxW) maxW = cw;
    lines.push(current);
  }

  return {
    lines,
    lineHeight,
    totalHeight: lines.length * lineHeight,
    maxLineWidth: maxW,
  };
}

/**
 * Draw text with options. Handles alignment, multi-line, glow, and truncation.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {object} opts
 * @param {string} opts.font
 * @param {string} [opts.color='#f0f0f5']
 * @param {number} [opts.maxWidth=0]
 * @param {number} [opts.lineHeight=1.4] - multiplier on font size
 * @param {'left'|'center'|'right'} [opts.align='left']
 * @param {number} [opts.maxLines=0]
 * @param {Array<{blur:number, color:string}>} [opts.glowLayers]
 */
export function drawText(ctx, text, x, y, opts = {}) {
  const font = opts.font || "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const color = opts.color || '#f0f0f5';
  const maxWidth = opts.maxWidth || 0;
  const lineHeightMul = opts.lineHeight || 1.4;
  const align = opts.align || 'left';
  const maxLines = opts.maxLines || 0;
  const glowLayers = opts.glowLayers || null;

  ctx.font = font;
  ctx.textBaseline = 'top';

  const fontSize = parseFloat(font) || 14;
  const lh = fontSize * lineHeightMul;

  // Get lines
  let { lines } = measureText(ctx, text, font, maxWidth);

  // Truncate
  if (maxLines > 0 && lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    const mw = maxWidth || Infinity;
    while (last.length > 0 && ctx.measureText(last + '...').width > mw) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = last + '...';
  }

  // Draw
  for (let i = 0; i < lines.length; i++) {
    const lineY = y + i * lh;
    let lineX = x;

    if (align === 'center' && maxWidth > 0) {
      lineX = x + (maxWidth - ctx.measureText(lines[i]).width) / 2;
    } else if (align === 'right' && maxWidth > 0) {
      lineX = x + maxWidth - ctx.measureText(lines[i]).width;
    }

    // Glow passes
    if (glowLayers) {
      for (const layer of glowLayers) {
        ctx.save();
        ctx.shadowColor = layer.color;
        ctx.shadowBlur = layer.blur;
        ctx.fillStyle = layer.color;
        ctx.fillText(lines[i], lineX, lineY);
        ctx.restore();
      }
    }

    // Main pass
    ctx.fillStyle = color;
    ctx.fillText(lines[i], lineX, lineY);
  }

  return { lineCount: lines.length, totalHeight: lines.length * lh };
}

/**
 * Truncate a string to fit within maxWidth, appending ellipsis.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {string} font
 * @param {number} maxWidth
 * @returns {string}
 */
export function truncateText(ctx, text, font, maxWidth) {
  ctx.font = font;
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '...').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '...';
}
