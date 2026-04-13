/**
 * Rocktober Canvas — Hybrid Text Input
 * Canvas renders the visual; a transparent DOM <input> handles real text editing.
 */

import { CanvasNode } from '../scene.js';
import { colors, fonts, fontSizes, spacing, radii } from '../theme.js';

export class InputNode extends CanvasNode {
  placeholder = '';
  value = '';
  inputType = 'text';     // 'text' | 'password'
  onChange = null;         // (value) => void
  onSubmit = null;         // (value) => void

  _domInput = null;
  _cursorVisible = true;
  _cursorTimer = null;

  constructor(props = {}) {
    super({
      role: 'textbox',
      cursor: 'text',
      width: 280,
      height: 36,
      ...props,
    });
    Object.assign(this, props);
    this.ariaLabel = this.placeholder || 'Text input';
  }

  /** Create the DOM overlay input. Call after layout is computed. */
  mountDOM(overlayContainer) {
    if (this._domInput) return;

    const input = document.createElement('input');
    input.type = this.inputType;
    input.placeholder = this.placeholder;
    input.value = this.value;
    input.setAttribute('data-canvas-id', this.id);

    Object.assign(input.style, {
      position: 'absolute',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: colors.textPrimary,
      fontFamily: fonts.body,
      fontSize: fontSizes.md + 'px',
      padding: spacing.sm + 'px',
      caretColor: colors.neonBlue,
      zIndex: '20',
      pointerEvents: 'auto',
    });

    input.addEventListener('input', () => {
      this.value = input.value;
      if (this.onChange) this.onChange(this.value);
      this.markDirty();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.onSubmit) {
        this.onSubmit(this.value);
      }
    });

    input.addEventListener('focus', () => {
      this._focused = true;
      this.markDirty();
    });

    input.addEventListener('blur', () => {
      this._focused = false;
      this.markDirty();
    });

    overlayContainer.appendChild(input);
    this._domInput = input;
    this.syncPosition();
  }

  /** Sync DOM input position to match canvas coordinates. */
  syncPosition() {
    if (!this._domInput) return;
    const abs = this.absolutePosition();
    Object.assign(this._domInput.style, {
      left: abs.x + 'px',
      top: abs.y + 'px',
      width: this.width + 'px',
      height: this.height + 'px',
    });
  }

  draw(ctx) {
    const w = this.width;
    const h = this.height;

    // Background
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, radii.sm);
    ctx.fillStyle = colors.bgInput;
    ctx.fill();

    // Border
    ctx.strokeStyle = this._focused ? colors.neonBlue : colors.borderSubtle;
    ctx.lineWidth = this._focused ? 2 : 1;
    ctx.stroke();

    // Focus glow
    if (this._focused) {
      ctx.save();
      ctx.shadowColor = colors.neonBlue;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = colors.neonBlue;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, radii.sm);
      ctx.stroke();
      ctx.restore();
    }

    // Placeholder text (only if DOM input is not focused — DOM input shows its own text)
    if (!this._focused && !this.value && this.placeholder) {
      ctx.font = `${fontSizes.md}px ${fonts.body}`;
      ctx.fillStyle = colors.textMuted;
      ctx.textBaseline = 'middle';
      ctx.fillText(this.placeholder, spacing.sm, h / 2);
    }
  }

  /** Clean up DOM elements. */
  destroyDOM() {
    if (this._domInput) {
      this._domInput.remove();
      this._domInput = null;
    }
    if (this._cursorTimer) {
      clearInterval(this._cursorTimer);
      this._cursorTimer = null;
    }
  }
}
