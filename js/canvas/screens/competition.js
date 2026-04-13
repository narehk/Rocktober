/**
 * Rocktober Canvas — Competition Screen
 * Main view: theme header, submissions grid, leaderboard sidebar, round navigation.
 */

import { CanvasNode, RectNode, TextNode } from '../scene.js';
import { colors, fonts, fontSizes, spacing, radii, glowLayers } from '../theme.js';
import { BadgeNode } from '../components/badge.js';
import { ButtonNode } from '../components/button.js';
import { SongCardNode } from '../components/card.js';
import { LeaderboardNode } from '../components/leaderboard.js';
import { ScrollNode } from '../components/scroll.js';
import { computeLayout } from '../layout.js';

/**
 * Build the competition screen scene graph.
 * @param {object} opts
 * @param {object} opts.config - competition config
 * @param {object} opts.round - current round data
 * @param {number} opts.roundNum - current round number
 * @param {object} opts.leaderboard - leaderboard data
 * @param {string} opts.phase - current phase
 * @param {string|null} opts.currentUser - authenticated user name
 * @param {number} opts.width
 * @param {number} opts.height
 * @param {function} opts.onBack - called when back button clicked
 * @param {function} opts.onPrevRound
 * @param {function} opts.onNextRound
 * @param {function} opts.onVote - called with (trackId, submitter)
 * @returns {CanvasNode}
 */
export function buildCompetitionScreen(opts) {
  const {
    config: cfg, round, roundNum, leaderboard: lb, phase,
    currentUser, width, height, onBack, onPrevRound, onNextRound, onVote,
  } = opts;

  const sidebarW = 270;
  const mainW = width - sidebarW - spacing.lg * 3;

  const root = new CanvasNode({
    id: 'comp-root',
    width,
    height,
    layout: 'absolute',
  });

  // --- Header Bar (back button + competition name) ---
  const header = new CanvasNode({
    id: 'comp-header',
    x: spacing.lg,
    y: spacing.md,
    width: mainW + sidebarW + spacing.lg,
    height: 36,
    layout: 'flex',
    direction: 'row',
    gap: spacing.md,
    alignItems: 'center',
  });

  const backBtn = new ButtonNode({
    id: 'back-btn',
    label: '← BACK',
    color: colors.neonPink,
    width: 100,
    height: 30,
    fontSize: fontSizes.xs - 2,
  });
  backBtn.onClick = onBack;
  header.addChild(backBtn);

  header.addChild(new TextNode({
    id: 'comp-name',
    content: cfg?.name || '',
    font: fonts.pixel,
    fontSize: fontSizes.sm,
    color: colors.neonPink,
    glowColor: colors.neonPink,
    width: 400,
    height: fontSizes.sm * 1.4,
  }));

  root.addChild(header);

  // --- Theme / Round Display ---
  const themeY = 56;
  const themeBar = new CanvasNode({
    id: 'theme-bar',
    x: spacing.lg,
    y: themeY,
    width: mainW,
    height: 60,
    layout: 'flex',
    direction: 'row',
    gap: spacing.md,
    alignItems: 'center',
  });

  // Round badge
  themeBar.addChild(new BadgeNode({
    id: 'round-badge',
    text: `RD ${String(roundNum).padStart(2, '0')}`,
    variant: 'round',
    width: 70,
    height: 24,
  }));

  // Theme title
  themeBar.addChild(new TextNode({
    id: 'theme-title',
    content: round?.theme || 'TBD',
    font: fonts.pixel,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    width: 300,
    height: fontSizes.md * 1.4,
  }));

  // Phase badge
  themeBar.addChild(new BadgeNode({
    id: 'phase-badge',
    text: (phase || 'SUBMISSION').toUpperCase(),
    phase: phase || 'submission',
    variant: 'phase',
    width: 100,
    height: 24,
  }));

  root.addChild(themeBar);

  // --- Round Navigation ---
  const navY = themeY + 44;
  const navBar = new CanvasNode({
    id: 'round-nav',
    x: spacing.lg,
    y: navY,
    width: mainW,
    height: 32,
    layout: 'flex',
    direction: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  });

  const prevBtn = new ButtonNode({
    id: 'prev-round',
    label: '◄ PREV',
    color: colors.neonBlue,
    width: 90,
    height: 28,
    fontSize: fontSizes.xs - 2,
    disabled: roundNum <= 1,
  });
  prevBtn.onClick = onPrevRound;
  navBar.addChild(prevBtn);

  const nextBtn = new ButtonNode({
    id: 'next-round',
    label: 'NEXT ►',
    color: colors.neonBlue,
    width: 90,
    height: 28,
    fontSize: fontSizes.xs - 2,
    disabled: roundNum >= (cfg?.totalRounds || 31),
  });
  nextBtn.onClick = onNextRound;
  navBar.addChild(nextBtn);

  // Theme picker attribution
  if (round?.themePicker) {
    navBar.addChild(new TextNode({
      id: 'theme-picker-attr',
      content: `Picked by ${round.themePicker}`,
      font: fonts.body,
      fontSize: fontSizes.xs,
      color: colors.textMuted,
      width: 200,
      height: fontSizes.xs * 1.4,
    }));
  }

  root.addChild(navBar);

  // --- Winner Display (results phase) ---
  const contentY = navY + 40;
  let nextY = contentY;

  if (phase === 'results' && round?.winner) {
    const winnerSub = round.submissions?.find(s => s.submitter === round.winner);
    if (winnerSub) {
      const winnerLabel = new TextNode({
        id: 'winner-label',
        content: '★ WINNER ★',
        font: fonts.pixel,
        fontSize: fontSizes.sm,
        color: colors.gold,
        glowLayers: glowLayers(colors.gold, colors.gold),
        align: 'center',
        width: mainW,
        height: fontSizes.sm * 1.4,
      });
      winnerLabel.x = spacing.lg;
      winnerLabel.y = nextY;
      root.addChild(winnerLabel);
      nextY += 24;

      const winnerCard = new SongCardNode({
        id: 'winner-card',
        title: winnerSub.title,
        artist: winnerSub.artist,
        submitter: winnerSub.submitter,
        albumArt: winnerSub.albumArt,
        trackId: winnerSub.trackId,
        votes: winnerSub.votes,
        isWinner: true,
        phase,
        width: Math.min(mainW, 500),
        height: 120,
      });
      winnerCard.x = spacing.lg;
      winnerCard.y = nextY;
      root.addChild(winnerCard);
      nextY += 130;
    }
  }

  // --- Submissions Grid (scrollable) ---
  const submissions = round?.submissions || [];
  const gridTop = nextY + spacing.sm;
  const gridH = height - gridTop - spacing.md;

  const scrollContainer = new ScrollNode({
    id: 'submissions-scroll',
    x: spacing.lg,
    y: gridTop,
    width: mainW,
    height: gridH,
  });

  if (submissions.length === 0) {
    const empty = new TextNode({
      id: 'no-submissions',
      content: phase === 'submission'
        ? 'No submissions yet — be the first!'
        : 'No submissions for this round.',
      font: fonts.body,
      fontSize: fontSizes.md,
      color: colors.textMuted,
      width: mainW - spacing.lg * 2,
      height: fontSizes.md * 1.4,
    });
    empty.x = spacing.md;
    empty.y = spacing.lg;
    scrollContainer.addChild(empty);
    scrollContainer.contentHeight = 100;
  } else {
    const cardW = 280;
    const cardH = 120;
    const gap = spacing.md;
    const cols = Math.max(1, Math.floor((mainW + gap) / (cardW + gap)));
    const cellW = (mainW - gap * (cols - 1)) / cols;

    for (let i = 0; i < submissions.length; i++) {
      const sub = submissions[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const card = new SongCardNode({
        id: `song-${i}`,
        title: sub.title,
        artist: sub.artist,
        submitter: sub.submitter,
        albumArt: sub.albumArt,
        trackId: sub.trackId,
        votes: sub.votes,
        isWinner: phase === 'results' && sub.submitter === round?.winner,
        phase,
        canVote: phase === 'voting' && !sub.isOwnSong,
        hasVoted: false, // TODO: check stored vote
        isOwnSong: currentUser && sub.submitter === currentUser &&
                   !(cfg?.selfVoteAllowed),
        width: cellW,
        height: cardH,
      });

      // Wire up vote handler
      if (phase === 'voting' && onVote) {
        const voteTrackId = sub.trackId;
        const voteSubmitter = sub.submitter;
        card.onClick = () => onVote(voteTrackId, voteSubmitter);
        card.cursor = 'pointer';
      }

      card.x = col * (cellW + gap);
      card.y = row * (cardH + gap);
      scrollContainer.addChild(card);
    }

    const rows = Math.ceil(submissions.length / cols);
    scrollContainer.contentHeight = rows * (cardH + gap) - gap;
  }

  root.addChild(scrollContainer);

  // --- Sidebar ---
  const sidebarX = width - sidebarW - spacing.lg;

  // Leaderboard
  const lbNode = new LeaderboardNode({
    id: 'leaderboard',
    standings: lb?.standings || [],
    x: sidebarX,
    y: themeY,
    width: sidebarW,
    height: 400,
  });
  root.addChild(lbNode);

  // Competition info below leaderboard
  const infoY = themeY + lbNode.height + spacing.md;
  const infoBlock = new CanvasNode({
    id: 'comp-info-block',
    x: sidebarX,
    y: infoY,
    width: sidebarW,
    height: 80,
  });

  infoBlock.addChild(new TextNode({
    id: 'info-members',
    content: `${cfg?.members?.length || 0} members · ${cfg?.totalRounds || 0} rounds`,
    font: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    width: sidebarW - spacing.md,
    height: fontSizes.xs * 1.4,
    x: spacing.sm,
    y: spacing.sm,
  }));

  infoBlock.addChild(new TextNode({
    id: 'info-dates',
    content: `${cfg?.startDate || ''} — ${cfg?.endDate || ''}`,
    font: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    width: sidebarW - spacing.md,
    height: fontSizes.xs * 1.4,
    x: spacing.sm,
    y: spacing.sm + 18,
  }));

  root.addChild(infoBlock);

  return root;
}
