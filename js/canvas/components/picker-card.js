/**
 * Rocktober Canvas — Picker Card Component
 * Displays a competition in the picker grid.
 * Shows: name, status badge, dates, member count, current theme (active) or champion (completed).
 */

import { CanvasNode, TextNode } from '../scene.js';
import { colors, fonts, fontSizes, spacing, radii } from '../theme.js';
import { BadgeNode } from './badge.js';
import { drawGlowRect } from '../effects/glow.js';

export class PickerCardNode extends CanvasNode {
  slug = '';
  compName = '';
  status = '';           // 'active' | 'completed' | 'upcoming'
  startDate = '';
  endDate = '';
  memberCount = 0;
  totalRounds = 0;
  description = '';

  // Internal child nodes (built in mount)
  _built = false;

  constructor(props = {}) {
    super({
      role: 'button',
      cursor: 'pointer',
      width: 320,
      height: 180,
      ...props,
    });
    Object.assign(this, props);
    this.ariaLabel = this.compName || this.slug;
  }

  /** Build child nodes on first draw. Needs ctx for text measurement. */
  build() {
    if (this._built) return;
    this._built = true;

    // Status badge
    const badge = new BadgeNode({
      id: this.id + '-badge',
      text: this.status.toUpperCase(),
      variant: 'status',
      width: 80,
      height: 20,
    });
    badge.x = spacing.md;
    badge.y = spacing.md;
    this.addChild(badge);

    // Competition name
    const name = new TextNode({
      id: this.id + '-name',
      content: this.compName,
      font: fonts.pixel,
      fontSize: fontSizes.sm,
      color: colors.textPrimary,
      maxWidth: this.width - spacing.md * 2,
      maxLines: 1,
      width: this.width - spacing.md * 2,
      height: fontSizes.sm * 1.4,
    });
    name.x = spacing.md;
    name.y = spacing.md + 28;
    this.addChild(name);

    // Date range
    const dates = new TextNode({
      id: this.id + '-dates',
      content: `${this.startDate} → ${this.endDate}`,
      font: fonts.body,
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      width: this.width - spacing.md * 2,
      height: fontSizes.sm * 1.4,
    });
    dates.x = spacing.md;
    dates.y = spacing.md + 52;
    this.addChild(dates);

    // Members + rounds
    const info = new TextNode({
      id: this.id + '-info',
      content: `${this.memberCount} members · ${this.totalRounds} rounds`,
      font: fonts.body,
      fontSize: fontSizes.xs,
      color: colors.textMuted,
      width: this.width - spacing.md * 2,
      height: fontSizes.xs * 1.4,
    });
    info.x = spacing.md;
    info.y = spacing.md + 72;
    this.addChild(info);

    // Description
    if (this.description) {
      const desc = new TextNode({
        id: this.id + '-desc',
        content: this.description,
        font: fonts.body,
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        maxWidth: this.width - spacing.md * 2,
        maxLines: 2,
        width: this.width - spacing.md * 2,
        height: fontSizes.xs * 1.4 * 2,
      });
      desc.x = spacing.md;
      desc.y = this.height - spacing.md - fontSizes.xs * 1.4 * 2;
      this.addChild(desc);
    }
  }

  draw(ctx) {
    this.build();

    const w = this.width;
    const h = this.height;
    const isHover = this._hovered;

    // Card background
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, radii.md);
    ctx.fillStyle = isHover ? colors.bgCardHover : colors.bgCard;
    ctx.fill();

    // Border — glow on hover
    if (isHover) {
      const glowColor = this.status === 'active' ? colors.neonGreen
                       : this.status === 'completed' ? colors.gold
                       : colors.neonBlue;
      drawGlowRect(ctx, 0, 0, w, h, {
        color: glowColor,
        radius: radii.md,
        lineWidth: 1.5,
        intensity: 0.4,
      });
    } else {
      ctx.strokeStyle = colors.borderSubtle;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Focus ring
    if (this._focused) {
      ctx.strokeStyle = colors.neonBlue;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(-3, -3, w + 6, h + 6);
      ctx.setLineDash([]);
    }
  }
}
