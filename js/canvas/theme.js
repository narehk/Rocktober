/**
 * Rocktober Canvas — Design Tokens
 * Mirrors css/styles.css :root variables for Canvas rendering.
 */

export const colors = {
  neonPink:    '#ff2d95',
  neonBlue:    '#00e5ff',
  neonPurple:  '#b026ff',
  neonGreen:   '#39ff14',
  neonYellow:  '#ffe600',
  hotMagenta:  '#ff00ff',
  chromeLt:    '#e8e8e8',
  chromeMd:    '#a0a0a0',
  chromeDk:    '#666666',

  bgDark:      '#0d0d12',
  bgCard:      '#1a1a2e',
  bgCardHover: '#252545',
  bgInput:     '#12121e',
  bgModal:     '#151525',

  textPrimary:   '#f0f0f5',
  textSecondary: '#b0b0c0',
  textMuted:     '#888899',

  borderSubtle: '#3a3a5c',
  borderActive: '#00e5ff',

  gold:         '#ffd700',
  spotifyGreen: '#1DB954',
  appleRed:     '#FC3C44',
  ytRed:        '#FF0000',
  gridLine:     'rgba(0, 229, 255, 0.06)',
};

export const fonts = {
  pixel: "'Press Start 2P', monospace",
  body:  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

export const fontSizes = {
  xs:    10,   // 0.625rem
  sm:    12,   // 0.75rem
  md:    14,   // 0.875rem
  lg:    18,   // 1.125rem
  xl:    24,   // 1.5rem
  title: 32,   // 2rem
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  gap: 24,   // --gap: 1.5rem
};

export const radii = {
  sm:  4,
  md:  8,
  lg:  12,
};

/** Multi-layer neon glow matching the CSS text-shadow stack. */
export function glowLayers(color, magenta = colors.hotMagenta) {
  return [
    { blur:  7, color },
    { blur: 20, color },
    { blur: 42, color },
    { blur: 80, color: magenta },
  ];
}
