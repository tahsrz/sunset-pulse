import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findOneAndUpdate: vi.fn(),
  resolve: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@/models/Vibe', () => ({ default: { findOneAndUpdate: mocks.findOneAndUpdate } }));
vi.mock('@/lib/cms/taxonomyRepository', () => ({
  resolveLegacyTaxonomyTermIds: mocks.resolve,
  replaceVibeTermRelationships: mocks.replace,
}));

import { saveVibeDraft } from '@/lib/cms/vibeService';

const draft = {
  title: 'Taxonomy test',
  slug: 'taxonomy-test',
  description: '',
  excerpt: '',
  taxonomyTermIds: ['mood:calm'],
  tokens: {
    visual: {
      theme: {
        colors: { primary: '#2563eb', background: '#ffffff', surface: '#f8fafc', textPrimary: '#111827', textSecondary: '#475569' },
        typography: { fontFamilyHeading: 'Inter', fontFamilyBody: 'Inter', baseFontSize: '16px' },
        layout: {},
      },
      effects: {},
    },
    linguistic: { voice: { primaryTone: 'warm' }, vocabulary: {}, systemDirectives: ['Be clear.'] },
  },
  source: { kind: 'manual' },
};

describe('draft taxonomy dual write', () => {
  afterEach(() => {
    delete process.env.VIBE_TAXONOMY_NORMALIZED_WRITE;
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  function arrangeSavedDraft() {
    const updated = { vibeId: 'vibe-a', tenantId: 'tenant-a' };
    mocks.findOneAndUpdate.mockReturnValue({ lean: vi.fn().mockResolvedValue(updated) });
    return updated;
  }

  it('does not query normalized taxonomy while the write flag is disabled', async () => {
    const updated = arrangeSavedDraft();
    await expect(saveVibeDraft({ vibeId: 'vibe-a', tenantId: 'tenant-a', draft, actorId: 'operator-a' })).resolves.toBe(updated);
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('synchronizes normalized relationships after a successful embedded save', async () => {
    process.env.VIBE_TAXONOMY_NORMALIZED_WRITE = '1';
    arrangeSavedDraft();
    mocks.resolve.mockResolvedValue({ termIds: ['term-a'], unknownLegacyIds: [] });
    mocks.replace.mockResolvedValue({ addTermIds: ['term-a'], removeTermIds: [] });
    await saveVibeDraft({ vibeId: 'vibe-a', tenantId: 'tenant-a', draft, actorId: 'operator-a' });
    expect(mocks.resolve).toHaveBeenCalledWith({ tenantId: 'tenant-a', legacyIds: ['mood:calm'] });
    expect(mocks.replace).toHaveBeenCalledWith({ tenantId: 'tenant-a', vibeId: 'vibe-a', termIds: ['term-a'], actorId: 'operator-a' });
  });

  it('keeps the embedded save successful when normalized synchronization fails', async () => {
    process.env.VIBE_TAXONOMY_NORMALIZED_WRITE = '1';
    const updated = arrangeSavedDraft();
    mocks.resolve.mockRejectedValue(new Error('normalized unavailable'));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(saveVibeDraft({ vibeId: 'vibe-a', tenantId: 'tenant-a', draft, actorId: 'operator-a' })).resolves.toBe(updated);
    expect(warning).toHaveBeenCalledWith('VIBE_TAXONOMY_DUAL_WRITE_FAILED', expect.objectContaining({ tenantId: 'tenant-a', vibeId: 'vibe-a', error: 'normalized unavailable' }));
  });
});
