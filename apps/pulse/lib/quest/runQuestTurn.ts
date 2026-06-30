import 'server-only';

import { runCommandCenterCommand } from '@/lib/command-center/commandRouter';
import { intelligenceWorkers } from '@/lib/command-center/workerRoster';
import { resolveBattleTurn } from './battleRules';
import type { Encounter, QuestTurnInput } from './types';

export type QuestTurnResult = {
  api: Awaited<ReturnType<typeof runCommandCenterCommand>>;
  resolution: ReturnType<typeof resolveBattleTurn>;
};

/**
 * Server-side quest turn — wraps Command Center with puppetshow mode and battle math.
 * Client can also call POST /api/commands directly; this keeps rules in one place for a future API route.
 */
export async function runQuestTurn(input: QuestTurnInput): Promise<QuestTurnResult> {
  const worker =
    input.worker ??
    intelligenceWorkers.find((candidate) => candidate.id === input.workerId) ??
    intelligenceWorkers[0];

  const api = await runCommandCenterCommand({
    command: input.command,
    selectedWorkerId: worker.id,
    relayMode: 'puppetshow',
    supervisor: false,
    context: { neighborhoodId: input.encounter.id }
  });

  const resolution = resolveBattleTurn(
    worker,
    input.encounter,
    input.command,
    {
      commandId: api.commandId,
      worker: { id: api.worker.id, name: api.worker.name },
      result: {
        title: api.result.title,
        summary: api.result.summary,
        deliverable: api.result.deliverable
      }
    },
    input.turn ?? 1
  );

  return { api, resolution };
}

export function buildQuestTurnInput(
  encounter: Encounter,
  workerId: string,
  command: string,
  turn?: number
): QuestTurnInput | null {
  const worker = intelligenceWorkers.find((candidate) => candidate.id === workerId);
  if (!worker) return null;
  return { encounter, workerId, command, worker, turn };
}
