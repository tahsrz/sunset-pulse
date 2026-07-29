import { z } from 'zod';
import { errorResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import { applyPublicApiRateLimit } from '@/lib/core/publicApiRateLimit';
import {
  AGENT_CONSOLE_EVENT_NAMES,
  scheduleAgentConsoleEvent,
  type AgentConsoleTelemetryEvent,
} from '@/lib/agent-console/telemetry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const eventSchema = z.object({
  commandId: z.string().trim().min(1).max(160).optional(),
  durationMs: z.number().finite().min(0).max(120_000).optional(),
  event: z.enum(AGENT_CONSOLE_EVENT_NAMES),
  hasInput: z.boolean().optional(),
  inputLength: z.number().int().min(0).max(20_000).optional(),
  jobId: z.string().trim().min(1).max(80).optional(),
  resultLength: z.number().int().min(0).max(40_000).optional(),
  savedExampleCount: z.number().int().min(0).max(100).optional(),
  sessionId: z.string().trim().min(8).max(160),
  workerId: z.string().trim().min(1).max(120).optional(),
}).strict();

export async function POST(request: Request) {
  const limitResponse = await applyPublicApiRateLimit(request, 'agent-console-event', 60);
  if (limitResponse) return limitResponse;

  let rawBody: unknown;
  try {
    const body = await request.text();
    if (body.length > 8_000) return errorResponse('The request body is too large.', 413);
    rawBody = JSON.parse(body);
  } catch {
    return errorResponse('A valid JSON request body is required.', 400);
  }

  const validation = eventSchema.safeParse(rawBody);
  if (!validation.success) return validationErrorResponse(validation.error.flatten());

  scheduleAgentConsoleEvent(validation.data as AgentConsoleTelemetryEvent);
  return new Response(null, { status: 204 });
}
