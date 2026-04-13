/**
 * Rocktober Canvas — Song Card Component
 * Displays a submission: album art, title, artist, submitter, vote button, service links.
 */

import { CanvasNode, TextNode } from '../scene.js';
import { colors, fonts, fontSizes, spacing, radii } from '../theme.js';
import { ButtonNode } from './button.js';
import { drawGlowRect } from '../effects/glow.js';

export class SongCardNode extends CanvasNode {
  // Data
  title = '';
  artist = '';
  submitter = '';
  albumArt = '';       // URL
  trackId = '';
  votes = 0;
  isWinner = false;

  // State
  phase = 'submission'; // submission | voting | results
  canVote = false;
  hasVoted = false;
  isOwnSong = false;

  // Internal
  _built = false;
  _image = null;
  _imageLoaded = false;
  _voteBtn = null;

  constructor(props = {}) {
    super({
      width: 280,
      height: 120,
      cursor: 'default',
      ...props,
    });
    Object.assign(this, props);
  }

  build() {
    if (this._built) return;
    this._built = true;

    // Load album art
    if (this.albumArt) {
      this._image = new Image();
      this._image.crossOrigin = 'anonymous';
      this._image.onload = () => {
        this._imageLoaded = true;
        this.markDirty();
      };
      this._image.src = this.albumArt;
    }

    // Title
    const titleNode = new TextNode({
      id: this.id + '-title',
      content: this.title || 'Unknown',
      font: fonts.body,
      fontSize: fontSizes.md,
      color: this.isWinner ? colors.gold : colors.textPrimary,
      maxWidth: this.width - 100,
      maxLines: 1,
      width: this.width - 100,
      height: fontSizes.md * 1.4,
    });
    titleNode.x = 88;
    titleNode.y = spacing.sm;
    this.addChild(titleNode);

    // Artist
    const artistNode = new TextNode({
      id: this.id + '-artist',
      content: this.artist || 'Unknown Artist',
      font: fonts.body,
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      maxWidth: this.width - 100,
      maxLines: 1,
      width: this.width - 100,
      height: fontSizes.sm * 1.4,
    });
    artistNode.x = 88;
    artistNode.y = spacing.sm + 22;
    this.addChild(artistNode);

    // Submitter
    const subNode = new TextNode({
      id: this.id + '-submitter',
      content: this.submitter || 'Anonymous',
      font: fonts.pixel,
      fontSize: fontSizes.xs - 2,
      color: colors.neonBlue,
      width: this.width - 100,
      height: (fontSizes.xs - 2) * 1.4,
    });
    subNode.x = 88;
    subNode.y = spacing.sm + 42;
    this.addChild(subNode);

    // Vote button (voting phase only)
    if (this.phase === 'voting') {
      const label = this.isOwnSong ? 'YOUR SONG'
                  : this.hasVoted ? 'VOTED'
                  : 'VOTE';
      const btnColor = this.hasVoted ? colors.neonGreen
                     : this.isOwnSong ? colors.textMuted
                     : colors.neonPink;
      this._voteBtn = new ButtonNode({
        id: this.id + '-vote-btn',
        label,
        color: btnColor,
        disabled: this.isOwnSong,
        width: 80,
        height: 28,
        fontSize: fontSizes.xs - 2,
      });
      this._voteBtn.x = 88;
      this._voteBtn.y = this.height - 36;
      this.addChild(this._voteBtn);
    }

    // Vote count (results phase)
    if (this.phase === 'results' && this.votes !== undefined) {
      const votesNode = new TextNode({
        id: this.id + '-votes',
        content: `${this.votes} ${this.votes === 1 ? 'VOTE' : 'VOTES'}`,
        font: fonts.pixel,
        fontSize: fontSizes.xs - 2,
        color: colors.neonBlue,
        width: 100,
        height: (fontSizes.xs - 2) * 1.4,
      });
      votesNode.x = 88;
      votesNode.y = this.height - 28;
      this.addChild(votesNode);
    }
  }

  draw(ctx) {
    this.build();

    const w = this.width;
    const h = this.height;

    // Card background
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, radii.sm);
    ctx.fillStyle = this._hovered ? colors.bgCardHover : colors.bgCard;
    ctx.fill();

    // Border
    if (this.isWinner) {
      drawGlowRect(ctx, 0, 0, w, h, {
        color: colors.gold,
        radius: radii.sm,
        lineWidth: 2,
        intensity: 0.5,
      });
    } else {
      ctx.strokeStyle = colors.borderSubtle;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Album art (80x80)
    const artSize = 72;
    const artX = spacing.sm;
    const artY = (h - artSize) / 2;

    if (this._imageLoaded && this._image) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(artX, artY, artSize, artSize, radii.sm);
      ctx.clip();
      ctx.drawImage(this._image, artX, artY, artSize, artSize);
      ctx.restore();
    } else {
      // Placeholder
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.roundRect(artX, artY, artSize, artSize, radii.sm);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.font = `24px ${fonts.body}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♪', artX + artSize / 2, artY + artSize / 2);
      ctx.textAlign = 'left';
    }
  }
}
