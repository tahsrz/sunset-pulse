export const workspacePolicy = {
  maxAgents: 3,
  maxGlobalConcurrentCommands: 2,
  maxConcurrentCommandsPerAgent: 1,
  maxQueuedAutomaticCandidatesPerAgent: 1,
  transcriptWindowMs: 30_000,
  decisionDebounceMs: 1_500,
  automaticCooldownMs: 20_000,
  maxAutomaticStartsPerMinute: 4,
  maxAutomaticStartsPerHour: 20,
  maxSemanticAssessmentsPerMinute: 6,
  commandMaxLength: 20_000,
  commandContextMaxLength: 7_000,
  // Local conservative hold after abort/uncertain delivery, not server proof.
  cancelledRunHoldMs: 300_000,
} as const;

export type WorkspacePolicy = typeof workspacePolicy;
