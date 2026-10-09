import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import { runTensorZeroJamieChat } from '@/lib/tensorzero/jamieBackbone';
import { getAgentIdFromInput } from '@/lib/sites/agentConfig';
import { resolveJamieListingContext } from '@/lib/ai/jamieListingContext';
import { chatContextSchema } from '@/lib/ai/jamiePersonalContract';
import { requirePersonalRealtorWorkspace, RealtorWorkspaceError } from '@/lib/realtor-workspace/access.server';

const MAX_REQUEST_BYTES = 100_000;
const noStoreHeaders = { 'Cache-Control': 'private, no-store' };

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
  context: chatContextSchema.default('general'),
}).strict();

export async function POST(req: NextRequest) {
  let personalRequested = false;
  try {
    const sessionUser = await getSessionUser();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitToken = sessionUser?.userId || ip;

    // Rate Limiting 10 chat messages per minute
    const limitResponse = await applyApiRateLimit(rateLimitToken, 10);
    if (limitResponse) return withNoStore(limitResponse);

    const json = await readBoundedChatJson(req);
    personalRequested = Boolean(json && typeof json === 'object' && (json as { context?: unknown }).context === 'personal_realtor');

    const parsed = chatRequestSchema.safeParse(json);
    if (!parsed.success) {
      return withNoStore(validationErrorResponse(parsed.error.flatten()));
    }

    const { messages, listingId, isDevMode } = parsed.data;
    if (personalRequested) {
      assertSameOrigin(req);
      if (listingId) return withNoStore(validationErrorResponse({ listingId: ['Personal Jamie cannot be combined with listing context.'] }));
      const access = await requireSignedInUser(req);
      if (isAuthResponse(access)) return withNoStore(access);
      const { workspaceId, preferences } = await requirePersonalRealtorWorkspace(access.user.id);
      const result = await runTensorZeroJamieChat({
        messages,
        personalContext: { actorId: access.user.id, workspaceId, timeZone: preferences.time_zone },
        signal: req.signal,
      });
      return withNoStore(new Response(JSON.stringify(result.body), {
        status: 200, headers: { 'Content-Type': 'application/json', ...(result.init?.headers || {}) },
      }));
    }

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

    return withNoStore(new Response(JSON.stringify(result.body), {
      headers: { 'Content-Type': 'application/json' },
      ...result.init,
    }));
  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    if (personalRequested) {
      if (error instanceof RealtorWorkspaceError) {
        const [status, message] = error.code === 'SETUP_REQUIRED' ? [409, 'Set up your personal planner to use personal Jamie.']
          : error.code === 'FORBIDDEN' ? [403, 'Personal Jamie is not available for this workspace.']
            : error.code === 'INVALID' ? [400, 'The personal Jamie request is invalid.']
              : [500, 'Personal Jamie could not load your private workspace.'];
        return withNoStore(errorResponse(message, status));
      }
      if (error instanceof ChatRequestError) return withNoStore(errorResponse(error.message, error.status));
      return withNoStore(errorResponse('Personal Jamie is unavailable. Your data was not changed.', 503));
    }
    if (error instanceof ChatRequestError) return withNoStore(errorResponse(error.message, error.status));
    return withNoStore(errorResponse('Chat session failed.', 500, error instanceof Error ? error.message : undefined));
  }
}

class ChatRequestError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

async function readBoundedChatJson(request: NextRequest): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new ChatRequestError(415, 'JSON is required.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ChatRequestError(400, 'Request body is required.');
  const decoder = new TextDecoder();
  let byteLength = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      byteLength += chunk.value.byteLength;
      if (byteLength > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new ChatRequestError(413, 'Chat request is too large.');
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  try { return JSON.parse(text); }
  catch { throw new ChatRequestError(400, 'Request body must be valid JSON.'); }
}

function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  const url = new URL(request.url);
  const host = request.headers.get('host');
  let expectedOrigin = url.origin;
  if (host) {
    try {
      const external = new URL(`${url.protocol}//${host}`);
      if (external.username || external.password || external.pathname !== '/' || external.search || external.hash) throw new Error();
      expectedOrigin = external.origin;
    }
    catch { throw new ChatRequestError(403, 'Invalid request host.'); }
  }
  if ((origin && origin !== expectedOrigin) || site === 'cross-site') throw new ChatRequestError(403, 'Cross-origin request denied.');
}

function withNoStore(response: Response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
