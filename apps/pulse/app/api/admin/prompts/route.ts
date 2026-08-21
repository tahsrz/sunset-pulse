export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { 
  JAMIE_SYSTEM_PROMPT,
  MARKET_SCOUT_SYSTEM_PROMPT,
  ASSET_ANALYST_SYSTEM_PROMPT,
  MAKIEL_SYSTEM_PROMPT,
  GADRAEL_SYSTEM_PROMPT,
  DURANDIEL_SYSTEM_PROMPT,
  TELARIEL_SYSTEM_PROMPT,
  REZAEL_SYSTEM_PROMPT,
  ZAKARIEL_SYSTEM_PROMPT,
  PHOENIX_SYSTEM_PROMPT,
  REAPER_SYSTEM_PROMPT
} from '@/lib/ai/prompts';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { getDefaultAgentId } from '@/lib/sites/agentConfig';
import {
  PromptConfigStoreUnavailableError,
  readPromptConfig,
  savePromptConfig,
} from '@/lib/sites/promptConfigStore';
import { z } from 'zod';

const promptUpdateSchema = z.object({
  jamieSystemPrompt: z.string().min(1).max(40_000),
  abidanPrompts: z.record(z.string().max(40_000)).default({}),
  modelMatrix: z.record(z.string().max(200)).default({}),
  operationalSettings: z.record(z.union([z.string().max(200), z.number(), z.boolean()])).default({}),
}).strict();

export async function GET(req: NextRequest) {
  try {
    const access = await requireOperatorRouteAccess(req);
    if (isAuthResponse(access)) return access;
    const agentId = getDefaultAgentId();
    const config = await readPromptConfig(agentId);
    return successResponse(toPromptResponse(config));
  } catch (error: any) {
    if (error instanceof PromptConfigStoreUnavailableError) {
      return errorResponse(error.message, 503);
    }
    return errorResponse('Failed to fetch prompts', 500, error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireOperatorRouteAccess(req);
    if (isAuthResponse(access)) return access;
    const parsed = promptUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return errorResponse('Invalid prompt configuration.', 400, parsed.error.flatten());
    const { jamieSystemPrompt, abidanPrompts, modelMatrix, operationalSettings } = parsed.data;
    const agentId = getDefaultAgentId();
    const savedStores = await savePromptConfig(agentId, {
      jamieSystemPrompt,
      abidanPrompts,
      modelMatrix,
      operationalSettings,
    });

    return successResponse({ success: true, savedStores });
  } catch (error: any) {
    if (error instanceof PromptConfigStoreUnavailableError) {
      return errorResponse(error.message, 503);
    }
    return errorResponse('Failed to update prompts', 500, error.message);
  }
}

function toPromptResponse(config: any) {
  return {
    jamieSystemPrompt: config?.jamieSystemPrompt || JAMIE_SYSTEM_PROMPT,
    abidanPrompts: {
      MARKET_SCOUT: config?.abidanPrompts?.MARKET_SCOUT || MARKET_SCOUT_SYSTEM_PROMPT,
      ASSET_ANALYST: config?.abidanPrompts?.ASSET_ANALYST || ASSET_ANALYST_SYSTEM_PROMPT,
      MAKIEL: config?.abidanPrompts?.MAKIEL || MAKIEL_SYSTEM_PROMPT,
      GADRAEL: config?.abidanPrompts?.GADRAEL || GADRAEL_SYSTEM_PROMPT,
      DURANDIEL: config?.abidanPrompts?.DURANDIEL || DURANDIEL_SYSTEM_PROMPT,
      TELARIEL: config?.abidanPrompts?.TELARIEL || TELARIEL_SYSTEM_PROMPT,
      REZAEL: config?.abidanPrompts?.REZAEL || REZAEL_SYSTEM_PROMPT,
      ZAKARIEL: config?.abidanPrompts?.ZAKARIEL || ZAKARIEL_SYSTEM_PROMPT,
      PHOENIX: config?.abidanPrompts?.PHOENIX || PHOENIX_SYSTEM_PROMPT,
      REAPER: config?.abidanPrompts?.REAPER || REAPER_SYSTEM_PROMPT,
    },
    modelMatrix: config?.modelMatrix || {
      primaryModel: 'openai/gpt-oss-120b',
      reconModel: 'meta-llama/llama-3.1-405b-instruct:free',
      miniModel: 'google/gemma-2-9b-it:free',
    },
    operationalSettings: config?.operationalSettings || {
      minJudges: 1,
      maxJudges: 4,
      personalityPreset: 'Aggressive',
    },
  };
}
