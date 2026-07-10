import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/core/apiResponse';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import { runTensorZeroJamieChat } from '@/lib/tensorzero/jamieBackbone';
import { getAgentIdFromInput } from '@/lib/sites/agentConfig';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitToken = sessionUser?.userId || ip;

    // Rate Limiting 10 chat messages per minute
    const limitResponse = await applyApiRateLimit(rateLimitToken, 10);
    if (limitResponse) return limitResponse;

    const body = await req.json();
    const { messages, propertyData, isDevMode, memoryContext } = body;
    const agentId = getAgentIdFromInput({ agentId: body.agentId });
    const result = await runTensorZeroJamieChat({
      messages,
      propertyData,
      memoryContext,
      isDevMode,
      agentId,
      isMock: process.env.NEXT_PUBLIC_MOCK_MODE === 'true',
    });

    return new Response(JSON.stringify(result.body), {
      headers: { 'Content-Type': 'application/json' },
      ...result.init,
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return errorResponse('Chat session failed.', 500, error.message);
  }
}
