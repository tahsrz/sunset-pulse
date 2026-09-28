import type { CommandResponse } from './commandTypes';

export function buildCommandTraceExport(commandResult: CommandResponse) {
  return {
    commandId: commandResult.commandId,
    intent: commandResult.intent,
    commandText: commandResult.commandText,
    worker: commandResult.worker,
    model: commandResult.model,
    tahFiles: commandResult.tahFiles,
    confidence: commandResult.result.confidence,
    classification: commandResult.trace?.classification,
    listingFacts: commandResult.trace?.listingFacts,
    contextBudget: commandResult.trace?.contextBudget,
    progress: commandResult.trace?.progress,
    selectedShards: (commandResult.trace?.selectedShards || []).map((shard) => ({
      source: shard.source,
      title: shard.title,
      score: shard.score,
      concepts: shard.concepts,
      matchReason: shard.metrics?.matchReason,
    })),
    workflow: commandResult.trace?.workflow,
    postWorkflow: commandResult.trace?.postWorkflow,
    supervisorReview: commandResult.trace?.supervisorReview,
    commandPost: commandResult.trace?.commandPost,
    voltagent: commandResult.trace?.voltagent ? {
      status: commandResult.trace?.voltagent.status,
      framework: commandResult.trace?.voltagent.framework,
      model: commandResult.trace?.voltagent.model,
      provider: commandResult.trace?.voltagent.provider,
      reason: commandResult.trace?.voltagent.reason,
    } : undefined,
    tensorzero: commandResult.trace?.tensorzero,
  };
}

export function collectWorkflowTimings(commandResult: CommandResponse) {
  return [
    ...(commandResult.trace?.workflow?.attempts || []).map((attempt) => ({ ...attempt, phase: 'main' })),
    ...(commandResult.trace?.postWorkflow?.attempts || []).map((attempt) => ({ ...attempt, phase: 'post' })),
  ].sort((left, right) => right.durationMs - left.durationMs);
}

export function formatTimingName(name: string) {
  return name.replace(/[_-]+/g, ' ');
}

export function formatMatchScore(score: number) {
  if (score >= 100) return 'high';
  if (score >= 60) return 'good';
  return 'light';
}

export function formatSearchStage(name: string) {
  const stages: Record<string, string> = {
    'metadata filter': 'Checked file info',
    'concept match': 'Matched words',
    'density vitality rank': 'Ranked useful notes',
    'compact context output': 'Kept best notes',
    'virtual loadout fallback': 'Used helper files'
  };
  return stages[name] || name.replace(/[_-]+/g, ' ');
}
