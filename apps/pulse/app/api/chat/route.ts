import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import { runTensorZeroJamieChat } from '@/lib/tensorzero/jamieBackbone';
import { getAgentIdFromInput } from '@/lib/sites/agentConfig';
import { resolveJamieListingContext } from '@/lib/ai/jamieListingContext';

const MAX_REQUEST_BYTES = 100_000;

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1).max(12_000),
  }).strict()).min(1).max(60),
  listingId: z.string().trim().min(1).max(160).nullable().optional(),
  isDevMode: z.boolean().optional(),
  memoryContext: z.object({
    userName: z.string().max(120).optional(),
    lastAction: z.string().max(240).optional(),
    lastProperty: z.string().max(240).optional(),
    sessionCount: z.number().int().min(0).max(1_000_000).optional(),
    isReturning: z.boolean().optional(),
  }).strict().nullable().optional(),
  agentId: z.string().trim().min(1).max(160).nullable().optional(),
  personaMode: z.enum(['general', 'guarded_real_estate']).optional(),
}).strict();

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitToken = sessionUser?.userId || ip;

    // Rate Limiting 10 chat messages per minute
    const limitResponse = await applyApiRateLimit(rateLimitToken, 10);
    if (limitResponse) return limitResponse;

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > MAX_REQUEST_BYTES) {
      return errorResponse('Chat request is too large.', 413);
    }

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return validationErrorResponse({ body: ['Request body must be valid JSON.'] });
    }

    const parsed = chatRequestSchema.safeParse(json);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten());
    }

    const { messages, listingId, isDevMode } = parsed.data;
    const serverIsDevMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'
      ? Boolean(isDevMode)
      : sessionUser?.role === 'admin' || sessionUser?.role === 'operator';
    // Tenant and persona selection are server-owned. Public callers use the
    // configured default agent; operator sessions may use the guarded persona.
    const agentId = getAgentIdFromInput();
    const serverPersonaMode = sessionUser?.role === 'admin' || sessionUser?.role === 'operator'
      ? parsed.data.personaMode === 'guarded_real_estate' ? 'guarded_real_estate' : 'general'
      : 'general';
    const propertyData = await resolveJamieListingContext(listingId);
    const result = await runTensorZeroJamieChat({
      messages,
      propertyData,
      memoryContext: undefined,
      isDevMode: serverIsDevMode,
      agentId,
      personaMode: serverPersonaMode,
      isMock: process.env.NEXT_PUBLIC_MOCK_MODE === 'true',
    });

    return new Response(JSON.stringify(result.body), {
      headers: { 'Content-Type': 'application/json' },
      ...result.init,
    });
  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    return errorResponse('Chat session failed.', 500, error instanceof Error ? error.message : undefined);
  }
}
