import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  upsert: vi.fn(),
  findOne: vi.fn(),
  lean: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/database', () => ({ default: mocks.connectDB }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock('@/models/SiteConfig', () => ({
  SiteConfig: {
    findOne: mocks.findOne,
    findOneAndUpdate: mocks.findOneAndUpdate,
  },
}));

import { readPromptConfig, savePromptConfig } from '@/lib/sites/promptConfigStore';

describe('promptConfigStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectDB.mockResolvedValue(undefined);
    mocks.from.mockReturnValue({ select: mocks.select, upsert: mocks.upsert });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.findOne.mockReturnValue({ lean: mocks.lean });
    mocks.lean.mockResolvedValue(null);
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.findOneAndUpdate.mockResolvedValue({});
  });

  it('returns the freshest normalized configuration across both stores', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        intelligence: { jamieSystemPrompt: 'Stale Supabase prompt' },
        model_matrix: { primaryModel: 'supabase-model' },
        updated_at: '2026-08-20T09:00:00.000Z',
      },
      error: null,
    });
    mocks.lean.mockResolvedValue({
      jamieSystemPrompt: 'Fresh Mongo prompt',
      modelMatrix: { primaryModel: 'mongo-model' },
      updatedAt: new Date('2026-08-20T10:00:00.000Z'),
    });

    await expect(readPromptConfig('agent-one')).resolves.toMatchObject({
      jamieSystemPrompt: 'Fresh Mongo prompt',
      modelMatrix: { primaryModel: 'mongo-model' },
    });
  });

  it('distinguishes total store unavailability from an empty configuration', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'supabase unavailable' } });
    mocks.connectDB.mockRejectedValue(new Error('mongo unavailable'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(readPromptConfig('agent-one')).rejects.toMatchObject({
      name: 'PromptConfigStoreUnavailableError',
    });

    warnSpy.mockRestore();
  });

  it('preserves unrelated Supabase intelligence during prompt writes', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { intelligence: { grill: { name: 'Keep me' } } },
      error: null,
    });
    const config = {
      jamieSystemPrompt: 'Updated prompt',
      abidanPrompts: { MARKET_SCOUT: 'Scout prompt' },
      modelMatrix: { primaryModel: 'model-one' },
      operationalSettings: { minJudges: 1 },
    };

    await expect(savePromptConfig('agent-one', config)).resolves.toEqual(['supabase', 'mongo']);

    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      intelligence: {
        grill: { name: 'Keep me' },
        jamieSystemPrompt: 'Updated prompt',
        abidanPrompts: { MARKET_SCOUT: 'Scout prompt' },
      },
    }), { onConflict: 'agent_id' });
  });
});
