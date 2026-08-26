import { describe, expect, it } from 'vitest';
import { vibeDraftSchema } from '@/lib/cms/vibeSchema';
import { compileCssVars } from '@/lib/cms/vibeService';

describe('Vibe publication gates', () => {
  it('compiles safe theme output for a readable theme', () => {
    const draft = vibeDraftSchema.parse({ title: 'Readable', slug: 'readable', tokens: { visual: { theme: { colors: { primary: '#123456', background: '#ffffff', surface: '#f7f7f7', textPrimary: '#111111', textSecondary: '#555555' }, typography: { fontFamilyHeading: 'Inter', fontFamilyBody: 'Inter', baseFontSize: '16px' }, layout: {} }, effects: {} }, linguistic: { voice: { primaryTone: 'warm' }, vocabulary: {}, systemDirectives: ['Be clear.'] } }, source: { kind: 'manual' } });
    expect(compileCssVars(draft)['--color-text-primary']).toBe('#111111');
  });
});
