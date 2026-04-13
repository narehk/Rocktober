/**
 * Rocktober Canvas — Leaderboard Component
 * Ranked list with position, name, win count, and movement arrows.
 */

import { CanvasNode, TextNode } from '../scene.js';
import { colors, fonts, fontSizes, spacing, radii } from '../theme.js';

export class LeaderboardNode extends CanvasNode {
  standings = [];        // [{name, wins, totalVotes}]
  previousStandings = null;

  _built = false;

  constructor(props = {}) {
    super({
      width: 260,
      height: 400,
      ...props,
    });
    Object.assign(this, props);
  }

  /** Rebuild child nodes when standings change. */
  rebuild() {
    this.removeAllChildren();
    this._built = false;
    this.build();
    this.markDirty();
  }

  build() {
    if (this._built) return;
    this._built = true;

    const headerH = 28;
    const rowH = 32;
    const padX = spacing.sm;

    // Header
    const header = new TextNode({
      id: this.id + '-header',
      content: 'LEADERBOARD',
      font: fonts.pixel,
      fontSize: fontSizes.xs,
      color: colors.neonPink,
      width: this.width - padX * 2,
      height: headerH,
    });
    header.x = padX;
    header.y = padX;
    this.addChild(header);

    if (!this.standings || this.standings.length === 0) {
      const empty = new TextNode({
        id: this.id + '-empty',
        content: 'No standings yet',
        font: fonts.body,
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        width: this.width - padX * 2,
        height: fontSizes.sm * 1.4,
      });
      empty.x = padX;
      empty.y = padX + headerH + spacing.sm;
      this.addChild(empty);
      return;
    }

    for (let i = 0; i < this.standings.length; i++) {
      const entry = this.standings[i];
      const y = padX + headerH + spacing.sm + i * rowH;

      // Rank
      const rank = new TextNode({
        id: `${this.id}-rank-${i}`,
        content: `${i + 1}.`,
        font: fonts.pixel,
        fontSize: fontSizes.xs,
        color: i === 0 ? colors.gold : colors.textSecondary,
        width: 30,
        height: fontSizes.xs * 1.4,
      });
      rank.x = padX;
      rank.y = y;
      this.addChild(rank);

      // Movement arrow
      let arrow = '';
      let arrowColor = colors.textMuted;
      if (this.previousStandings) {
        const prevIdx = this.previousStandings.findIndex(s => s.name === entry.name);
        if (prevIdx >= 0 && prevIdx !== i) {
          if (prevIdx > i) { arrow = '▲'; arrowColor = colors.neonGreen; }
          else { arrow = '▼'; arrowColor = colors.neonPink; }
        }
      }

      // Name
      const name = new TextNode({
        id: `${this.id}-name-${i}`,
        content: (arrow ? arrow + ' ' : '') + entry.name,
        font: fonts.body,
        fontSize: fontSizes.sm,
        color: i === 0 ? colors.gold : colors.textPrimary,
        maxWidth: this.width - 80,
        maxLines: 1,
        width: this.width - 80,
        height: fontSizes.sm * 1.4,
      });
      name.x = padX + 32;
      name.y = y;
      this.addChild(name);

      // Wins
      const wins = new TextNode({
        id: `${this.id}-wins-${i}`,
        content: `${entry.wins}W`,
        font: fonts.pixel,
        fontSize: fontSizes.xs,
        color: colors.neonBlue,
        width: 40,
        height: fontSizes.xs * 1.4,
        align: 'right',
      });
      wins.x = this.width - padX - 40;
      wins.y = y;
      this.addChild(wins);
    }

    // Compute needed height
    this.height = Math.max(this.height,
      padX + headerH + spacing.sm + this.standings.length * rowH + padX);
  }

  draw(ctx) {
    this.build();

    // Background
    ctx.beginPath();
    ctx.roundRect(0, 0, this.width, this.height, radii.md);
    ctx.fillStyle = colors.bgCard;
    ctx.fill();
    ctx.strokeStyle = colors.borderSubtle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
