import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { archiveShortlistEntry, listShortlistEntries, saveShortlistEntry } from '@/lib/property-sprints/shortlist.server';

const uuid = z.string().uuid();
const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), expectedRevision: z.number().int().positive().nullable().default(null), entry: z.record(z.unknown()) }),
  z.object({ action: z.literal('archive'), id: uuid, expectedRevision: z.number().int().positive() }),
]);

export async function GET(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  try { return NextResponse.json({ ok: true, entries: await listShortlistEntries(access.user.id) }); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to load shortlist.' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid property shortlist request.', details: parsed.error.flatten() }, { status: 400 });
  try {
    if (parsed.data.action === 'save') return NextResponse.json({ ok: true, entry: await saveShortlistEntry(access.user.id, parsed.data.entry, parsed.data.expectedRevision) });
    return NextResponse.json({ ok: true, entry: await archiveShortlistEntry(access.user.id, parsed.data.id, parsed.data.expectedRevision) });
  } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to update shortlist.' }, { status: 409 }); }
}
