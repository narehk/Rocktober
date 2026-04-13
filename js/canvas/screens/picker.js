/**
 * Rocktober Canvas — Picker Screen
 * Displays all competitions in a grid. Click to enter a competition.
 */

import { CanvasNode, TextNode } from '../scene.js';
import { colors, fonts, fontSizes, spacing, radii, glowLayers } from '../theme.js';
import { PickerCardNode } from '../components/picker-card.js';
import { computeLayout } from '../layout.js';

/**
 * Build the picker screen scene graph.
 * @param {object} opts
 * @param {Array} opts.competitions - registry.competitions array
 * @param {number} opts.width - available width
 * @param {number} opts.height - available height
 * @param {function(string): void} opts.onSelect - called with slug when a card is clicked
 * @returns {CanvasNode} root node for the picker screen
 */
export function buildPickerScreen({ competitions, width, height, onSelect }) {
  const root = new CanvasNode({
    id: 'picker-screen',
    width,
    height,
    layout: 'flex',
    direction: 'column',
    padding: [spacing.xl, spacing.xl, spacing.xl, spacing.xl],
    gap: spacing.lg,
    alignItems: 'center',
  });

  // Title
  root.addChild(new TextNode({
    id: 'picker-title',
    content: 'ROCKTOBER',
    font: fonts.pixel,
    fontSize: fontSizes.title,
    color: colors.neonPink,
    align: 'center',
    glowLayers: glowLayers(colors.neonPink),
    width: 600,
    height: fontSizes.title * 1.4,
    role: 'heading',
    ariaLevel: 1,
    ariaLabel: 'Rocktober',
  }));

  // Tagline
  root.addChild(new TextNode({
    id: 'picker-tagline',
    content: 'Choose your arena',
    font: fonts.body,
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
    align: 'center',
    width: 400,
    height: fontSizes.lg * 1.4,
  }));

  // Competition grid
  const grid = new CanvasNode({
    id: 'picker-grid',
    layout: 'grid',
    width: Math.min(width - spacing.xl * 2, 1000),
    height: 400,
    gap: spacing.lg,
    minCellWidth: 300,
    cellHeight: 180,
    padding: [0, 0, 0, 0],
  });

  if (!competitions || competitions.length === 0) {
    // Empty state
    grid.addChild(new TextNode({
      id: 'picker-empty',
      content: 'No competitions found. Create one to get started!',
      font: fonts.body,
      fontSize: fontSizes.md,
      color: colors.textMuted,
      align: 'center',
      width: 400,
      height: fontSizes.md * 1.4,
    }));
  } else {
    // Sort: active first, then upcoming, then completed
    const order = { active: 0, upcoming: 1, completed: 2 };
    const sorted = [...competitions].sort((a, b) =>
      (order[a.status] ?? 9) - (order[b.status] ?? 9)
    );

    for (const comp of sorted) {
      const card = new PickerCardNode({
        id: `picker-card-${comp.slug}`,
        slug: comp.slug,
        compName: comp.name,
        status: comp.status || 'upcoming',
        startDate: comp.startDate || '',
        endDate: comp.endDate || '',
        memberCount: comp.memberCount || 0,
        totalRounds: comp.totalRounds || 0,
        description: comp.description || '',
      });

      card.onClick = () => onSelect(comp.slug);
      card.onHover = () => card.markDirty();
      card.onHoverEnd = () => card.markDirty();

      grid.addChild(card);
    }
  }

  root.addChild(grid);

  // Footer hint
  root.addChild(new TextNode({
    id: 'picker-hint',
    content: 'Ctrl+Shift+D: Debug  |  Tab: Navigate',
    font: fonts.pixel,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    align: 'center',
    width: 500,
    height: fontSizes.xs * 1.4,
  }));

  return root;
}
