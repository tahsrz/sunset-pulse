import { VIBE_CATALOG } from '@/config/vibe_catalog';

/**
 * VibeSimulacrum MVP: The "Meme Mask" UI Logic
 * Maps Jamie's linguistic vibes to CSS variable overrides and UI features.
 */

export const VIBE_THEMES: Record<string, any> = {
  "vibe-maxxing": {
    variables: {
      '--primary-glow': '#22c55e',
      '--ui-border-style': 'solid',
      '--ui-text-transform': 'uppercase',
      '--bg-scanline-opacity': '0.1',
      '--accent-color': '#4ade80'
    },
    features: ['METRIC_TICKER', 'GLITCH_OVERLAY'],
    jamiePersonality: 'Intense / Hyper-Optimized'
  },
  "vibe-expanding-brain": {
    variables: {
      '--primary-glow': '#a855f7',
      '--ui-border-style': 'dotted',
      '--ui-text-transform': 'none',
      '--bg-scanline-opacity': '0.05',
      '--accent-color': '#c084fc'
    },
    features: ['COSMIC_DUST', 'INSIGHT_RIFT'],
    jamiePersonality: 'Transcendental / Visionary'
  },
  "vibe-leaning-forward": {
    variables: {
      '--primary-glow': '#ef4444',
      '--ui-border-style': 'double',
      '--ui-text-transform': 'uppercase',
      '--bg-scanline-opacity': '0.2',
      '--accent-color': '#f87171'
    },
    features: ['RADAR_SWEEP', 'ALERT_TICKER'],
    jamiePersonality: 'Competitive / High-Stakes'
  },
  "vibe-this-is-fine": {
    variables: {
      '--primary-glow': '#f59e0b',
      '--ui-border-style': 'dashed',
      '--ui-text-transform': 'none',
      '--bg-scanline-opacity': '0.15',
      '--accent-color': '#fbbf24'
    },
    features: ['FIRE_PARTICLES', 'CALM_OVERLAY'],
    jamiePersonality: 'Optimistic Stoicism'
  },
  "vibe-institutional": {
    variables: {
      '--primary-glow': '#1e3a8a',
      '--ui-border-style': 'ridge',
      '--ui-text-transform': 'none',
      '--bg-scanline-opacity': '0.03',
      '--accent-color': '#eab308'
    },
    features: ['GOLDEN_TICKER', 'EQUITY_RIFT'],
    jamiePersonality: 'Institutional / High-Net-Worth'
  }
};

/**
 * Resolves the current vibe theme based on Jamie's response content
 * or explicit metadata.
 */
export const resolveVibeFromContent = (content: string): string => {
  if (content.includes('-maxxing') && !content.includes('Portfolio-Maxxing')) return 'vibe-maxxing';
  if (content.includes('Level 4') || content.includes('cosmic')) return 'vibe-expanding-brain';
  if (content.includes('!!') || content.includes('leaning forward')) return 'vibe-leaning-forward';
  if (content.includes('This is fine')) return 'vibe-this-is-fine';
  if (content.includes('Portfolio-Maxxing') || content.includes('Yield Portfolio') || content.includes('Institutional')) return 'vibe-institutional';
  
  return 'default';
};
