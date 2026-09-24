import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { acceptWorkspaceInvitation } from '@/lib/platform/access/workspaceInvitations.server';
import { PlatformRunError } from '@/lib/platform/workflows/runStore.server';
import { readWorkflowBody } from '@/lib/platform/workflows/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bodySchema = z.object({ token: z.string() }).strict();

export async function POST(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const { token } = bodySchema.parse(await readWorkflowBody(request));
    const result = await acceptWorkspaceInvitation(access.user.id, token);
    return NextResponse.json({ ok: true, ...result }, { headers });
  } catch (error) {
    const status = error instanceof ZodError ? 400
      : error instanceof PlatformRunError ? ({ '22023': 400, '42501': 403, P0002: 404, '23505': 409, '40001': 409 }[error.code] ?? 500)
      : 500;
    const message = status === 400 ? 'Invalid invitation request.'
      : status === 403 ? 'The invitation is not valid for this signed-in account.'
      : status === 404 ? 'Invitation not found.'
      : status === 409 ? 'Invitation is no longer available.'
      : 'Unable to accept invitation.';
    return NextResponse.json({ ok: false, error: message }, { status, headers });
  }
}
