/**
 * Rocktober Canvas — Badge Component
 * Phase badges (submission/voting/results), status badges, round badges.
 */

import { CanvasNode } from '../scene.js';
import { colors, fonts, fontSizes, spacing, radii } from '../theme.js';

/** Phase → color mapping matching CSS .phase-badge classes. */
const PHASE_COLORS = {
  submission: colors.neonPurple,
  voting:     colors.neonPink,
  results:    colors.gold,
  pre:        colors.textMuted,
};

/** Status → color mapping for competition cards. */
const STATUS_COLORS = {
  active:    colors.neonGreen,
  completed: colors.gold,
  upcoming:  colors.neonBlue,
};

export class BadgeNode extends CanvasNode {
  text = '';
  badgeColor = '';       // override auto-color
  variant = 'phase';     // 'phase' | 'status' | 'round' | 'custom'
  phase = '';             // for variant='phase': submission/voting/results/pre

  constructor(props = {}) {
    super({
      height: 22,
      width: 80,
      ...props,
    });
    // Re-apply props after class field initializers
    Object.assign(this, props);
  }

  draw(ctx) {
    const color = this.#resolveColor();
    const fontSize = fontSizes.xs;
    const font = `${fontSize}px ${fonts.pixel}`;
    const pad = spacing.sm;

    // Measure text to auto-size width
    ctx.font = font;
    const textW = ctx.measureText(this.text).width;
    this.width = Math.max(this.width, textW + pad * 2);
    const h = this.height;
    const w = this.width;

    // Background pill
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, radii.sm);

    if (this.variant === 'round') {
      // Round badge: solid color background, dark text
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = colors.bgDark;
    } else {
      // Phase/status badges: dark bg with colored border and text
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = color;
    }

    // Text
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(this.text, w / 2, h / 2);
    ctx.textAlign = 'left'; // reset
  }

  #resolveColor() {
    if (this.badgeColor) return this.badgeColor;
    if (this.variant === 'phase') return PHASE_COLORS[this.phase] || colors.textMuted;
    if (this.variant === 'status') return STATUS_COLORS[this.text?.toLowerCase()] || colors.neonBlue;
    if (this.variant === 'round') return colors.neonBlue;
    return colors.neonBlue;
  }
}
