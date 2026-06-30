import { intelligenceWorkers, type IntelligenceWorker } from '@/lib/command-center/workerRoster';
import type { QuestAbility } from './types';

/** Party members for Pulse Quest vertical slice — satirical broker specialists. */
export const PARTY_WORKER_IDS = ['lead-scoring', 'follow-up-writer', 'supervisor'] as const;

export type PartyWorkerId = (typeof PARTY_WORKER_IDS)[number];

export function getPartyWorkers(): IntelligenceWorker[] {
  return PARTY_WORKER_IDS.map((id) => intelligenceWorkers.find((w) => w.id === id)).filter(
    (w): w is IntelligenceWorker => Boolean(w)
  );
}

export const QUEST_ABILITIES: QuestAbility[] = [
  {
    id: 'call-order',
    label: 'Priority Dial',
    workerId: 'lead-scoring',
    command: 'Rank these leads and tell me who to call first before the open house ends'
  },
  {
    id: 'warm-text',
    label: 'Warm Follow-Up',
    workerId: 'follow-up-writer',
    command: 'Write a follow-up text that sounds human and gets a reply'
  },
  {
    id: 'compliance-check',
    label: 'Compliance Shield',
    workerId: 'supervisor',
    command: 'Supervisor check — flag unsupported claims in this pitch'
  }
];

export function abilitiesForWorker(workerId: string): QuestAbility[] {
  return QUEST_ABILITIES.filter((ability) => ability.workerId === workerId);
}
