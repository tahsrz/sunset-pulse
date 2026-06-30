import { describe, expect, it } from 'vitest';
import { intelligenceWorkers } from '@/lib/command-center/workerRoster';
import { computePlayerDamage, computeEnemyDamage } from '@/lib/quest/battleRules';
import { getEncounterById } from '@/lib/quest/encounters';
import { PARTY_WORKER_IDS } from '@/lib/quest/party';

describe('pulse quest battle rules', () => {
  const staleListing = getEncounterById('stale-listing')!;

  it('exposes three party workers for the vertical slice', () => {
    expect(PARTY_WORKER_IDS).toEqual(['lead-scoring', 'follow-up-writer', 'supervisor']);
  });

  it('awards bonus damage when worker is weak against the encounter', () => {
    const listingSummary = intelligenceWorkers.find((w) => w.id === 'listing-summary')!;
    const weakHit = computePlayerDamage(
      listingSummary,
      staleListing,
      'listing summary and price angle',
      'comps and price posture for this stale listing'
    );
    const followUp = intelligenceWorkers.find((w) => w.id === 'follow-up-writer')!;
    const neutral = computePlayerDamage(
      followUp,
      staleListing,
      'generic broker pep talk',
      'stay positive'
    );

    expect(weakHit.encounterBonus).toBe(18);
    expect(neutral.encounterBonus).toBe(0);
    expect(weakHit.total).toBeGreaterThanOrEqual(neutral.total);
  });

  it('ramps enemy damage slightly each turn', () => {
    const encounter = getEncounterById('cold-lead')!;
    expect(computeEnemyDamage(encounter, 1)).toBeLessThan(computeEnemyDamage(encounter, 4));
  });
});
