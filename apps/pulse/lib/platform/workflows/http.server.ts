import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { WorkspaceAccessError } from '@/lib/platform/access/workspaceAccess.server';
import { PlatformRunError } from './runStore.server';

export type WorkspaceRouteContext = { params: Promise<{ workspaceId: string }> };
class InputError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export async function readWorkflowBody(request: NextRequest): Promise<unknown> {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new InputError(403, 'Cross-origin request denied.');
  }
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new InputError(415, 'JSON is required.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new InputError(400, 'Request body is required.');
  const decoder = new TextDecoder();
  let size = 0, text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 131072) { await reader.cancel(); throw new InputError(413, 'Request is too large.'); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  try { return JSON.parse(text); } catch { throw new InputError(400, 'Invalid JSON.'); }
}

export async function workspaceWorkflowRequest(
  request: NextRequest, context: WorkspaceRouteContext,
  work: (actorId: string, workspaceId: string) => Promise<unknown>,
) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const { workspaceId } = await context.params;
    z.string().uuid().parse(workspaceId);
    return NextResponse.json({ ok: true, result: await work(access.user.id, workspaceId) }, { headers });
  } catch (error) {
    let status = 500, message = 'Unable to process workflow request.';
    if (error instanceof InputError) { status = error.status; message = error.message; }
    else if (error instanceof ZodError) { status = 400; message = 'Invalid workflow request.'; }
    else if (error instanceof WorkspaceAccessError) {
      status = error.code === 'INVALID' ? 400 : error.code === 'FORBIDDEN' ? 403 : 404;
      message = error.message;
    } else if (error instanceof PlatformRunError) {
      const errors: Record<string, [number, string]> = {
        '22023': [400, 'Invalid workflow input.'], '42501': [403, 'Workspace action denied.'],
        P0002: [404, 'Workflow record not found.'], '40001': [409, 'Workflow changed. Reload before saving.'],
        '23505': [409, 'Workflow request conflict.'], '55000': [503, 'Workflow admission is currently disabled.'],
      };
      [status, message] = errors[error.code] || [status, message];
    }
    return NextResponse.json({ ok: false, error: message }, { status, headers });
  }
}
