/**
 * Rocktober Canvas — Scrollable Container
 * Clips children to bounds, handles wheel/touch scroll with momentum.
 */

import { CanvasNode } from '../scene.js';

export class ScrollNode extends CanvasNode {
  scrollY = 0;
  contentHeight = 0;  // set after adding children
  _velocity = 0;
  _animating = false;
  _disposeFrame = null;

  constructor(props = {}) {
    super(props);
    Object.assign(this, props);

    // Register scroll handler (called by events.js)
    this.onScroll = (dx, dy) => {
      this.scrollBy(dy);
    };
  }

  scrollBy(dy) {
    const maxScroll = Math.max(0, this.contentHeight - this.height);
    this.scrollY = Math.max(0, Math.min(maxScroll, this.scrollY + dy));
    this.markDirty();
  }

  scrollTo(y) {
    const maxScroll = Math.max(0, this.contentHeight - this.height);
    this.scrollY = Math.max(0, Math.min(maxScroll, y));
    this.markDirty();
  }

  drawTree(ctx) {
    if (!this.visible) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.opacity < 1) ctx.globalAlpha *= this.opacity;

    // Draw own background
    this.draw(ctx);

    // Clip to bounds
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();

    // Translate children by scroll offset
    ctx.translate(0, -this.scrollY);

    for (const child of this.children) {
      child.drawTree(ctx);
    }

    ctx.restore();

    // Draw scrollbar
    if (this.contentHeight > this.height) {
      this.#drawScrollbar(ctx);
    }

    this._dirty = false;
  }

  /** Override hit test to account for scroll offset. */
  hitTest(px, py) {
    if (!this.visible || this.opacity <= 0) return null;

    const lx = px - this.x;
    const ly = py - this.y;

    if (lx < 0 || ly < 0 || lx > this.width || ly > this.height) return null;

    // Adjust for scroll
    const scrolledY = ly + this.scrollY;

    for (let i = this.children.length - 1; i >= 0; i--) {
      const hit = this.children[i].hitTest(lx, scrolledY);
      if (hit) return hit;
    }

    return this;
  }

  #drawScrollbar(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const barW = 4;
    const barX = this.width - barW - 2;
    const ratio = this.height / this.contentHeight;
    const barH = Math.max(20, this.height * ratio);
    const maxScroll = this.contentHeight - this.height;
    const barY = maxScroll > 0 ? (this.scrollY / maxScroll) * (this.height - barH) : 0;

    // Track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(barX, 0, barW, this.height);

    // Thumb
    ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 2);
    ctx.fill();

    ctx.restore();
  }
}
