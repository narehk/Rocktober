/**
 * Rocktober Canvas — Screen Transitions
 * Glitch, CRT power-on, pixel dissolve effects.
 */

/**
 * Glitch transition — briefly offset RGB channels and add noise blocks.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} progress - 0 to 1
 */
export function drawGlitchTransition(ctx, width, height, progress) {
  if (progress <= 0 || progress >= 1) return;

  const intensity = Math.sin(progress * Math.PI); // peak at 0.5

  ctx.save();

  // RGB channel offset
  const offset = intensity * 15;
  ctx.globalCompositeOperation = 'screen';

  // Red channel shift
  ctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.3})`;
  ctx.fillRect(-offset, 0, width, height);

  // Cyan channel shift
  ctx.fillStyle = `rgba(0, 255, 255, ${intensity * 0.3})`;
  ctx.fillRect(offset, 0, width, height);

  ctx.globalCompositeOperation = 'source-over';

  // Noise blocks
  const blockCount = Math.floor(intensity * 20);
  for (let i = 0; i < blockCount; i++) {
    const bx = Math.random() * width;
    const by = Math.random() * height;
    const bw = 20 + Math.random() * 100;
    const bh = 2 + Math.random() * 8;
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0}, ${Math.random() > 0.5 ? 229 : 0}, ${Math.random() > 0.5 ? 255 : 0}, ${intensity * 0.4})`;
    ctx.fillRect(bx, by, bw, bh);
  }

  // Horizontal scan displacement
  const sliceCount = Math.floor(intensity * 8);
  for (let i = 0; i < sliceCount; i++) {
    const sy = Math.random() * height;
    const sh = 1 + Math.random() * 4;
    const dx = (Math.random() - 0.5) * intensity * 30;
    try {
      const imageData = ctx.getImageData(0, sy, width, sh);
      ctx.putImageData(imageData, dx, sy);
    } catch { /* canvas tainted or empty */ }
  }

  ctx.restore();
}

/**
 * CRT power-on — horizontal line expanding to full screen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} progress - 0 to 1
 */
export function drawCRTPowerOn(ctx, width, height, progress) {
  if (progress >= 1) return;

  ctx.save();

  // Black overlay that recedes
  const lineH = Math.max(1, height * progress);
  const top = (height - lineH) / 2;

  // Black bars above and below the "scan line"
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, top);
  ctx.fillRect(0, top + lineH, width, height - top - lineH);

  // Bright scan line at the edges of the opening
  if (progress < 0.8) {
    ctx.fillStyle = `rgba(255, 255, 255, ${(1 - progress) * 0.5})`;
    ctx.fillRect(0, top - 1, width, 2);
    ctx.fillRect(0, top + lineH - 1, width, 2);
  }

  ctx.restore();
}

/**
 * Pixel dissolve — random pixel blocks revealing new screen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} progress - 0 to 1
 * @param {string} [color='#0d0d12'] - dissolve color
 */
export function drawPixelDissolve(ctx, width, height, progress, color = '#0d0d12') {
  if (progress >= 1) return;

  const blockSize = 16;
  const cols = Math.ceil(width / blockSize);
  const rows = Math.ceil(height / blockSize);
  const totalBlocks = cols * rows;
  const visibleBlocks = Math.floor((1 - progress) * totalBlocks);

  // Use seeded random for deterministic pattern
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // Generate shuffled indices
  const indices = Array.from({ length: totalBlocks }, (_, i) => i);
  for (let i = totalBlocks - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  ctx.save();
  ctx.fillStyle = color;

  for (let i = 0; i < visibleBlocks; i++) {
    const idx = indices[i];
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    ctx.fillRect(col * blockSize, row * blockSize, blockSize, blockSize);
  }

  ctx.restore();
}
