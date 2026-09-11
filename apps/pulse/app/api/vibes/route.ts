import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { operatorAuditUser } from '@/lib/core/routeAuth';
import { z } from 'zod';
import { createDefaultVibeDraft } from '@/lib/cms/vibeSchema';
import VibeAuditEvent from '@/models/VibeAuditEvent';
import mongoose from 'mongoose';
import { applyVibePreset } from '@/lib/cms/vibePresets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  await connectDB();
  const params = request.nextUrl.searchParams;
  const tenantId = params.get('tenantId')?.trim() || 'default';
  const status = params.get('status')?.trim();
  const search = params.get('search')?.trim();
  const sort = params.get('sort')?.trim();
  const direction = params.get('direction') === 'asc' ? 1 : -1;
  const page = Math.max(1, Number(params.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize') || 25)));
  const filter: Record<string, unknown> = { tenantId };
  if (status) filter.status = status;
  if (search) filter.$or = [
    { title: { $regex: escapeRegex(search), $options: 'i' } },
    { slug: { $regex: escapeRegex(search), $options: 'i' } },
  ];
  const sortField = sort === 'title' || sort === 'status' || sort === 'updatedAt' ? sort : 'updatedAt';

  const [vibes, total, statusUsage] = await Promise.all([
    Vibe.find(filter)
      .select('vibeId title name slug status tenantId publishedRevisionId authorId updatedBy updatedAt createdAt taxonomyTermIds')
      .sort({ [sortField]: direction, vibeId: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Vibe.countDocuments(filter),
    Vibe.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts = Object.fromEntries(statusUsage.map(({ _id, count }: { _id: string; count: number }) => [_id || 'draft', count]));
  return NextResponse.json({ vibes, page, pageSize, total, totalPages: Math.ceil(total / pageSize), statusCounts });
}

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Title and slug are required.', issues: parsed.error.flatten() }, { status: 400 });
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  try {
    const actor = operatorAuditUser(access).userId;
    const session = await mongoose.startSession();
    let vibe;
    try {
      await session.withTransaction(async () => {
        const created = await Vibe.create([{
      vibeId: `${tenantId}-${parsed.data.slug}`,
      tenantId,
      title: parsed.data.title,
      name: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description || '',
      status: 'draft',
      authorId: actor,
      updatedBy: actor,
      currentDraftVersion: 0,
      draftPayload: createPresetDraft(parsed.data),
        }], { session });
        vibe = created[0];
        await VibeAuditEvent.create([{ vibeId: vibe.vibeId, tenantId, action: 'created', actorId: actor }], { session });
      });
    } finally { await session.endSession(); }
    return NextResponse.json({ vibe }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) return NextResponse.json({ error: 'A vibe with that slug already exists.' }, { status: 409 });
    return NextResponse.json({ error: 'Vibe could not be created.' }, { status: 400 });
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(10_000).optional(),
  preset: z.enum(['editorial', 'market-intelligence']).optional(),
}).strict();

function createPresetDraft(input: z.infer<typeof createSchema>) {
  return applyVibePreset(createDefaultVibeDraft(input), input.preset);
}
