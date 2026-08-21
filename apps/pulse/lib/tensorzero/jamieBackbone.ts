import { buildJamiePulseQuery, getJamieResponse } from '@/lib/ai/jamie';
import { executeJamieToolCalls, formatPropertySearchResult } from '@/lib/ai/jamieTools';
import { recordTensorZeroJamieTurn } from '@/lib/tensorzero/jamieChat';
import {
  buildJamieKnowledgeFallback,
  retrieveJamieKnowledge,
  shouldUseJamieKnowledgeFallback,
} from '@/lib/ai/jamieKnowledgeFallback';
import { chooseJamieModelRoute } from '@/lib/ai/jamieModelRouting';

type JamieBackboneInput = {
  messages: any[];
  propertyData?: unknown;
  memoryContext?: unknown;
  isDevMode?: boolean;
  isMock?: boolean;
  agentId?: string | null;
  personaMode?: 'general' | 'guarded_real_estate';
};

type JamieBackboneResult = {
  body: Record<string, unknown>;
  init?: ResponseInit;
};

export async function runTensorZeroJamieChat(input: JamieBackboneInput): Promise<JamieBackboneResult> {
  const chatMessages = Array.isArray(input.messages)
    ? input.messages
      .filter((message: any) => message?.role === 'user' || message?.role === 'assistant')
      .map((message: any) => ({ role: message.role, content: String(message.content || '').slice(0, 20_000) }))
    : [];
  const isDevMode = Boolean(input.isDevMode);
  const lastUserMessage = chatMessages.filter((message: any) => message?.role === 'user').at(-1);

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

  const knowledgeQuery = buildJamiePulseQuery(String(lastUserMessage?.content || ''), input.propertyData);
  const knowledge = await retrieveJamieKnowledge(knowledgeQuery);
  const modelRoute = chooseJamieModelRoute(String(lastUserMessage?.content || ''), knowledge);
  const response = await getJamieResponse(chatMessages, input.propertyData, input.memoryContext, isDevMode, {
    agentId: input.agentId,
    personaMode: input.personaMode,
    knowledgeContext: knowledge,
    modelTier: modelRoute.tier,
  });

  if (typeof response === 'string') {
    const content = shouldUseJamieKnowledgeFallback(response) ? buildJamieKnowledgeFallback(knowledge) : response;
    const tensorzero = recordBackboneTurn({
      messages: chatMessages,
      propertyData: input.propertyData,
      memoryContext: input.memoryContext,
      isDevMode,
      response,
      content,
    });

    return { body: { role: 'assistant', content, knowledge_sources: knowledge.evidence, model_routing: modelRoute, tensorzero } };
  }

  if (response && (response as any).tool_calls) {
    const toolCalls = Array.isArray((response as any).tool_calls) ? (response as any).tool_calls : [];
    const toolResults = await executeJamieToolCalls(toolCalls);
    const firstSearchResult = toolResults.find((result: any) => result?.name === 'search_properties');
    const responseContent = typeof (response as any).content === 'string' ? (response as any).content : '';
    const toolContent = firstSearchResult
      ? [responseContent, formatPropertySearchResult((firstSearchResult as any).output)].filter(Boolean).join('\n\n')
      : responseContent.trim() || unavailableToolReply(toolCalls);
    const content = shouldUseJamieKnowledgeFallback(toolContent) ? buildJamieKnowledgeFallback(knowledge) : toolContent;
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
        knowledge_sources: knowledge.evidence,
        model_routing: modelRoute,
        tensorzero,
      },
      init: { headers: { 'Content-Type': 'application/json' } },
    };
  }

  const rawFallbackContent = response && typeof response === 'object' && typeof (response as any).content === 'string'
    ? (response as any).content
    : '';
  const fallbackContent = shouldUseJamieKnowledgeFallback(rawFallbackContent)
    ? buildJamieKnowledgeFallback(knowledge)
    : rawFallbackContent;
  const tensorzero = recordBackboneTurn({
    messages: chatMessages,
    propertyData: input.propertyData,
    memoryContext: input.memoryContext,
    isDevMode,
    response,
    content: fallbackContent,
  });

  const body = response && typeof response === 'object'
    ? { ...(response as Record<string, unknown>), content: fallbackContent, knowledge_sources: knowledge.evidence, model_routing: modelRoute, tensorzero }
    : { role: 'assistant', content: fallbackContent, knowledge_sources: knowledge.evidence, model_routing: modelRoute, tensorzero };

  return { body, init: { headers: { 'Content-Type': 'application/json' } } };
}

function unavailableToolReply(toolCalls: any[]) {
  const requestedSearch = toolCalls.some((call) => call?.function?.name === 'search_properties');
  if (requestedSearch) {
    return 'I could not complete the property search. Please check the location or search criteria and try again.';
  }

  return 'I cannot run that lookup with the tools currently available. I can search properties, summarize details you provide, or draft a follow-up.';
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
