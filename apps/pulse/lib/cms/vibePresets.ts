import type { VibeDraft } from './vibeSchema';

export const VIBE_PRESETS = [
  { id: 'editorial', name: 'Editorial warmth', note: 'Warm, considered visual language.', colors: ['#7c2d12', '#fff7ed', '#431407'], tokenColors: { primary: '#7c2d12', background: '#fff7ed', surface: '#ffedd5', textPrimary: '#431407', textSecondary: '#9a3412' }, typography: { fontFamilyHeading: 'Georgia', fontFamilyBody: 'Inter', baseFontSize: '17px', scaleRatio: 1.25 }, layout: { borderRadius: 'sm', spacingBasePx: 5, elevation: 'subtle' }, taxonomyTermIds: ['mood:luxurious', 'visualFamily:editorial', 'voice:warm'], primaryTone: 'warm' },
  { id: 'market-intelligence', name: 'Market intelligence', note: 'Calm, analytical market presentation.', colors: ['#0f766e', '#f0fdfa', '#134e4a'], tokenColors: { primary: '#0f766e', background: '#f0fdfa', surface: '#ccfbf1', textPrimary: '#134e4a', textSecondary: '#115e59' }, typography: { fontFamilyHeading: 'Inter', fontFamilyBody: 'Inter', baseFontSize: '16px', scaleRatio: 1.15 }, layout: { borderRadius: 'md', spacingBasePx: 4, elevation: 'flat' }, taxonomyTermIds: ['mood:tactical', 'visualFamily:light', 'voice:analytical'], primaryTone: 'analytical' },
] as const;

export type VibePresetId = (typeof VIBE_PRESETS)[number]['id'];
export function getVibePreset(id?: string) { return VIBE_PRESETS.find((preset) => preset.id === id); }

export function applyVibePreset(draft: VibeDraft, id?: string) {
  const preset = getVibePreset(id);
  if (!preset) return draft;
  Object.assign(draft.tokens.visual.theme.colors, preset.tokenColors);
  Object.assign(draft.tokens.visual.theme.typography, preset.typography);
  Object.assign(draft.tokens.visual.theme.layout, preset.layout);
  draft.taxonomyTermIds = [...preset.taxonomyTermIds];
  draft.tokens.linguistic.voice.primaryTone = preset.primaryTone;
  return draft;
}
