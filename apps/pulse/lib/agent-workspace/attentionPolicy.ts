import { classifyCommandIntent, type CommandIntent } from '@/lib/command-center/intentClassifier';
import type { AgentSession, AttentionDecision, TranscriptSegment } from './types';
import { workspacePolicy } from './workspacePolicy';

const roleIntents: Record<string, CommandIntent[]> = {
  'listing-summary': ['listing_analysis'],
  'buyer-intent': ['lead_prioritization', 'lead_followup'],
  'follow-up-writer': ['lead_followup'],
};

export function getEligibleWindow(agent: AgentSession, segments: TranscriptSegment[], now = Date.now()) {
  const eligible = segments.filter((segment) => segment.final && segment.sequence > agent.transcriptCursor && segment.sequence >= agent.spawnedAtSequence && now - segment.capturedAt <= workspacePolicy.transcriptWindowMs);
  if (!eligible.length) return null;
  const ordered = eligible.sort((a, b) => a.sequence - b.sequence);
  const sessionId = ordered.map((segment) => segment.sessionId).join(',');
  return {
    id: `${sessionId}:${agent.assignmentRevision}:${ordered.map((segment) => segment.id).join('.')}`,
    segments: ordered,
    windowId: `${sessionId}:${agent.assignmentRevision}:${ordered.map((segment) => segment.id).join('.')}`,
  };
}

export function assessWithRules(agent: AgentSession, window: ReturnType<typeof getEligibleWindow>): AttentionDecision {
  const segments = window?.segments || [];
  const text = segments.map((segment) => segment.text).join(' ').trim();
  const base = { agentId: agent.id, transcriptWindowId: window?.windowId || `${agent.id}:empty`, assignmentRevision: agent.assignmentRevision, relevantSegmentIds: segments.map((segment) => segment.id), mode: 'rules' as const };
  if (!text) return { ...base, action: 'ignore', reason: 'No finalized speech is available.' };
  if (text.split(/\s+/).length < 4 && !/[?.!]$/.test(text)) return { ...base, action: 'wait', reason: 'Waiting for the thought to finish.' };
  const classification = classifyCommandIntent(text);
  const supported = roleIntents[agent.workerId] || [];
  if (!supported.length) return { ...base, action: 'wait', reason: 'This role has no automatic trigger policy yet.' };
  if (supported.includes(classification.intent)) return { ...base, action: 'submit', reason: `Rules matched ${classification.intent.replaceAll('_', ' ')} for this role.` };
  const roleTerms = `${agent.label} ${agent.assignment}`.toLowerCase().split(/\W+/).filter((term) => term.length > 3);
  if (roleTerms.some((term) => text.toLowerCase().includes(term))) return { ...base, action: 'submit', reason: 'The finalized speech names this agent’s assignment.' };
  return { ...base, action: 'ignore', reason: 'The finalized speech does not match this role.' };
}

export function isStillEligible(agent: AgentSession, segments: TranscriptSegment[], decision: AttentionDecision, now = Date.now()) {
  const window = getEligibleWindow(agent, segments, now);
  return Boolean(window && window.windowId === decision.transcriptWindowId && agent.assignmentRevision === decision.assignmentRevision);
}
