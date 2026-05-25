import { NextRequest } from 'next/server';
import { getJamieResponse } from '@/lib/ai/jamie';
import { errorResponse } from '@/lib/core/apiResponse';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitToken = sessionUser?.userId || ip;

    // Rate Limiting 10 chat messages per minute
    const limitResponse = await applyApiRateLimit(rateLimitToken, 10);
    if (limitResponse) return limitResponse;

    const { messages, propertyData, isDevMode, memoryContext } = await req.json();
    
    const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    if (isMock) {
      const lastUserMsg = messages?.filter((m: any) => m.role === 'user')?.slice(-1)[0];
      const text = lastUserMsg?.content || '';
      if (text.toLowerCase().includes('maxxing')) {
        return new Response("Let's ROI-maxxing this property !! We are dynamically OPTIMIZING_YIELD.");
      }
      return new Response("Hello! I am Jamie, your AI real estate assistant. I am running in local mock mode.");
    }

    // Get Jamie response
    const response = await getJamieResponse(messages, propertyData, memoryContext, isDevMode);
    
    // 1. Handle Fallback/Error strings
    if (typeof response === 'string') {
      return new Response(response);
    }

    // 2. Handle Structured Tool Calls (Non-streaming)
    if (response && (response as any).tool_calls) {
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Fallback for unexpected non-streaming responses.
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return errorResponse('Chat session failed.', 500, error.message);
  }
}
