export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { z } from 'zod';

export async function GET() {
  try {
    await connectDB();
    const vibes = await Vibe.find({}).lean();
    return NextResponse.json({ vibes });
  } catch (error) {
    console.error('Vibe Dictionary GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch vibe dictionary.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireOperatorRouteAccess(req as any);
    if (isAuthResponse(access)) return access;

    await connectDB();
    const body = await vibeWriteSchema.parseAsync(await req.json());
    const actor = operatorAuditUser(access);
    const now = new Date();
    const vibe = await Vibe.findOneAndUpdate(
      { vibeId: body.vibeId },
      { $set: {
        name: body.name,
        title: body.title || body.name,
        description: body.description || '',
        linguisticLogic: body.linguisticLogic || {},
        visualParameters: body.visualParameters || {},
        sourceVideoPath: body.sourceVideoPath || '',
        metadata: body.metadata || {},
        updatedBy: actor.userId,
        updatedAt: now,
      }, $setOnInsert: {
        vibeId: body.vibeId,
        tenantId: 'default',
        status: 'draft',
        authorId: actor.userId,
        createdAt: now,
      } },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, vibe });
  } catch (error) {
    console.error('Vibe Dictionary POST Error:', error);
    return NextResponse.json({ error: 'Failed to update vibe dictionary.' }, { status: 500 });
  }
}

const vibeWriteSchema = z.object({
  vibeId: z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(10_000).optional(),
  linguisticLogic: z.object({
    tone: z.string().trim().max(120).optional(),
    pacing: z.string().trim().max(120).optional(),
    vocabulary: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
  }).strict().optional(),
  visualParameters: z.object({
    meshColor: z.string().trim().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
    bloomIntensity: z.number().min(0).max(10).optional(),
    glitchFrequency: z.number().min(0).max(10).optional(),
    particleDensity: z.number().min(0).max(10).optional(),
  }).strict().optional(),
  sourceVideoPath: z.string().trim().max(2_000).optional(),
  metadata: z.record(z.string().max(500)).optional(),
}).strict();
