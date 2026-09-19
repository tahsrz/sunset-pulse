import type { AgentSession, AgentSource } from './types';
import { workspacePolicy } from './workspacePolicy';

export type Reservation = {
  runId: string;
  agentId: string;
  triggerId?: string;
  source: AgentSource;
  normalizedText: string;
  started: boolean;
  createdAt: number;
  assignmentRevision: number;
  epoch: number;
  releaseAfter?: number;
};

type SchedulerInput = {
  agentId: string;
  source: AgentSource;
  text: string;
  triggerId?: string;
  assignmentRevision?: number;
  now?: number;
};

type SchedulerResult = { ok: true; reservation: Reservation } | { ok: false; reason: string; existingRunId?: string };

export class SubmissionScheduler {
  private readonly reservations = new Map<string, Reservation>();
  private readonly candidates = new Map<string, SchedulerInput>();
  private readonly startedAt: number[] = [];
  private readonly assessmentsAt: number[] = [];
  private epoch = 0;
  private lastAutomaticByAgent = new Map<string, number>();

  constructor(private readonly getAgents: () => Record<string, AgentSession>, private readonly getAutomationPaused: () => boolean, private readonly canAutomate: () => boolean = () => true) {}

  getEpoch() { return this.epoch; }

  private prune(now: number) {
    for (const [id, reservation] of this.reservations) if (reservation.releaseAfter !== undefined && now >= reservation.releaseAfter) this.reservations.delete(id);
    while (this.startedAt[0] !== undefined && now - this.startedAt[0] >= 3_600_000) this.startedAt.shift();
  }

  tryReserve(input: SchedulerInput): SchedulerResult {
    const now = input.now ?? Date.now();
    this.prune(now);
    const agent = this.getAgents()[input.agentId];
    if (!agent || agent.removed) return { ok: false, reason: 'This agent is no longer available.' };
    if (input.assignmentRevision !== undefined && input.assignmentRevision !== agent.assignmentRevision) return { ok: false, reason: 'This agent changed while the request was being prepared.' };
    const normalizedText = normalizeSubmissionText(input.text);
    if (!normalizedText) return { ok: false, reason: 'Enter text before submitting.' };
    if (input.text.length > workspacePolicy.commandMaxLength) return { ok: false, reason: `Keep the submission under ${workspacePolicy.commandMaxLength.toLocaleString()} characters.` };

    const existing = [...this.reservations.values()].find((reservation) => reservation.agentId === input.agentId && reservation.triggerId === input.triggerId && reservation.normalizedText === normalizedText);
    if (existing) return { ok: true, reservation: existing };
    if (input.source === 'manual') {
      const candidate = this.candidates.get(input.agentId);
      if (candidate && candidate.triggerId === input.triggerId && normalizeSubmissionText(candidate.text) === normalizedText) this.candidates.delete(input.agentId);
    }

    if (input.source === 'automatic') {
      if (!agent.autoListenEnabled || this.getAutomationPaused() || !this.canAutomate()) return { ok: false, reason: 'Automatic listening is paused.' };
      const lastAutomatic = this.lastAutomaticByAgent.get(input.agentId);
      if (lastAutomatic !== undefined && now - lastAutomatic < workspacePolicy.automaticCooldownMs) return { ok: false, reason: 'Automatic cooldown is active for this agent.' };
      if (this.startedAt.filter((time) => now - time < 60_000).length >= workspacePolicy.maxAutomaticStartsPerMinute) return { ok: false, reason: 'The automatic minute budget is exhausted.' };
      if (this.startedAt.filter((time) => now - time < 3_600_000).length >= workspacePolicy.maxAutomaticStartsPerHour) return { ok: false, reason: 'The automatic hourly budget is exhausted.' };
    }

    const active = [...this.reservations.values()];
    if (active.length >= workspacePolicy.maxGlobalConcurrentCommands) return { ok: false, reason: 'Workspace is at its concurrent command limit.' };
    if (active.some((reservation) => reservation.agentId === input.agentId)) return { ok: false, reason: 'This agent is working; new automatic context will replace its queued candidate.' };

    const reservation: Reservation = {
      runId: crypto.randomUUID(),
      agentId: input.agentId,
      triggerId: input.triggerId,
      source: input.source,
      normalizedText,
      started: false,
      createdAt: now,
      assignmentRevision: agent.assignmentRevision,
      epoch: this.epoch,
    };
    this.reservations.set(reservation.runId, reservation);
    return { ok: true, reservation };
  }

  start(runId: string, now = Date.now()) {
    const reservation = this.reservations.get(runId);
    if (!reservation || reservation.epoch !== this.epoch || reservation.started) return false;
    const agent = this.getAgents()[reservation.agentId];
    if (!agent || agent.removed || agent.assignmentRevision !== reservation.assignmentRevision || (reservation.source === 'automatic' && (!agent.autoListenEnabled || this.getAutomationPaused() || !this.canAutomate()))) {
      this.reservations.delete(runId);
      return false;
    }
    reservation.started = true;
    this.candidates.delete(reservation.agentId);
    if (reservation.source === 'automatic') {
      this.startedAt.push(now);
      this.lastAutomaticByAgent.set(reservation.agentId, now);
    }
    return true;
  }

  claimManualTrigger(agentId: string, triggerId?: string) {
    if (!triggerId) return undefined;
    const pending = [...this.reservations.values()].find((reservation) => reservation.agentId === agentId && reservation.triggerId === triggerId);
    if (!pending) return undefined;
    if (!pending.started) {
      this.reservations.delete(pending.runId);
      return undefined;
    }
    return pending.runId;
  }

  completeRun(runId: string) { this.reservations.delete(runId); }

  holdUncertainRun(runId: string, now = Date.now()) {
    const reservation = this.reservations.get(runId);
    if (reservation?.started) reservation.releaseAfter = now + workspacePolicy.cancelledRunHoldMs;
  }

  tryReserveAssessment(now = Date.now()) {
    while (this.assessmentsAt[0] !== undefined && now - this.assessmentsAt[0] >= 60_000) this.assessmentsAt.shift();
    if (this.assessmentsAt.length >= workspacePolicy.maxSemanticAssessmentsPerMinute) return false;
    this.assessmentsAt.push(now);
    return true;
  }

  coalesceCandidate(input: SchedulerInput) {
    this.candidates.set(input.agentId, input);
    return input;
  }

  takeCandidate(agentId: string) {
    const candidate = this.candidates.get(agentId);
    this.candidates.delete(agentId);
    return candidate;
  }

  invalidateEpoch() {
    this.epoch += 1;
    this.candidates.clear();
    for (const [runId, reservation] of this.reservations) if (!reservation.started) this.reservations.delete(runId);
  }

  removeAgent(agentId: string) {
    this.candidates.delete(agentId);
    for (const [runId, reservation] of this.reservations) if (reservation.agentId === agentId && !reservation.started) this.reservations.delete(runId);
  }

  getBudgetState(now = Date.now()) {
    this.prune(now);
    return {
      minute: this.startedAt.filter((time) => now - time < 60_000).length,
      hour: this.startedAt.filter((time) => now - time < 3_600_000).length,
      minuteLimit: workspacePolicy.maxAutomaticStartsPerMinute,
      hourLimit: workspacePolicy.maxAutomaticStartsPerHour,
      active: [...this.reservations.values()].filter((reservation) => reservation.started).length,
      globalLimit: workspacePolicy.maxGlobalConcurrentCommands,
      assessments: this.assessmentsAt.filter((time) => now - time < 60_000).length,
      assessmentLimit: workspacePolicy.maxSemanticAssessmentsPerMinute,
    };
  }
}

export function normalizeSubmissionText(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}
