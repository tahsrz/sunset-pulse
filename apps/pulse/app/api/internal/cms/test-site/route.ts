import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { provisionPaidAgentSite, suspendProvisionedAgentSite } from '@/lib/sites/siteProvisioning';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const inputSchema = z.object({
  runId: z.string().trim().regex(/^[a-z0-9-]{6,64}$/),
  ownerName: z.string().trim().min(1).max(120).default('CMS Verification'),
  email: z.string().trim().email(),
}).strict();

export async function POST(request: NextRequest) {
  if (process.env.CMS_TEST_SEED_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Test-site seeding is disabled.' }, { status: 404 });
  }

  const expectedToken = process.env.CMS_TEST_SEED_TOKEN?.trim();
  const suppliedToken = request.headers.get('x-cms-test-seed-token')?.trim();
  if (!expectedToken || !suppliedToken || suppliedToken !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

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

  const agentId = `cms-verification-${parsed.data.runId}`;
  const trialEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const result = await provisionPaidAgentSite({
    agentId,
    ownerName: parsed.data.ownerName,
    email: parsed.data.email,
    subscriptionTier: 'starter',
    billingStatus: 'trialing',
    trialEndsAt,
    source: `cms-test-seed:${parsed.data.runId}`,
  });

  return NextResponse.json({
    siteId: result.kit.agentId,
    agentId: result.kit.agentId,
    publicUrl: result.publicUrl,
    originalPointer: result.kit.activeVibeRevisionId || null,
    created: result.created,
    savedStores: result.savedStores,
  }, { status: result.created ? 201 : 200 });
}

export async function DELETE(request: NextRequest) {
  if (process.env.CMS_TEST_SEED_ENABLED !== 'true') return NextResponse.json({ error: 'Test-site seeding is disabled.' }, { status: 404 });
  const expectedToken = process.env.CMS_TEST_SEED_TOKEN?.trim();
  if (!expectedToken || request.headers.get('x-cms-test-seed-token')?.trim() !== expectedToken) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const parsed = inputSchema.pick({ runId: true, email: true }).safeParse({
    runId: request.nextUrl.searchParams.get('runId'),
    email: request.nextUrl.searchParams.get('email'),
  });
  if (!parsed.success) return NextResponse.json({ error: 'Valid runId and email are required.' }, { status: 400 });
  const result = await suspendProvisionedAgentSite({ agentId: `cms-verification-${parsed.data.runId}`, email: parsed.data.email, source: `cms-test-seed-revoke:${parsed.data.runId}` });
  if (!result) return NextResponse.json({ error: 'Seed site not found.' }, { status: 404 });
  return NextResponse.json({ siteId: result.kit.agentId, status: result.kit.status, revoked: true });
}
