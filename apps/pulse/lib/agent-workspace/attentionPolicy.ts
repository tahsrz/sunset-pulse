import { classifyCommandIntent, type CommandIntent } from '@/lib/command-center/intentClassifier';
import type { AgentSession, AttentionDecision, TranscriptSegment } from './types';
import { workspacePolicy } from './workspacePolicy';

const roleIntents: Record<string, CommandIntent[]> = {
  'listing-summary': ['listing_analysis'],
  'buyer-intent': ['lead_prioritization', 'lead_followup'],
  'follow-up-writer': ['lead_followup'],
};

export function getEligibleWindow(agent: AgentSession, segments: TranscriptSegment[], now = Date.now()) {
  const eligible = segments.filter((segment) => segment.final && segment.text.trim() && segment.text.length <= 2_000 && segment.sequence > agent.transcriptCursor && segment.sequence > agent.spawnedAtSequence && now >= segment.capturedAt && now - segment.capturedAt <= workspacePolicy.transcriptWindowMs);
  if (!eligible.length) return null;
  const ordered: TranscriptSegment[] = [];
  let length = 0;
  for (const segment of eligible.sort((a, b) => b.sequence - a.sequence)) {
    if (ordered.length === 30 || length + segment.text.length > 12_000) break;
    ordered.unshift(segment);
    length += segment.text.length;
  }
  const windowId = `${agent.assignmentRevision}:${transcriptWindowId(ordered)}`;
  return {
    id: windowId,
    segments: ordered,
    windowId,
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
  return { ...base, action: 'ignore', reason: 'The finalized speech does not match this role.' };
}

export function isStillEligible(agent: AgentSession, segments: TranscriptSegment[], decision: AttentionDecision, now = Date.now()) {
  const window = getEligibleWindow(agent, segments, now);
  return Boolean(!agent.removed && agent.autoListenEnabled && window && window.windowId === decision.transcriptWindowId && agent.assignmentRevision === decision.assignmentRevision);
}

// Compact identity only, not an authorization token. Callers also compare the
// actual segment IDs when applying an asynchronous assessment.
export function transcriptWindowId(segments: TranscriptSegment[]) {
  const input = JSON.stringify(segments.map(({ sessionId, sequence, id }) => [sessionId, sequence, id]));
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
  return `${segments.length}:${segments[0]?.sequence}:${segments.at(-1)?.sequence}:${hash >>> 0}`;
}
