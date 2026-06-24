import { NextRequest } from 'next/server';
import { getJamieResponse } from '@/lib/ai/jamie';
import { errorResponse } from '@/lib/core/apiResponse';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import { executeJamieToolCalls, formatPropertySearchResult } from '@/lib/ai/jamieTools';

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
      return new Response("I can help summarize the property, compare the numbers, or draft the next step from the current listing.");
    }

    // Get Jamie response
    const response = await getJamieResponse(messages, propertyData, memoryContext, isDevMode);
    
    // 1. Handle Fallback/Error strings
    if (typeof response === 'string') {
      return new Response(response);
    }

    // 2. Handle Structured Tool Calls (Non-streaming)
    if (response && (response as any).tool_calls) {
      const toolResults = await executeJamieToolCalls((response as any).tool_calls);
      const firstSearchResult = toolResults.find((result: any) => result?.name === 'search_properties');
      const content = firstSearchResult
        ? `${(response as any).content}\n\n${formatPropertySearchResult((firstSearchResult as any).output)}`
        : (response as any).content;

      return new Response(JSON.stringify({
        ...response,
        content,
        tool_results: toolResults,
      }), {
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
