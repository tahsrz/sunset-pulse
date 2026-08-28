export const VIBE_PRESETS = [
  { id: 'editorial', name: 'Editorial warmth', note: 'Warm, considered visual language.', colors: ['#7c2d12', '#fff7ed', '#431407'], tokenColors: { primary: '#7c2d12', background: '#fff7ed', surface: '#ffedd5', textPrimary: '#431407', textSecondary: '#9a3412' } },
  { id: 'market-intelligence', name: 'Market intelligence', note: 'Calm, analytical market presentation.', colors: ['#0f766e', '#f0fdfa', '#134e4a'], tokenColors: { primary: '#0f766e', background: '#f0fdfa', surface: '#ccfbf1', textPrimary: '#134e4a', textSecondary: '#115e59' } },
] as const;

export type VibePresetId = (typeof VIBE_PRESETS)[number]['id'];
export function getVibePreset(id?: string) { return VIBE_PRESETS.find((preset) => preset.id === id); }
