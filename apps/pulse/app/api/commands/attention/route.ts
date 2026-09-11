import { NextResponse } from 'next/server';
import { AttentionRequestSchema } from '@/lib/agent-workspace/attentionDecisionSchema';
import { assessAgentAttention } from '@/lib/agent-workspace/assessAgentAttention.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON attention request.' }, { status: 400 }); }
  const parsed = AttentionRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid bounded attention request.', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  try {
    const result = await Promise.race([
      assessAgentAttention(parsed.data),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Attention assessment timed out.')), 4_000)),
    ]);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Attention assessment unavailable.', mode: 'rules-based-unavailable' }, { status: 503 });
  }
}

