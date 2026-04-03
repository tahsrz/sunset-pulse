import { OpenAIStream, StreamingTextResponse } from 'ai';
import { getJamieResponse } from '@/lib/ai/jamie';
import { errorResponse } from '@/lib/core/apiResponse';

export async function POST(req) {
  try {
    const { messages, propertyData, isDevMode, memoryContext } = await req.json();
    
    // Extract the last user message
    const lastMessage = messages[messages.length - 1]?.content || "";

    // Get Jamie's response using the consolidated logic
    // We pass memoryContext to help Jamie recognize the user
    const responseText = await getJamieResponse(lastMessage, propertyData, memoryContext, isDevMode);

    // Since getJamieResponse currently returns a string, we wrap it in a stream format 
    // for compatibility with the frontend's useChat, or just return it directly if eventually refactor Jamie to stream.
    // To support streaming, Jamie would need to return a stream.
    
    return new Response(responseText);

  } catch (error) {
    console.error('Chat API Error:', error);
    return errorResponse('Chat session failed.', 500, error.message);
  }
}
