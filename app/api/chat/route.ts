import { NextRequest } from 'next/server';
import { getJamieResponse } from '@/lib/ai/jamie';
import { errorResponse } from '@/lib/core/apiResponse';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import { OpenAIStream, StreamingTextResponse } from 'ai';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitToken = sessionUser?.userId || ip;

    // Rate Limiting 10 chat messages per minute
    const limitResponse = await applyApiRateLimit(rateLimitToken, 10);
    if (limitResponse) return limitResponse;

    const { messages, propertyData, isDevMode, memoryContext } = await req.json();
    
    // Get Jamie response
    const streamResponse = await getJamieResponse(messages, propertyData, memoryContext, isDevMode);
    
    // If it's a string (fallback error message), return it as a simple response
    if (typeof streamResponse === 'string') {
      return new Response(streamResponse);
    }

    // Convert the Groq stream to an AI SDK compatible stream
    const stream = OpenAIStream(streamResponse as any);

    // Return the streaming response
    return new StreamingTextResponse(stream);

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return errorResponse('Chat session failed.', 500, error.message);
  }
}
