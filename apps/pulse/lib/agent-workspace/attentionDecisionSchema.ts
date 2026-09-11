import { z } from 'zod';

export const AttentionAgentSchema = z.object({
  id: z.string().min(1).max(100),
  workerId: z.string().min(1).max(100),
  label: z.string().min(1).max(120),
  assignment: z.string().max(1_000),
  assignmentRevision: z.number().int().nonnegative(),
});

export const AttentionSegmentSchema = z.object({
  id: z.string().min(1).max(120),
  sessionId: z.string().min(1).max(120),
  sequence: z.number().int().positive(),
  text: z.string().min(1).max(2_000),
  capturedAt: z.number().finite(),
  final: z.literal(true),
});

export const AttentionRequestSchema = z.object({
  windowId: z.string().min(1).max(500),
  agents: z.array(AttentionAgentSchema).min(1).max(3),
  segments: z.array(AttentionSegmentSchema).min(1).max(30),
}).superRefine((value, context) => {
  if (new Set(value.agents.map((agent) => agent.id)).size !== value.agents.length) context.addIssue({ code: 'custom', path: ['agents'], message: 'Agent IDs must be unique.' });
  if (new Set(value.segments.map((segment) => segment.id)).size !== value.segments.length) context.addIssue({ code: 'custom', path: ['segments'], message: 'Segment IDs must be unique.' });
  if (value.segments.reduce((total, segment) => total + segment.text.length, 0) > 12_000) context.addIssue({ code: 'custom', path: ['segments'], message: 'Transcript window is too large.' });
});

export const AttentionDecisionSchema = z.object({
  agentId: z.string().min(1).max(100),
  transcriptWindowId: z.string().min(1).max(500),
  assignmentRevision: z.number().int().nonnegative(),
  action: z.enum(['ignore', 'wait', 'submit']),
  reason: z.string().min(1).max(280),
  relevantSegmentIds: z.array(z.string().min(1).max(120)).max(30),
  mode: z.enum(['rules', 'semantic']),
});

export const AttentionResponseSchema = z.object({
  decisions: z.array(AttentionDecisionSchema).min(1).max(3),
  assessmentId: z.string().min(1).max(120),
  mode: z.enum(['rules', 'semantic']),
  usage: z.record(z.union([z.number(), z.string()])).optional(),
});

export type AttentionRequest = z.infer<typeof AttentionRequestSchema>;
export type AttentionResponse = z.infer<typeof AttentionResponseSchema>;

export function validateAttentionResponse(input: unknown, request: AttentionRequest) {
  const parsed = AttentionResponseSchema.parse(input);
  const agentIds = new Set(request.agents.map((agent) => agent.id));
  const segmentIds = new Set(request.segments.map((segment) => segment.id));
  if (parsed.decisions.length !== request.agents.length || parsed.decisions.some((decision) => !agentIds.has(decision.agentId) || decision.transcriptWindowId !== request.windowId || !request.agents.some((agent) => agent.id === decision.agentId && agent.assignmentRevision === decision.assignmentRevision) || decision.relevantSegmentIds.some((id) => !segmentIds.has(id)) || (decision.action === 'submit' && decision.relevantSegmentIds.length === 0))) {
    throw new Error('Assessment response does not match its bounded request.');
  }
  if (new Set(parsed.decisions.map((decision) => decision.agentId)).size !== parsed.decisions.length) throw new Error('Assessment response contains duplicate agents.');
  return parsed;
}
