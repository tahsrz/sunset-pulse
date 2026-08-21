import 'server-only';

import connectDB from '@/lib/core/database';
import { supabaseAdmin } from '@/lib/supabase';
import { SiteConfig } from '@/models/SiteConfig';

export type PromptConfig = Readonly<{
  jamieSystemPrompt?: string;
  abidanPrompts?: Record<string, string>;
  modelMatrix?: Record<string, string>;
  operationalSettings?: Record<string, string | number | boolean>;
  updatedAt?: string | Date;
}>;

export type PromptConfigUpdate = Readonly<{
  jamieSystemPrompt: string;
  abidanPrompts: Record<string, string>;
  modelMatrix: Record<string, string>;
  operationalSettings: Record<string, string | number | boolean>;
}>;

type StoreRead = Readonly<{ available: boolean; row: any | null }>;

export class PromptConfigStoreUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptConfigStoreUnavailableError';
  }
}

export async function readPromptConfig(agentId: string): Promise<PromptConfig | null> {
  const [supabase, mongo] = await Promise.all([
    readSupabasePromptConfig(agentId),
    readMongoPromptConfig(agentId),
  ]);

  if (!supabase.available && !mongo.available) {
    throw new PromptConfigStoreUnavailableError('No prompt configuration store is available.');
  }

  return normalizePromptConfig(chooseFreshestRow(supabase.row, mongo.row));
}

export async function savePromptConfig(agentId: string, config: PromptConfigUpdate) {
  const updatedAt = new Date().toISOString();
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
          jamieSystemPrompt: config.jamieSystemPrompt,
          abidanPrompts: config.abidanPrompts,
        },
        model_matrix: config.modelMatrix,
        operational_settings: config.operationalSettings,
        last_modified_by: 'Admin',
        updated_at: updatedAt,
      }, { onConflict: 'agent_id' });
    if (writeError) throw writeError;
    savedStores.push('supabase');
  } catch (error) {
    console.warn('[PROMPT_CONFIG_SUPABASE_WRITE]', error);
  }

  try {
    await connectDB();
    await SiteConfig.findOneAndUpdate(
      { agentId },
      {
        ...config,
        lastModifiedBy: 'Admin',
        updatedAt,
      },
      { upsert: true },
    );
    savedStores.push('mongo');
  } catch (error) {
    console.warn('[PROMPT_CONFIG_MONGO_WRITE]', error);
  }

  if (savedStores.length === 0) {
    throw new PromptConfigStoreUnavailableError('No prompt configuration store accepted the update.');
  }

  return savedStores;
}

async function readSupabasePromptConfig(agentId: string): Promise<StoreRead> {
  try {
    const { data, error } = await supabaseAdmin
      .from('site_config')
      .select('intelligence, model_matrix, operational_settings, updated_at')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (error) {
      console.warn('[PROMPT_CONFIG_SUPABASE_READ]', error.message);
      return { available: false, row: null };
    }

    return { available: true, row: data };
  } catch (error) {
    console.warn('[PROMPT_CONFIG_SUPABASE_READ]', error);
    return { available: false, row: null };
  }
}

async function readMongoPromptConfig(agentId: string): Promise<StoreRead> {
  try {
    await connectDB();
    return { available: true, row: await SiteConfig.findOne({ agentId }).lean() };
  } catch (error) {
    console.warn('[PROMPT_CONFIG_MONGO_READ]', error);
    return { available: false, row: null };
  }
}

function normalizePromptConfig(row: any): PromptConfig | null {
  if (!row) return null;
  return Object.freeze({
    jamieSystemPrompt: row.jamieSystemPrompt || row.intelligence?.jamieSystemPrompt,
    abidanPrompts: row.abidanPrompts || row.intelligence?.abidanPrompts,
    modelMatrix: row.modelMatrix || row.model_matrix,
    operationalSettings: row.operationalSettings || row.operational_settings,
    updatedAt: row.updatedAt || row.updated_at,
  });
}

function chooseFreshestRow(supabaseRow: any | null, mongoRow: any | null) {
  if (!supabaseRow) return mongoRow;
  if (!mongoRow) return supabaseRow;

  const supabaseUpdatedAt = timestamp(supabaseRow.updated_at || supabaseRow.updatedAt);
  const mongoUpdatedAt = timestamp(mongoRow.updatedAt || mongoRow.updated_at);
  return mongoUpdatedAt > supabaseUpdatedAt ? mongoRow : supabaseRow;
}

function timestamp(value: unknown) {
  const parsed = value instanceof Date ? value.getTime() : Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}
