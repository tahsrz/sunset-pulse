import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { compileCssVars } from '@/lib/cms/vibeService';
import { vibeDraftSchema } from '@/lib/cms/vibeSchema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ vibeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { vibeId } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  const vibe = await Vibe.findOne({ vibeId, tenantId }).select('vibeId title name slug status draftPayload').lean() as any;
  if (!vibe) return NextResponse.json({ error: 'Vibe not found.' }, { status: 404 });
  const draft = vibeDraftSchema.safeParse(vibe.draftPayload);
  if (!draft.success) return NextResponse.json({ error: 'Draft is not normalized for preview.', issues: draft.error.flatten() }, { status: 409 });
  return NextResponse.json({ vibe: { vibeId: vibe.vibeId, title: vibe.title || vibe.name, slug: vibe.slug, status: vibe.status }, preview: { snapshot: draft.data, cssVars: compileCssVars(draft.data), voiceConfig: draft.data.tokens.linguistic } });
}
