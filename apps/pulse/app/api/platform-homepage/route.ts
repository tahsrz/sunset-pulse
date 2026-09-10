import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/core/database';
import {
  isAuthResponse,
  operatorAuditUser,
  requireOperatorRouteAccess,
} from '@/lib/core/routeAuth';
import {
  disablePlatformHomepage,
  initializePlatformHomepage,
  publishPlatformHomepage,
  readPlatformHomepageEditor,
} from '@/lib/cms/pages/platformHomepageService';
import { getJamieGuideUrl } from '@/lib/sites/siteUrls';

export const dynamic = 'force-dynamic';
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('initialize') }).strict(),
  z
    .object({
      action: z.literal('publish'),
      expectedVersion: z.number().int().nonnegative(),
      expectedBindingVersion: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      action: z.literal('disable'),
      expectedBindingVersion: z.number().int().nonnegative(),
    })
    .strict(),
]);

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  try {
    await connectDB();
    return NextResponse.json(await readPlatformHomepageEditor(), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Homepage could not be loaded.' },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid homepage action.' },
      { status: 400 },
    );
  try {
    await connectDB();
    const actorId = operatorAuditUser(access).userId;
    if (parsed.data.action === 'initialize') {
      await initializePlatformHomepage({
        actorId,
        jamieUrl: getJamieGuideUrl({
          requestHost: request.headers.get('host'),
        }),
      });
    } else if (parsed.data.action === 'publish') {
      await publishPlatformHomepage({ ...parsed.data, actorId });
    } else {
      await disablePlatformHomepage({ ...parsed.data, actorId });
    }
    return NextResponse.json(await readPlatformHomepageEditor());
  } catch (error) {
    const conflict = error instanceof Error && /CONFLICT/.test(error.message);
    return NextResponse.json(
      {
        error: conflict
          ? 'Homepage changed elsewhere. Reload before publishing.'
          : 'Homepage action could not be completed.',
      },
      { status: conflict ? 409 : 400 },
    );
  }
}
