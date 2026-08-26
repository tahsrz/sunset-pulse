import { describe, expect, it } from 'vitest';
import { vibeDraftSchema } from '@/lib/cms/vibeSchema';
import { assertReadableTheme, compileCssVars } from '@/lib/cms/vibeService';

describe('Vibe publication gates', () => {
  it('compiles safe theme output for a readable theme', () => {
    const draft = vibeDraftSchema.parse({ title: 'Readable', slug: 'readable', tokens: { visual: { theme: { colors: { primary: '#123456', background: '#ffffff', surface: '#f7f7f7', textPrimary: '#111111', textSecondary: '#555555' }, typography: { fontFamilyHeading: 'Inter', fontFamilyBody: 'Inter', baseFontSize: '16px' }, layout: {} }, effects: {} }, linguistic: { voice: { primaryTone: 'warm' }, vocabulary: {}, systemDirectives: ['Be clear.'] } }, source: { kind: 'manual' } });
    expect(compileCssVars(draft)['--color-text-primary']).toBe('#111111');
  });

  it('rejects low-contrast text before publication', () => {
    const draft = vibeDraftSchema.parse({ title: 'Unreadable', slug: 'unreadable', tokens: { visual: { theme: { colors: { primary: '#777777', background: '#777777', surface: '#777777', textPrimary: '#777777', textSecondary: '#888888' }, typography: { fontFamilyHeading: 'Inter', fontFamilyBody: 'Inter', baseFontSize: '16px' }, layout: {} }, effects: {} }, linguistic: { voice: { primaryTone: 'warm' }, vocabulary: {}, systemDirectives: [] } }, source: { kind: 'manual' } });
    expect(() => assertReadableTheme(draft)).toThrow('PUBLISH_VALIDATION_FAILED');
  });
});
