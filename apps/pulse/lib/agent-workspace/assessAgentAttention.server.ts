import 'server-only';

import { groq } from '@ai-sdk/groq';
import { generateObject } from 'ai';
import { z } from 'zod';
import { resolveJamieGroqModel } from '@/lib/ai/modelDefaults';
import { assessWithRules } from './attentionPolicy';
import {
  AttentionDecisionSchema,
  validateAttentionResponse,
  type AttentionRequest,
  type AttentionResponse,
} from './attentionDecisionSchema';

export type AttentionAssessment = (request: AttentionRequest) => Promise<AttentionResponse>;

export async function assessAgentAttention(request: AttentionRequest, assessment: AttentionAssessment = defaultAttentionAssessment) {
  return assessment(request);
}

const semanticDecisionSchema = AttentionDecisionSchema
  .omit({ transcriptWindowId: true, assignmentRevision: true, mode: true })
  .strict();

const semanticOutputSchema = z.object({
  decisions: z.array(semanticDecisionSchema).min(1).max(3),
}).strict();

async function defaultAttentionAssessment(request: AttentionRequest): Promise<AttentionResponse> {
  if (!isSemanticAttentionConfigured()) return defaultRulesAssessment(request);

  try {
    return await assessAgentAttentionSemantically(request);
  } catch (error) {
    console.warn(
      '[AGENT_WORKSPACE_ATTENTION_FALLBACK]',
      error instanceof Error ? error.message : 'Semantic attention assessment failed.',
    );
    return defaultRulesAssessment(request);
  }
}

export async function assessAgentAttentionSemantically(request: AttentionRequest): Promise<AttentionResponse> {
  const configuredModel = process.env.AGENT_WORKSPACE_ATTENTION_MODEL || process.env.JAMIE_GROQ_MODEL;
  const modelId = resolveJamieGroqModel(configuredModel);
  const result = await generateObject({
    model: groq(modelId),
    schema: semanticOutputSchema,
    system: [
      'You are the bounded attention classifier for the Sunset Pulse Agent Workspace.',
      'Decide whether each explicitly listed worker should ignore, wait for, or submit the supplied finalized transcript window.',
      'Use only the supplied transcript and worker assignment. Never invent facts or add workers, commands, or segment IDs.',
      'Choose submit only when the worker assignment is clearly relevant and the thought is actionable; choose wait when the thought is incomplete; otherwise choose ignore.',
      'Return exactly one decision for every supplied agent. Keep each reason concise and operator-safe.',
    ].join(' '),
    prompt: JSON.stringify({
      windowId: request.windowId,
      agents: request.agents,
      segments: request.segments,
    }),
    temperature: 0,
    maxOutputTokens: 900,
    abortSignal: AbortSignal.timeout(3_500),
  });

  const assignmentByAgentId = new Map(request.agents.map((agent) => [agent.id, agent.assignmentRevision]));
  const decisions = result.object.decisions.map((decision) => ({
    ...decision,
    transcriptWindowId: request.windowId,
    assignmentRevision: assignmentByAgentId.get(decision.agentId) ?? -1,
    mode: 'semantic' as const,
  }));

  return validateAttentionResponse({
    decisions,
    assessmentId: crypto.randomUUID(),
    mode: 'semantic',
    usage: normalizeUsage(result.usage),
  }, request);
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

function isSemanticAttentionConfigured() {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') return false;
  if (process.env.AGENT_WORKSPACE_ATTENTION_ENABLED !== 'true') return false;
  return hasConfiguredSecret(process.env.GROQ_API_KEY);
}

function hasConfiguredSecret(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return Boolean(normalized) && ![
    'your_key_here',
    'your-api-key-here',
    'your_groq_key_here',
    'placeholder',
    'changeme',
  ].includes(normalized);
}

function normalizeUsage(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const usage = value as Record<string, unknown>;
  const inputTokens = nonNegativeInteger(usage.inputTokens);
  const outputTokens = nonNegativeInteger(usage.outputTokens);
  const totalTokens = nonNegativeInteger(usage.totalTokens) || inputTokens + outputTokens;
  return totalTokens > 0 ? { inputTokens, outputTokens, totalTokens } : undefined;
}

function nonNegativeInteger(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}
