import { describe, expect, it } from 'vitest';
import VibeTaxonomy from '@/models/VibeTaxonomy';
import VibeTerm from '@/models/VibeTerm';
import VibeTermRelationship from '@/models/VibeTermRelationship';

function indexes(model: { schema: { indexes: () => Array<[Record<string, number>, Record<string, unknown>]> } }) {
  return model.schema.indexes();
}

describe('normalized Vibe taxonomy models', () => {
  it('enforces tenant-scoped taxonomy and term identities', () => {
    expect(indexes(VibeTaxonomy)).toContainEqual([{ tenantId: 1, slug: 1 }, expect.objectContaining({ unique: true })]);
    expect(indexes(VibeTerm)).toContainEqual([{ tenantId: 1, taxonomyId: 1, slug: 1 }, expect.objectContaining({ unique: true })]);
    expect(indexes(VibeTerm)).toContainEqual([{ tenantId: 1, legacyId: 1 }, expect.objectContaining({ unique: true, sparse: true })]);
  });

  it('prevents duplicate Vibe-to-term relationships and supports term lookups', () => {
    expect(indexes(VibeTermRelationship)).toContainEqual([{ tenantId: 1, vibeId: 1, termId: 1 }, expect.objectContaining({ unique: true })]);
    expect(indexes(VibeTermRelationship)).toContainEqual([{ tenantId: 1, termId: 1, vibeId: 1 }, expect.any(Object)]);
  });
});
