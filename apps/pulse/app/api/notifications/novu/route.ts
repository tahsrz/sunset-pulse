import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import {
  getNovuNotificationSnapshot,
  triggerNovuNotification,
  type NovuTriggerInput,
} from '@/lib/notifications/novu';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const subscriberSchema = z.union([
  z.string().min(1).max(160),
  z.object({
    subscriberId: z.string().min(1).max(160),
    firstName: z.string().max(120).optional(),
    lastName: z.string().max(120).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(40).optional(),
    locale: z.string().max(24).optional(),
    timezone: z.string().max(80).optional(),
    data: z.record(z.unknown()).optional(),
  }),
]);

const triggerSchema = z.object({
  workflowId: z.string().min(1).max(120),
  to: z.union([subscriberSchema, z.array(subscriberSchema).min(1).max(100)]),
  payload: z.record(z.unknown()).optional(),
  overrides: z.record(z.unknown()).optional(),
  transactionId: z.string().max(180).optional(),
  actor: z.union([z.string(), z.record(z.unknown())]).optional(),
  tenant: z.union([z.string(), z.record(z.unknown())]).optional(),
  context: z.record(z.unknown()).optional(),
  source: z.enum(['lead_intelligence', 'order_ops', 'scheduling', 'manual', 'system']).optional(),
});

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  return successResponse({
    endpoint: '/api/notifications/novu',
    provider: 'novu',
    snapshot: getNovuNotificationSnapshot(),
    configured: Boolean(process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY),
    disabled: process.env.NOVU_NOTIFICATIONS_DISABLED === 'true',
  });
}

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = triggerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid Novu notification trigger.', 400, parsed.error.flatten());
    }

    const record = await triggerNovuNotification(parsed.data as NovuTriggerInput);
    return successResponse({
      endpoint: '/api/notifications/novu',
      provider: 'novu',
      record,
    }, {}, responseStatusFor(record.status));
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to trigger Novu notification.',
      400
    );
  }
}

function responseStatusFor(status: string) {
  if (status === 'sent' || status === 'queued_local') return 200;
  if (status === 'disabled') return 423;
  return 502;
}
