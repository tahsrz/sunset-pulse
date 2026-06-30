import type { Encounter } from './types';

export const STARTER_ENCOUNTERS: Encounter[] = [
  {
    id: 'stale-listing',
    name: 'Stale Listing',
    title: 'DOM 147 · Smells Like Old Cookies',
    description:
      'A listing that has haunted the MLS since last spring. The seller still thinks it is "just waiting for the right vibe."',
    maxHp: 90,
    attackPower: 11,
    weakWorkerIds: ['comp-analysis', 'listing-summary', 'seller-update', 'lead-scoring'],
    resistWorkerIds: ['follow-up-writer'],
    taunt: 'My Zestimate is a feeling, not a number.',
    flavorDefeat: 'The listing accepts a price adjustment and stops refreshing the photos every Tuesday.'
  },
  {
    id: 'cold-lead',
    name: 'Cold Lead',
    title: 'Ghosted Since Tour',
    description:
      'A buyer who loved the granite counters, asked seventeen questions, then vanished into the CRM void.',
    maxHp: 75,
    attackPower: 13,
    weakWorkerIds: ['lead-scoring', 'buyer-intent', 'follow-up-writer'],
    resistWorkerIds: ['comp-analysis'],
    taunt: 'I will circle back after the holidays. It is always after the holidays.',
    flavorDefeat: 'The lead replies "still interested" and actually means it this time.'
  },
  {
    id: 'compliance-wraith',
    name: 'Compliance Wraith',
    title: 'TREC Form 47-B',
    description:
      'A floating stack of addenda that whispers steering, guarantees, and "this neighborhood is always safe."',
    maxHp: 100,
    attackPower: 14,
    weakWorkerIds: ['supervisor', 'texas-contracts', 'dallas-safety'],
    resistWorkerIds: ['listing-spark'],
    taunt: 'Surely we can just say it is the best school district without checking.',
    flavorDefeat: 'The wraith dissolves into a calm, broker-approved talking-points PDF.'
  }
];

export function getEncounterById(id: string): Encounter | undefined {
  return STARTER_ENCOUNTERS.find((encounter) => encounter.id === id);
}

export function pickRandomEncounter(): Encounter {
  const index = Math.floor(Math.random() * STARTER_ENCOUNTERS.length);
  return STARTER_ENCOUNTERS[index];
}

export function createInitialBattleState(encounter: Encounter): import('./types').BattleState {
  return {
    encounterId: encounter.id,
    enemyHp: encounter.maxHp,
    playerMorale: 100,
    turn: 1,
    phase: 'select',
    log: [
      {
        id: 'intro',
        kind: 'system',
        text: `Encounter: ${encounter.name} — ${encounter.taunt}`
      }
    ]
  };
}
