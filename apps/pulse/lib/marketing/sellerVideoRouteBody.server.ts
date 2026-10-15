import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { readWorkflowBody, WorkflowInputError } from '@/lib/platform/workflows/http.server';

export async function readSellerVideoJson(request: NextRequest, label: string) {
  try {
    return { body: await readWorkflowBody(request), response: null };
  } catch (error) {
    const status = error instanceof WorkflowInputError ? error.status : 400;
    const message = error instanceof WorkflowInputError ? error.message : 'Invalid JSON request.';
    return {
      body: null,
      response: NextResponse.json({ ok: false, error: `${label}: ${message}` }, {
        status, headers: { 'Cache-Control': 'private, no-store' },
      }),
    };
  }
}
