import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/core/database';
import { archiveNormalizedTaxonomyGroup, createNormalizedTaxonomyGroup, restoreNormalizedTaxonomyGroup, updateNormalizedTaxonomyGroupLabel } from '@/lib/cms/taxonomyRepository';

const createGroupSchema = z.object({
  tenantId: z.string().trim().min(1).max(80).default('default'),
  slug: z.string().trim().regex(/^[a-z][a-z0-9-]*$/),
  label: z.string().trim().min(1).max(80),
  hierarchical: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  if (process.env.VIBE_TAXONOMY_MANAGE_TERMS !== '1' || process.env.VIBE_TAXONOMY_NORMALIZED_READ !== '1') {
    return NextResponse.json({ error: 'Taxonomy management is disabled.' }, { status: 404 });
  }
  const parsed = createGroupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Use a valid lowercase slug and label.' }, { status: 400 });
  await connectDB();
  try {
    const group = await createNormalizedTaxonomyGroup(parsed.data);
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'TAXONOMY_EXISTS') return NextResponse.json({ error: 'A taxonomy with this slug already exists.' }, { status: 409 });
    return NextResponse.json({ error: 'Unable to create taxonomy.' }, { status: 500 });
  }
}

const updateGroupSchema = createGroupSchema.pick({ tenantId: true, slug: true, label: true });

export async function PATCH(request: NextRequest) {
  if (process.env.VIBE_TAXONOMY_MANAGE_TERMS !== '1' || process.env.VIBE_TAXONOMY_NORMALIZED_READ !== '1') {
    return NextResponse.json({ error: 'Taxonomy management is disabled.' }, { status: 404 });
  }
  const parsed = updateGroupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Use a valid lowercase slug and label.' }, { status: 400 });
  await connectDB();
  try {
    const group = await updateNormalizedTaxonomyGroupLabel(parsed.data);
    return NextResponse.json({ group });
  } catch (error) {
    if (error instanceof Error && error.message === 'TAXONOMY_NOT_FOUND') return NextResponse.json({ error: 'Taxonomy not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Unable to update taxonomy.' }, { status: 500 });
  }
}

const identifyGroupSchema = createGroupSchema.pick({ tenantId: true, slug: true });

export async function DELETE(request: NextRequest) {
  if (process.env.VIBE_TAXONOMY_MANAGE_TERMS !== '1' || process.env.VIBE_TAXONOMY_NORMALIZED_READ !== '1') return NextResponse.json({ error: 'Taxonomy management is disabled.' }, { status: 404 });
  const parsed = identifyGroupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Use a valid lowercase slug.' }, { status: 400 });
  await connectDB();
  try {
    return NextResponse.json({ group: await archiveNormalizedTaxonomyGroup(parsed.data) });
  } catch (error) {
    if (error instanceof Error && error.message === 'TAXONOMY_NOT_EMPTY') return NextResponse.json({ error: 'Archive every term in this taxonomy before archiving the taxonomy.' }, { status: 409 });
    if (error instanceof Error && error.message === 'TAXONOMY_NOT_FOUND') return NextResponse.json({ error: 'Taxonomy not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Unable to archive taxonomy.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (process.env.VIBE_TAXONOMY_MANAGE_TERMS !== '1' || process.env.VIBE_TAXONOMY_NORMALIZED_READ !== '1') return NextResponse.json({ error: 'Taxonomy management is disabled.' }, { status: 404 });
  const parsed = identifyGroupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Use a valid lowercase slug.' }, { status: 400 });
  await connectDB();
  try {
    return NextResponse.json({ group: await restoreNormalizedTaxonomyGroup(parsed.data) });
  } catch (error) {
    if (error instanceof Error && error.message === 'TAXONOMY_NOT_FOUND') return NextResponse.json({ error: 'Archived taxonomy not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Unable to restore taxonomy.' }, { status: 500 });
  }
}
