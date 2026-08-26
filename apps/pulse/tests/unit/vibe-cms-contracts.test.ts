import { describe, expect, it } from 'vitest';
import { vibeDraftSchema, vibeTokensPayloadSchema } from '@/lib/cms/vibeSchema';
import { getAvailableVibeActions, transitionVibe } from '@/lib/cms/vibeWorkflow';

const validDraft = {
  title: 'Calm Editorial',
  slug: 'calm-editorial',
  excerpt: '',
  description: 'A quiet editorial system.',
  tokens: {
    visual: {
      theme: {
        colors: { primary: '#123456', background: '#ffffff', surface: '#f7f7f7', textPrimary: '#111111', textSecondary: '#555555' },
        typography: { fontFamilyHeading: 'Inter', fontFamilyBody: 'Inter', baseFontSize: '16px' },
        layout: {},
      },
      effects: {},
    },
    linguistic: {
      voice: { primaryTone: 'warm' },
      vocabulary: {},
      systemDirectives: ['Be clear and useful.'],
    },
  },
  taxonomyTermIds: [],
  source: { kind: 'manual' },
};

describe('Vibe CMS contracts', () => {
  it('parses a normalized draft and applies defaults', () => {
    const parsed = vibeDraftSchema.parse(validDraft);
    expect(parsed.tokens.visual.theme.layout.borderRadius).toBe('md');
    expect(parsed.tokens.linguistic.voice.formalityScale).toBe(3);
  });

  it('rejects unsafe colors, CSS units, and slugs', () => {
    expect(() => vibeTokensPayloadSchema.parse({
      ...validDraft.tokens,
      visual: { ...validDraft.tokens.visual, theme: { ...validDraft.tokens.visual.theme, colors: { ...validDraft.tokens.visual.theme.colors, primary: 'blueish' } } },
    })).toThrow();
    expect(() => vibeDraftSchema.parse({ ...validDraft, slug: 'Bad Slug' })).toThrow();
  });

  it('enforces editorial transitions and publish prerequisites', () => {
    expect(transitionVibe({ status: 'draft', action: 'publish', hasPublishedRevision: true }).ok).toBe(false);
    expect(transitionVibe({ status: 'in_review', action: 'publish', hasPublishedRevision: true })).toEqual({ ok: true, status: 'published' });
    expect(transitionVibe({ status: 'in_review', action: 'reject' }).ok).toBe(false);
    expect(transitionVibe({ status: 'in_review', action: 'reject', rejectionReason: 'Needs stronger contrast.' })).toEqual({ ok: true, status: 'draft' });
  });

  it('returns actions appropriate to the current status', () => {
    expect(getAvailableVibeActions('draft')).toEqual(['submit', 'archive', 'trash']);
    expect(getAvailableVibeActions('published')).toEqual(['archive']);
    expect(getAvailableVibeActions('trash')).toEqual(['restore']);
  });
});
