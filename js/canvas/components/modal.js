/**
 * Rocktober Canvas — Modal Component
 * Dark backdrop + centered panel with border glow + close button.
 */

import { CanvasNode, TextNode } from '../scene.js';
import { colors, fonts, fontSizes, spacing, radii } from '../theme.js';
import { ButtonNode } from './button.js';
import { drawGlowRect } from '../effects/glow.js';

export class ModalNode extends CanvasNode {
  title = '';
  panelWidth = 440;
  panelHeight = 300;
  onClose = null;

  _panel = null;
  _built = false;

  constructor(props = {}) {
    super({
      visible: false,    // hidden by default
      ...props,
    });
    Object.assign(this, props);
  }

  /** Get the content container node (add children to this). */
  get contentContainer() {
    this.build();
    return this._content;
  }

  build() {
    if (this._built) return;
    this._built = true;

    // Backdrop (full screen, semi-transparent)
    const backdrop = new CanvasNode({
      id: this.id + '-backdrop',
      width: this.width,
      height: this.height,
      cursor: 'default',
    });
    backdrop.draw = (ctx) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, backdrop.width, backdrop.height);
    };
    backdrop.onClick = () => {
      if (this.onClose) this.onClose();
    };
    this.addChild(backdrop);

    // Panel (centered)
    const px = (this.width - this.panelWidth) / 2;
    const py = (this.height - this.panelHeight) / 2;

    this._panel = new CanvasNode({
      id: this.id + '-panel',
      x: px,
      y: py,
      width: this.panelWidth,
      height: this.panelHeight,
    });
    this._panel.draw = (ctx) => {
      const w = this._panel.width;
      const h = this._panel.height;

      // Panel background
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, radii.lg);
      ctx.fillStyle = colors.bgModal;
      ctx.fill();

      // Glow border
      drawGlowRect(ctx, 0, 0, w, h, {
        color: colors.neonBlue,
        radius: radii.lg,
        lineWidth: 1,
        intensity: 0.3,
      });
    };
    // Prevent click-through to backdrop
    this._panel.onClick = () => {};
    this.addChild(this._panel);

    // Title
    if (this.title) {
      const titleNode = new TextNode({
        id: this.id + '-title',
        content: this.title,
        font: fonts.pixel,
        fontSize: fontSizes.sm,
        color: colors.neonBlue,
        align: 'center',
        width: this.panelWidth - spacing.lg * 2,
        height: fontSizes.sm * 1.4,
      });
      titleNode.x = spacing.lg;
      titleNode.y = spacing.lg;
      this._panel.addChild(titleNode);
    }

    // Close button
    const closeBtn = new ButtonNode({
      id: this.id + '-close',
      label: '✕',
      color: colors.textMuted,
      width: 32,
      height: 32,
      fontSize: fontSizes.md,
    });
    closeBtn.x = this.panelWidth - 44;
    closeBtn.y = spacing.sm;
    closeBtn.onClick = () => {
      if (this.onClose) this.onClose();
    };
    this._panel.addChild(closeBtn);

    // Content area (users add children here)
    this._content = new CanvasNode({
      id: this.id + '-content',
      x: spacing.lg,
      y: this.title ? spacing.lg + 30 : spacing.lg,
      width: this.panelWidth - spacing.lg * 2,
      height: this.panelHeight - (this.title ? 80 : 48),
      layout: 'flex',
      direction: 'column',
      gap: spacing.md,
    });
    this._panel.addChild(this._content);
  }

  /** Show the modal. */
  show() {
    this.build();
    this.visible = true;
    this.markDirty();
  }

  /** Hide the modal. */
  hide() {
    this.visible = false;
    this.markDirty();
  }
}
