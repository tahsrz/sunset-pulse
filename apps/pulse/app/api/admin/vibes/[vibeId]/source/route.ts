import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { operatorAuditUser } from '@/lib/core/routeAuth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ vibeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { vibeId } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  const vibe = await Vibe.findOne({ vibeId, tenantId }).select('vibeId source sourceVideoPath migrationMetadata').lean() as any;
  if (!vibe) return NextResponse.json({ error: 'Vibe not found.' }, { status: 404 });
  return NextResponse.json({ vibeId, source: vibe.source || { kind: vibe.sourceVideoPath ? 'extracted' : 'manual', path: vibe.sourceVideoPath || null }, migrationMetadata: vibe.migrationMetadata || {} });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ vibeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { vibeId } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  const parsed = sourceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid source metadata.', issues: parsed.error.flatten() }, { status: 400 });
  await connectDB();
  const updated = await Vibe.findOneAndUpdate({ vibeId, tenantId }, { $set: { source: parsed.data, updatedBy: operatorAuditUser(access).userId, updatedAt: new Date() } }, { new: true }).select('vibeId source updatedBy updatedAt').lean();
  if (!updated) return NextResponse.json({ error: 'Vibe not found.' }, { status: 404 });
  return NextResponse.json({ vibe: updated });
}

const sourceSchema = z.object({
  kind: z.enum(['extracted', 'manual']),
  mediaId: z.string().trim().max(160).optional(),
  url: z.string().url().optional(),
  attribution: z.string().trim().max(1_000).default(''),
  ownershipNote: z.string().trim().max(1_000).default(''),
  extractedAt: z.string().datetime().optional(),
  method: z.string().trim().max(120).optional(),
}).strict();
