import 'server-only';
import { assessWithRules } from './attentionPolicy';
import { validateAttentionResponse, type AttentionRequest, type AttentionResponse } from './attentionDecisionSchema';

export type AttentionAssessment = (request: AttentionRequest) => Promise<AttentionResponse>;

export async function assessAgentAttention(request: AttentionRequest, assessment: AttentionAssessment = defaultRulesAssessment) {
  return assessment(request);
}

async function defaultRulesAssessment(request: AttentionRequest): Promise<AttentionResponse> {
  const decisions = request.agents.map((agent) => assessWithRules({
    id: agent.id,
    workerId: agent.workerId,
    label: agent.label,
    assignment: agent.assignment,
    assignmentRevision: agent.assignmentRevision,
    autoListenEnabled: true,
    spawnedAtSequence: 0,
    draftText: '',
    draftDirty: false,
    draftRevision: 0,
    transcriptCursor: 0,
  }, { id: request.windowId, windowId: request.windowId, segments: request.segments }));
  return validateAttentionResponse({ decisions, assessmentId: crypto.randomUUID(), mode: 'rules' }, request);
}

