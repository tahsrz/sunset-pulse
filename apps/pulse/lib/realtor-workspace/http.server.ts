import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { readWorkflowBody, WorkflowInputError } from '@/lib/platform/workflows/http.server';
import { RealtorWorkspaceError } from './access.server';

const noStore = { 'Cache-Control': 'private, no-store' };

export async function realtorApi(
  request: NextRequest,
  work: (actorId: string) => Promise<unknown>,
  bodyRequired = false,
) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) {
    access.headers.set('Cache-Control', 'private, no-store');
    return access;
  }
  try {
    const result = await work(access.user.id);
    if (result instanceof Response) {
      result.headers.set('Cache-Control', 'private, no-store');
      return result;
    }
    return NextResponse.json({ ok: true, result }, { headers: noStore });
  } catch (error) {
    let status = 500;
    let message = 'Unable to load the personal realtor workspace.';
    if (error instanceof RealtorWorkspaceError) {
      status = ({ SETUP_REQUIRED: 409, NOT_FOUND: 404, FORBIDDEN: 403, INVALID: 400, CONFLICT: 409, FAILED: 500 })[error.code];
      message = ({
        SETUP_REQUIRED: 'Set up your personal planner to continue.',
        NOT_FOUND: 'Planner record not found.',
        FORBIDDEN: 'This personal workspace is unavailable.',
        INVALID: 'Check the details and try again.',
        CONFLICT: 'This record changed. Reload it before saving.',
        FAILED: 'Unable to process the personal workspace request.',
      })[error.code];
    } else if (error instanceof WorkflowInputError) {
      status = error.status;
      message = error.message;
    } else if (error instanceof ZodError) {
      status = 400;
      message = 'The request details are invalid.';
    } else if (bodyRequired) {
      status = 400;
    }
    return NextResponse.json({ ok: false, error: message }, { status, headers: noStore });
  }
}

export async function readRealtorBody(request: NextRequest) {
  return readWorkflowBody(request);
}
