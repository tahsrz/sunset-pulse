import type { IntelligenceWorker } from '@/lib/command-center/workerRoster';

export type BattlePhase = 'select' | 'resolving' | 'enemy-turn' | 'won' | 'lost';

export type BattleLogEntry = {
  id: string;
  kind: 'player' | 'enemy' | 'system' | 'narration';
  text: string;
  damage?: number;
};

export type Encounter = {
  id: string;
  name: string;
  title: string;
  description: string;
  maxHp: number;
  attackPower: number;
  weakWorkerIds: string[];
  resistWorkerIds: string[];
  taunt: string;
  flavorDefeat: string;
};

export type BattleState = {
  encounterId: string;
  enemyHp: number;
  playerMorale: number;
  turn: number;
  phase: BattlePhase;
  log: BattleLogEntry[];
};

export type QuestAbility = {
  id: string;
  label: string;
  command: string;
  workerId: string;
};

export type DamageBreakdown = {
  base: number;
  fitBonus: number;
  encounterBonus: number;
  resistPenalty: number;
  keywordBonus: number;
  total: number;
};

export type BattleResolution = {
  playerDamage: DamageBreakdown;
  enemyDamage: number;
  narration: string;
  frameLabels: string[];
};

export type CommandApiBattlePayload = {
  commandId: string;
  worker: { id: string; name: string };
  result: {
    title: string;
    summary: string;
    deliverable?: {
      frames?: Array<{ label: string; body: string; speakerNote?: string }>;
    };
  };
};

export type QuestTurnInput = {
  command: string;
  workerId: string;
  encounter: Encounter;
  worker: IntelligenceWorker;
  turn?: number;
};
