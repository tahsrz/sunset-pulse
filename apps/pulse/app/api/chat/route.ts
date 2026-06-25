import { NextRequest } from 'next/server';
import { getJamieResponse } from '@/lib/ai/jamie';
import { errorResponse } from '@/lib/core/apiResponse';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import { executeJamieToolCalls, formatPropertySearchResult } from '@/lib/ai/jamieTools';
import { recordTensorZeroJamieTurn } from '@/lib/tensorzero/jamieChat';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitToken = sessionUser?.userId || ip;

    // Rate Limiting 10 chat messages per minute
    const limitResponse = await applyApiRateLimit(rateLimitToken, 10);
    if (limitResponse) return limitResponse;

    const { messages, propertyData, isDevMode, memoryContext } = await req.json();
    const chatMessages = Array.isArray(messages) ? messages : [];
    
    const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    if (isMock) {
      const lastUserMsg = chatMessages?.filter((m: any) => m.role === 'user')?.slice(-1)[0];
      const text = lastUserMsg?.content || '';
      const content = text.toLowerCase().includes('maxxing')
        ? "Let's ROI-maxxing this property !! We are dynamically OPTIMIZING_YIELD."
        : 'I can help summarize the property, compare the numbers, or draft the next step from the current listing.';
      const tensorzero = recordTensorZeroJamieTurn({
        messages: chatMessages,
        propertyData,
        memoryContext,
        isDevMode,
        response: content,
        content
      });

      if (text.toLowerCase().includes('maxxing')) {
        return Response.json({ role: 'assistant', content, tensorzero });
      }
      return Response.json({ role: 'assistant', content, tensorzero });
    }

    // Get Jamie response
    const response = await getJamieResponse(chatMessages, propertyData, memoryContext, isDevMode);
    
    // 1. Handle Fallback/Error strings
    if (typeof response === 'string') {
      const tensorzero = recordTensorZeroJamieTurn({
        messages: chatMessages,
        propertyData,
        memoryContext,
        isDevMode,
        response,
        content: response
      });

      return Response.json({ role: 'assistant', content: response, tensorzero });
    }

    // 2. Handle Structured Tool Calls (Non-streaming)
    if (response && (response as any).tool_calls) {
      const toolResults = await executeJamieToolCalls((response as any).tool_calls);
      const firstSearchResult = toolResults.find((result: any) => result?.name === 'search_properties');
      const responseContent = typeof (response as any).content === 'string' ? (response as any).content : '';
      const content = firstSearchResult
        ? `${responseContent}\n\n${formatPropertySearchResult((firstSearchResult as any).output)}`
        : responseContent;
      const tensorzero = recordTensorZeroJamieTurn({
        messages: chatMessages,
        propertyData,
        memoryContext,
        isDevMode,
        response,
        content,
        toolResults
      });

      return new Response(JSON.stringify({
        ...response,
        content,
        tool_results: toolResults,
        tensorzero,
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Fallback for unexpected non-streaming responses.
    const fallbackContent = response && typeof response === 'object' && typeof (response as any).content === 'string'
      ? (response as any).content
      : '';
    const tensorzero = recordTensorZeroJamieTurn({
      messages: chatMessages,
      propertyData,
      memoryContext,
      isDevMode,
      response,
      content: fallbackContent
    });

    const body = response && typeof response === 'object'
      ? { ...response, tensorzero }
      : { role: 'assistant', content: fallbackContent, tensorzero };

    return new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return errorResponse('Chat session failed.', 500, error.message);
  }
}
