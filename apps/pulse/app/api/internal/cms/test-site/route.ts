import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { provisionDisposableCmsSite, revokeDisposableCmsSite } from '@/lib/sites/siteProvisioning';
import { readSiteConfig } from '@/lib/sites/siteConfigStore';
import { getLaunchKitSummary, normalizeLaunchKit } from '@/lib/sites/launchKit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const SEED_DEADLINE_MS = 25_000;

const inputSchema = z.object({
  runId: z.string().trim().regex(/^[a-z0-9-]{6,64}$/),
  ownerName: z.string().trim().min(1).max(120).default('CMS Verification'),
  email: z.string().trim().email(),
}).strict();

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();
  const startedAt = Date.now();
  if (process.env.CMS_TEST_SEED_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Test-site seeding is disabled.' }, { status: 404 });
  }

  const expectedToken = process.env.CMS_TEST_SEED_TOKEN?.trim();
  const suppliedToken = request.headers.get('x-cms-test-seed-token')?.trim();
  if (!expectedToken || !suppliedToken || suppliedToken !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const ownerEmail = process.env.CMS_TEST_SEED_OWNER_EMAIL?.trim().toLowerCase();
  const ownerUserId = process.env.CMS_TEST_SEED_OWNER_USER_ID?.trim();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid seed request.', details: parsed.error.flatten() }, { status: 400 });
  }
  if (!ownerEmail || !ownerUserId || parsed.data.email.toLowerCase() !== ownerEmail) {
    return NextResponse.json({ error: 'Seed owner is not authorized.' }, { status: 403 });
  }

  const agentId = `cms-verification-${parsed.data.runId}`;
  const existingRow = await readSiteConfig(agentId);
  if (existingRow) {
    const existingKit = normalizeLaunchKit(existingRow, agentId);
    if (existingKit.ownerId !== ownerUserId && existingKit.billingProfile.userId !== ownerUserId) {
      return NextResponse.json({ error: 'Existing seed site owner mismatch.' }, { status: 403 });
    }
    const existing = getLaunchKitSummary(existingKit);
    return NextResponse.json({
      siteId: existing.kit.agentId,
      agentId: existing.kit.agentId,
      publicUrl: existing.publicUrl,
      originalPointer: existing.kit.activeVibeRevisionId || null,
      created: false,
      savedStores: [],
      idempotent: true,
      elapsedMs: Date.now() - startedAt,
      correlationId,
    });
  }
  const provisionPromise = provisionDisposableCmsSite({ runId: parsed.data.runId, ownerName: parsed.data.ownerName, email: parsed.data.email, userId: ownerUserId });

  let result: Awaited<typeof provisionPromise>;
  try {
    result = await Promise.race([provisionPromise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('CMS seed deadline exceeded.')), SEED_DEADLINE_MS))]);
  } catch (error) {
    if (error instanceof Error && error.message === 'CMS seed deadline exceeded.') {
      const elapsedMs = Date.now() - startedAt;
      console.error('[CMS_TEST_SEED_TIMEOUT]', { correlationId, runId: parsed.data.runId, siteId: agentId, stage: 'provisioning', elapsedMs, reconciliationRequired: true });
      return NextResponse.json({ error: 'Seed operation timed out.', correlationId, runId: parsed.data.runId, siteId: agentId, stage: 'provisioning', elapsedMs, reconciliationRequired: true }, { status: 504 });
    }
    throw error;
  }

  return NextResponse.json({
    siteId: result.kit.agentId,
    agentId: result.kit.agentId,
    publicUrl: result.publicUrl,
    originalPointer: result.kit.activeVibeRevisionId || null,
    created: result.created,
    savedStores: result.savedStores,
    reconciliationRequired: result.savedStores.length < 2,
    elapsedMs: Date.now() - startedAt,
    correlationId,
  }, { status: result.created ? 201 : 200 });
}

export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  if (process.env.CMS_TEST_SEED_ENABLED !== 'true') return NextResponse.json({ error: 'Test-site inspection is disabled.' }, { status: 404 });
  const expectedToken = process.env.CMS_TEST_SEED_TOKEN?.trim();
  if (!expectedToken || request.headers.get('x-cms-test-seed-token')?.trim() !== expectedToken) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const ownerEmail = process.env.CMS_TEST_SEED_OWNER_EMAIL?.trim().toLowerCase();
  const ownerUserId = process.env.CMS_TEST_SEED_OWNER_USER_ID?.trim();
  const runId = request.nextUrl.searchParams.get('runId')?.trim() || '';
  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase() || '';
  if (!ownerEmail || !ownerUserId || email !== ownerEmail || !/^[a-z0-9-]{6,64}$/.test(runId)) return NextResponse.json({ error: 'Seed owner is not authorized.' }, { status: 403 });
  const siteId = `cms-verification-${runId}`;
  const row = await readSiteConfig(siteId);
  if (!row) return NextResponse.json({ error: 'Seed site not found.' }, { status: 404 });
  const kit = normalizeLaunchKit(row, siteId);
  if (kit.ownerId !== ownerUserId && kit.billingProfile.userId !== ownerUserId) return NextResponse.json({ error: 'Seed site owner mismatch.' }, { status: 403 });
  const summary = getLaunchKitSummary(kit);
  console.info('[CMS_TEST_SITE_INSPECT]', { correlationId, runId, siteId, status: kit.status });
  const hasSupabase = 'agent_id' in (row as Record<string, unknown>);
  const hasMongo = 'agentId' in (row as Record<string, unknown>);
  return NextResponse.json({
    runId,
    siteId,
    ownerUserId,
    ownerEmail,
    status: kit.status,
    publicUrl: summary.publicUrl,
    originalPointer: kit.activeVibeRevisionId || null,
    currentPointer: kit.activeVibeRevisionId || null,
    createdAt: null,
    updatedAt: null,
    expiresAt: kit.billingProfile.trialEndsAt || null,
    audits: (kit.provisioningAudit || []).filter((event) => event.action.startsWith('cms.test-site.')).map(({ id, action, occurredAt, status, source, actor, message, savedStores }) => ({ id, action, occurredAt, status, source, actor, message, savedStores })),
    stores: {
      present: true,
      selected: 'agent_id' in (row as Record<string, unknown>) ? 'supabase' : 'mongo',
      evidence: {
        supabase: hasSupabase,
        mongo: hasMongo,
      },
    },
    reconciliationRequired: !(hasSupabase && hasMongo),
    correlationId,
  });
}

export async function DELETE(request: NextRequest) {
  const correlationId = randomUUID();
  if (process.env.CMS_TEST_SEED_ENABLED !== 'true') return NextResponse.json({ error: 'Test-site seeding is disabled.' }, { status: 404 });
  const expectedToken = process.env.CMS_TEST_SEED_TOKEN?.trim();
  if (!expectedToken || request.headers.get('x-cms-test-seed-token')?.trim() !== expectedToken) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const parsed = inputSchema.pick({ runId: true, email: true }).safeParse({
    runId: request.nextUrl.searchParams.get('runId'),
    email: request.nextUrl.searchParams.get('email'),
  });
  if (!parsed.success) return NextResponse.json({ error: 'Valid runId and email are required.' }, { status: 400 });
  const ownerEmail = process.env.CMS_TEST_SEED_OWNER_EMAIL?.trim().toLowerCase();
  const ownerUserId = process.env.CMS_TEST_SEED_OWNER_USER_ID?.trim();
  if (!ownerEmail || !ownerUserId || parsed.data.email.toLowerCase() !== ownerEmail) return NextResponse.json({ error: 'Seed owner is not authorized.' }, { status: 403 });
  const agentId = `cms-verification-${parsed.data.runId}`;
  const existingRow = await readSiteConfig(agentId);
  if (existingRow) {
    const existing = normalizeLaunchKit(existingRow, agentId);
    if (existing.status === 'suspended' && existing.billingProfile.billingStatus === 'canceled') {
      return NextResponse.json({ siteId: agentId, status: existing.status, revoked: true, idempotent: true, correlationId });
    }
  }
  const result = await revokeDisposableCmsSite({ runId: parsed.data.runId, email: parsed.data.email, userId: ownerUserId });
  if (!result) return NextResponse.json({ error: 'Seed site not found.' }, { status: 404 });
  return NextResponse.json({ siteId: result.kit.agentId, status: result.kit.status, revoked: true, correlationId, savedStores: result.savedStores });
}
