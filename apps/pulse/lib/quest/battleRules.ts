import type { IntelligenceWorker } from '@/lib/command-center/workerRoster';
import type { BattleResolution, CommandApiBattlePayload, DamageBreakdown, Encounter } from './types';

const POWER_KEYWORDS = [
  'comp',
  'price',
  'compliance',
  'follow',
  'call',
  'contract',
  'market',
  'seller',
  'buyer',
  'neighborhood',
  'evidence',
  'source'
];

export function computePlayerDamage(
  worker: IntelligenceWorker,
  encounter: Encounter,
  command: string,
  apiSummary: string
): DamageBreakdown {
  const base = Math.round(worker.stats.precision / 4) + Math.round(worker.stats.speed / 12);
  const normalizedCommand = command.toLowerCase();
  const fitBonus = worker.commandFit.some((phrase) => normalizedCommand.includes(phrase)) ? 12 : 0;
  const encounterBonus = encounter.weakWorkerIds.includes(worker.id) ? 18 : 0;
  const resistPenalty = encounter.resistWorkerIds.includes(worker.id) ? 8 : 0;

  const combinedText = `${command} ${apiSummary}`.toLowerCase();
  const keywordHits = POWER_KEYWORDS.filter((word) => combinedText.includes(word)).length;
  const keywordBonus = Math.min(15, keywordHits * 3);

  const raw = base + fitBonus + encounterBonus + keywordBonus - resistPenalty;
  const total = Math.max(8, Math.min(45, raw));

  return { base, fitBonus, encounterBonus, resistPenalty, keywordBonus, total };
}

export function computeEnemyDamage(encounter: Encounter, turn: number): number {
  const ramp = Math.min(6, Math.floor(turn / 2));
  return Math.min(22, encounter.attackPower + ramp);
}

export function extractNarration(payload: CommandApiBattlePayload): BattleResolution {
  const frames = payload.result.deliverable?.frames ?? [];
  const frameLabels = frames.map((frame) => frame.label).filter(Boolean);
  const frameBodies = frames.map((frame) => frame.body).filter(Boolean);
  const narration =
    frameBodies.slice(0, 2).join(' ') ||
    payload.result.summary ||
    payload.result.title ||
    'Your specialist landed the talking points.';

  return {
    playerDamage: { base: 0, fitBonus: 0, encounterBonus: 0, resistPenalty: 0, keywordBonus: 0, total: 0 },
    enemyDamage: 0,
    narration,
    frameLabels
  };
}

export function resolveBattleTurn(
  worker: IntelligenceWorker,
  encounter: Encounter,
  command: string,
  apiPayload: CommandApiBattlePayload,
  turn: number
): BattleResolution {
  const narrationBits = extractNarration(apiPayload);
  const playerDamage = computePlayerDamage(worker, encounter, command, apiPayload.result.summary);
  const enemyDamage = computeEnemyDamage(encounter, turn);

  return {
    ...narrationBits,
    playerDamage,
    enemyDamage
  };
}
