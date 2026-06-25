import { NextResponse } from 'next/server';
import { getTensorZeroJamieChatSnapshot } from '@/lib/tensorzero/jamieChat';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    data: {
      framework: 'tensorzero',
      purpose: 'JamieChat turn ledger for TensorZero routing, evaluation, and future prompt or model experiments.',
      functionName: 'jamie_chat',
      metrics: [
        'jamie_response_quality',
        'jamie_tool_success',
        'jamie_property_grounding',
        'jamie_conversation_safety'
      ],
      snapshot: getTensorZeroJamieChatSnapshot()
    }
  });
}
