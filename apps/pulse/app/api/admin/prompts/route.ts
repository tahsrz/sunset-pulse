export const dynamic = 'force-dynamic';
import connectDB from '@/lib/core/database';
import { NextRequest } from 'next/server';
import { SiteConfig } from '@/models/SiteConfig';
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
import { supabaseAdmin } from '@/lib/supabase';
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
    const { data: supabaseConfig, error: supabaseError } = await supabaseAdmin
      .from('site_config')
      .select('intelligence, model_matrix, operational_settings')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (supabaseError) {
      console.warn('[ADMIN_PROMPTS_SUPABASE_READ]', supabaseError.message);
    } else if (supabaseConfig) {
      return successResponse(toPromptResponse({
        jamieSystemPrompt: supabaseConfig.intelligence?.jamieSystemPrompt,
        abidanPrompts: supabaseConfig.intelligence?.abidanPrompts,
        modelMatrix: supabaseConfig.model_matrix,
        operationalSettings: supabaseConfig.operational_settings,
      }));
    }

    await connectDB();
    let config = await SiteConfig.findOne({ agentId });
    
    if (!config) {
      config = await SiteConfig.create({
        agentId,
        jamieSystemPrompt: JAMIE_SYSTEM_PROMPT,
        abidanPrompts: {
          MARKET_SCOUT: MARKET_SCOUT_SYSTEM_PROMPT,
          ASSET_ANALYST: ASSET_ANALYST_SYSTEM_PROMPT,
          MAKIEL: MAKIEL_SYSTEM_PROMPT,
          GADRAEL: GADRAEL_SYSTEM_PROMPT,
          DURANDIEL: DURANDIEL_SYSTEM_PROMPT,
          TELARIEL: TELARIEL_SYSTEM_PROMPT,
          REZAEL: REZAEL_SYSTEM_PROMPT,
          ZAKARIEL: ZAKARIEL_SYSTEM_PROMPT,
          PHOENIX: PHOENIX_SYSTEM_PROMPT,
          REAPER: REAPER_SYSTEM_PROMPT
        }
      });
    }

    return successResponse(toPromptResponse(config));
  } catch (error: any) {
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
    const savedStores: string[] = [];

    try {
      const { data: currentConfig, error: readError } = await supabaseAdmin
        .from('site_config')
        .select('intelligence')
        .eq('agent_id', agentId)
        .maybeSingle();
      if (readError) throw readError;

      const { error: writeError } = await supabaseAdmin
        .from('site_config')
        .upsert({
          agent_id: agentId,
          intelligence: {
            ...(currentConfig?.intelligence || {}),
            jamieSystemPrompt,
            abidanPrompts,
          },
          model_matrix: modelMatrix,
          operational_settings: operationalSettings,
          last_modified_by: 'Admin',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'agent_id' });
      if (writeError) throw writeError;
      savedStores.push('supabase');
    } catch (error) {
      console.warn('[ADMIN_PROMPTS_SUPABASE_WRITE]', error);
    }

    try {
      await connectDB();
      await SiteConfig.findOneAndUpdate(
        { agentId },
        {
          jamieSystemPrompt,
          abidanPrompts,
          modelMatrix,
          operationalSettings,
          lastModifiedBy: 'Admin'
        },
        { upsert: true }
      );
      savedStores.push('mongo');
    } catch (error) {
      console.warn('[ADMIN_PROMPTS_MONGO_WRITE]', error);
    }

    if (savedStores.length === 0) {
      return errorResponse('No prompt configuration store accepted the update.', 503);
    }

    return successResponse({ success: true, savedStores });
  } catch (error: any) {
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
      primaryModel: 'llama-3.1-8b-instant',
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
