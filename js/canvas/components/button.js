/**
 * Rocktober Canvas — Button Component
 * Rounded rect with glow border, pixel font text.
 * States: default, hover, pressed, disabled.
 */

import { CanvasNode } from '../scene.js';
import { colors, fonts, fontSizes, spacing, radii } from '../theme.js';
import { drawGlowRect } from '../effects/glow.js';

export class ButtonNode extends CanvasNode {
  label = '';
  color = colors.neonBlue;
  textColor = '';          // defaults to this.color
  fontSize = fontSizes.xs;
  disabled = false;
  pressed = false;

  // Internal
  _pressScale = 1;

  constructor(props = {}) {
    super({
      role: 'button',
      cursor: 'pointer',
      width: 180,
      height: 40,
      ...props,
    });
    // Re-apply props after class field initializers (which run after super)
    Object.assign(this, props);
    if (!this.ariaLabel && this.label) this.ariaLabel = this.label;
  }

  draw(ctx) {
    const w = this.width;
    const h = this.height;
    const r = radii.sm;
    const isHover = this._hovered && !this.disabled;
    const isPressed = this.pressed && !this.disabled;
    const isDis = this.disabled;

    // Scale for press effect
    if (isPressed) {
      const s = 0.95;
      const dx = w * (1 - s) / 2;
      const dy = h * (1 - s) / 2;
      ctx.translate(dx, dy);
      ctx.scale(s, s);
    }

    const alpha = isDis ? 0.4 : 1;
    ctx.globalAlpha *= alpha;

    // Background
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, r);
    ctx.fillStyle = isHover ? colors.bgCardHover : colors.bgCard;
    ctx.fill();

    // Border — glow on hover, subtle otherwise
    if (isHover && !isDis) {
      drawGlowRect(ctx, 0, 0, w, h, {
        color: this.color,
        radius: r,
        lineWidth: 2,
        intensity: 0.6,
      });
    } else {
      ctx.strokeStyle = isDis ? colors.borderSubtle : this.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, r);
      ctx.stroke();
    }

    // Label
    const tc = this.textColor || this.color;
    ctx.font = `${this.fontSize}px ${fonts.pixel}`;
    ctx.fillStyle = isDis ? colors.textMuted : tc;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(this.label, w / 2, h / 2);
    ctx.textAlign = 'left'; // reset

    // Focus ring
    if (this._focused && !isDis) {
      ctx.strokeStyle = colors.neonBlue;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(-3, -3, w + 6, h + 6);
      ctx.setLineDash([]);
    }

    // Undo press transform
    if (isPressed) {
      ctx.setTransform(ctx.getTransform()); // already applied
    }
  }

  /** Update cursor based on disabled state. */
  updateA11y() {
    super.updateA11y();
    this.cursor = this.disabled ? 'default' : 'pointer';
    if (this._shadowEl) {
      this._shadowEl.disabled = this.disabled;
      this._shadowEl.textContent = this.label;
      this._shadowEl.setAttribute('aria-label', this.label);
    }
  }
}
