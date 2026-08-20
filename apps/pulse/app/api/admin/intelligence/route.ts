export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { getDefaultAgentId } from '@/lib/sites/agentConfig';
import { supabaseAdmin } from '@/lib/supabase';

const intelligenceUpdateSchema = z.object({
  intelligence: z.object({
    grill: z.object({
      name: z.string().trim().min(1).max(200),
      tagline: z.string().trim().min(1).max(500),
      coordinates: z.tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ]),
      address: z.string().trim().min(1).max(500),
      mapUrl: z.string().trim().url().max(2_000).optional(),
    }).strict(),
  }).strict(),
}).strict();

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('A valid JSON intelligence update is required.', 400);
  }

  const parsed = intelligenceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Invalid intelligence configuration.', 400, parsed.error.flatten());
  }

  const agentId = getDefaultAgentId();
  const { data, error } = await supabaseAdmin
    .from('site_config')
    .update({
      intelligence: parsed.data.intelligence,
      last_modified_by: 'Admin',
      updated_at: new Date().toISOString(),
    })
    .eq('agent_id', agentId)
    .select('agent_id')
    .maybeSingle();

  if (error) {
    return errorResponse('Failed to update intelligence configuration.', 500);
  }
  if (!data) {
    return errorResponse('The target site configuration was not found.', 404);
  }

  return successResponse({ agentId, updated: true });
}
