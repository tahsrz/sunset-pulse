import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { reconcileDisposableCmsSite } from '@/lib/sites/siteProvisioning';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const inputSchema = z.object({ runId: z.string().trim().regex(/^[a-z0-9-]{6,64}$/), email: z.string().trim().email() }).strict();

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();
  const startedAt = Date.now();
  if (process.env.CMS_TEST_SEED_ENABLED !== 'true') return NextResponse.json({ error: 'Test-site reconciliation is disabled.' }, { status: 404 });
  const expectedToken = process.env.CMS_TEST_SEED_TOKEN?.trim();
  if (!expectedToken || request.headers.get('x-cms-test-seed-token')?.trim() !== expectedToken) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const ownerEmail = process.env.CMS_TEST_SEED_OWNER_EMAIL?.trim().toLowerCase();
  const ownerUserId = process.env.CMS_TEST_SEED_OWNER_USER_ID?.trim();
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid reconciliation request.' }, { status: 400 });
  if (!ownerEmail || !ownerUserId || parsed.data.email.toLowerCase() !== ownerEmail) return NextResponse.json({ error: 'Seed owner is not authorized.' }, { status: 403 });
  try {
    const result = await reconcileDisposableCmsSite({ runId: parsed.data.runId, userId: ownerUserId });
    if (!result) return NextResponse.json({ error: 'Seed site not found.', correlationId, elapsedMs: Date.now() - startedAt }, { status: 404 });
    return NextResponse.json({ ...result, correlationId, elapsedMs: Date.now() - startedAt });
  } catch (error) {
    const errorClass = error instanceof Error ? error.name : 'UnknownError';
    console.error('[CMS_TEST_SITE_RECONCILE_FAILED]', { correlationId, runId: parsed.data.runId, stage: 'reconciliation', elapsedMs: Date.now() - startedAt, errorClass });
    return NextResponse.json({ error: 'Reconciliation failed.', correlationId, elapsedMs: Date.now() - startedAt, errorClass }, { status: 500 });
  }
}
