import { getJamieResponse } from '@/lib/ai/jamie';
import { executeJamieToolCalls, formatPropertySearchResult } from '@/lib/ai/jamieTools';
import { recordTensorZeroJamieTurn } from '@/lib/tensorzero/jamieChat';

type JamieBackboneInput = {
  messages: any[];
  propertyData?: unknown;
  memoryContext?: unknown;
  isDevMode?: boolean;
  isMock?: boolean;
};

type JamieBackboneResult = {
  body: Record<string, unknown>;
  init?: ResponseInit;
};

export async function runTensorZeroJamieChat(input: JamieBackboneInput): Promise<JamieBackboneResult> {
  const chatMessages = Array.isArray(input.messages) ? input.messages : [];
  const isDevMode = Boolean(input.isDevMode);

  if (input.isMock) {
    const lastUserMsg = chatMessages.filter((message: any) => message?.role === 'user').slice(-1)[0];
    const text = String(lastUserMsg?.content || '');
    const content = text.toLowerCase().includes('maxxing')
      ? "Let's ROI-maxxing this property !! We are dynamically OPTIMIZING_YIELD."
      : 'I can help summarize the property, compare the numbers, or draft the next step from the current listing.';
    const tensorzero = recordBackboneTurn({
      messages: chatMessages,
      propertyData: input.propertyData,
      memoryContext: input.memoryContext,
      isDevMode,
      response: content,
      content,
    });

    return { body: { role: 'assistant', content, tensorzero } };
  }

  const response = await getJamieResponse(chatMessages, input.propertyData, input.memoryContext, isDevMode);

  if (typeof response === 'string') {
    const tensorzero = recordBackboneTurn({
      messages: chatMessages,
      propertyData: input.propertyData,
      memoryContext: input.memoryContext,
      isDevMode,
      response,
      content: response,
    });

    return { body: { role: 'assistant', content: response, tensorzero } };
  }

  if (response && (response as any).tool_calls) {
    const toolResults = await executeJamieToolCalls((response as any).tool_calls);
    const firstSearchResult = toolResults.find((result: any) => result?.name === 'search_properties');
    const responseContent = typeof (response as any).content === 'string' ? (response as any).content : '';
    const content = firstSearchResult
      ? `${responseContent}\n\n${formatPropertySearchResult((firstSearchResult as any).output)}`
      : responseContent;
    const tensorzero = recordBackboneTurn({
      messages: chatMessages,
      propertyData: input.propertyData,
      memoryContext: input.memoryContext,
      isDevMode,
      response,
      content,
      toolResults,
    });

    return {
      body: {
        ...(response as Record<string, unknown>),
        content,
        tool_results: toolResults,
        tensorzero,
      },
      init: { headers: { 'Content-Type': 'application/json' } },
    };
  }

  const fallbackContent = response && typeof response === 'object' && typeof (response as any).content === 'string'
    ? (response as any).content
    : '';
  const tensorzero = recordBackboneTurn({
    messages: chatMessages,
    propertyData: input.propertyData,
    memoryContext: input.memoryContext,
    isDevMode,
    response,
    content: fallbackContent,
  });

  const body = response && typeof response === 'object'
    ? { ...(response as Record<string, unknown>), tensorzero }
    : { role: 'assistant', content: fallbackContent, tensorzero };

  return { body, init: { headers: { 'Content-Type': 'application/json' } } };
}

function recordBackboneTurn(input: Parameters<typeof recordTensorZeroJamieTurn>[0]) {
  const trace = recordTensorZeroJamieTurn(input);
  return {
    ...trace,
    backbone: {
      status: 'active_local_backbone',
      functionName: 'jamie_chat',
      gatewayConfigured: trace.gateway?.status === 'configured',
      route: trace.gateway?.status === 'configured' ? 'tensorzero_gateway_ready' : 'local_groq_direct',
    },
  };
}
