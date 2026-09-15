import { NextRequest, NextResponse } from 'next/server';
import { AttentionRequestSchema } from '@/lib/agent-workspace/attentionDecisionSchema';
import { assessAgentAttention, isSemanticAttentionConfigured } from '@/lib/agent-workspace/assessAgentAttention.server';
import { requireOperatorRouteAccess, isAuthResponse } from '@/lib/core/routeAuth';
import { applyPublicApiRateLimit } from '@/lib/core/publicApiRateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON attention request.' }, { status: 400 }); }
  const parsed = AttentionRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid bounded attention request.', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const access = await requireOperatorRouteAccess(new NextRequest(request.url, { headers: request.headers }));
  if (isAuthResponse(access)) return access;
  // Paid calls require a shared limit even in development. Missing distributed
  // infrastructure must never silently enable unlimited provider requests.
  const limited = await applyPublicApiRateLimit(request, 'agent-workspace-attention', 6, 60, { requireDistributed: isSemanticAttentionConfigured() });
  if (limited) return limited;
  try {
    // The provider owns a 3.5s abort signal; don't race an uncancelled timer.
    const result = await assessAgentAttention(parsed.data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Attention assessment unavailable.', mode: 'rules-based-unavailable' }, { status: 503 });
  }
}
