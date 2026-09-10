import { describe, expect, it } from 'vitest';
import { compileCssVars, hashVibeDraft, nextRevisionNumber, stableSerialize } from '@/lib/cms/vibeService';
import { vibeDraftSchema } from '@/lib/cms/vibeSchema';

const draft = vibeDraftSchema.parse({
  title: 'Calm Editorial',
  slug: 'calm-editorial',
  description: 'Quiet and precise.',
  tokens: {
    visual: {
      theme: {
        colors: { primary: '#123456', background: '#ffffff', surface: '#f7f7f7', textPrimary: '#111111', textSecondary: '#555555' },
        typography: { fontFamilyHeading: 'Inter', fontFamilyBody: 'Inter', baseFontSize: '16px' },
        layout: {},
      },
      effects: {},
    },
    linguistic: { voice: { primaryTone: 'warm' }, vocabulary: {}, systemDirectives: ['Be clear.'] },
  },
  source: { kind: 'manual' },
});

describe('Vibe CMS services', () => {
  it('serializes objects deterministically regardless of key order', () => {
    expect(stableSerialize({ b: 2, a: 1 })).toBe(stableSerialize({ a: 1, b: 2 }));
    expect(hashVibeDraft(draft)).toBe(hashVibeDraft({ ...draft, tokens: { ...draft.tokens, visual: { ...draft.tokens.visual, theme: { ...draft.tokens.visual.theme, colors: { ...draft.tokens.visual.theme.colors } } } } }));
  });

  it('compiles only approved visual tokens into CSS variables', () => {
    expect(compileCssVars(draft)).toMatchObject({
      '--color-primary': '#123456',
      '--color-background': '#ffffff',
      '--color-surface': '#f7f7f7',
      '--color-text-primary': '#111111',
      '--color-text-secondary': '#555555',
      '--font-family-heading': 'Inter',
      '--font-family-body': 'Inter',
      '--font-size-base': '16px',
      '--font-weight-normal': '400',
      '--font-weight-bold': '700',
      '--type-scale-ratio': '1.2',
      '--radius-base': '0.5rem',
      '--spacing-base': '4px',
      '--elevation-base': '0 1px 2px rgb(0 0 0 / 0.08)',
    });
  });

  it('keeps source data and defaults in the normalized draft contract', () => {
    expect(draft.source.kind).toBe('manual');
    expect(draft.tokens.visual.theme.layout.spacingBasePx).toBe(4);
    expect(draft.tokens.linguistic.voice.allowEmoji).toBe(false);
  });

  it('increments revision numbers from zero and the prior revision', () => {
    expect(nextRevisionNumber()).toBe(1);
    expect(nextRevisionNumber(4)).toBe(5);
  });
});
