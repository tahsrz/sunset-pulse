import { describe, expect, it } from 'vitest';
import { vibeDraftSchema, vibeTokensPayloadSchema } from '@/lib/cms/vibeSchema';
import { getAvailableVibeActions, transitionVibe } from '@/lib/cms/vibeWorkflow';
import { getVibePreset, VIBE_PRESETS } from '@/lib/cms/vibePresets';

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

  it('covers archive, trash, restore, and invalid lifecycle transitions', () => {
    expect(transitionVibe({ status: 'published', action: 'archive' })).toEqual({ ok: true, status: 'archived' });
    expect(transitionVibe({ status: 'archived', action: 'trash' })).toEqual({ ok: true, status: 'trash' });
    expect(transitionVibe({ status: 'trash', action: 'restore' })).toEqual({ ok: true, status: 'draft' });
    expect(transitionVibe({ status: 'published', action: 'trash' }).ok).toBe(false);
    expect(transitionVibe({ status: 'trash', action: 'publish', hasPublishedRevision: true }).ok).toBe(false);
  });

  it('keeps every creation preset resolvable with complete, coordinated draft defaults', () => {
    expect(VIBE_PRESETS.map((preset) => preset.id)).toEqual(['editorial', 'market-intelligence']);
    for (const preset of VIBE_PRESETS) {
      expect(getVibePreset(preset.id)).toEqual(preset);
      expect(Object.values(preset.tokenColors)).toHaveLength(5);
      expect(Object.values(preset.tokenColors).every((color) => /^#[0-9a-f]{6}$/i.test(color))).toBe(true);
      expect(preset.taxonomyTermIds).toHaveLength(3);
      expect(preset.taxonomyTermIds).toContain(`voice:${preset.primaryTone}`);
      expect(['warm', 'analytical']).toContain(preset.primaryTone);
    }
  });
});
