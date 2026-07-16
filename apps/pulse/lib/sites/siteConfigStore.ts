import connectDB from '@/lib/core/database';
import { supabaseAdmin } from '@/lib/supabase';
import { SiteConfig } from '@/models/SiteConfig';
import {
  createDefaultLaunchKit,
  normalizeLaunchKit,
  toSiteConfigMongoRecord,
  toSiteConfigSupabaseRecord,
  type AgentLaunchKit,
} from '@/lib/sites/launchKit';

export async function readSiteConfig(agentId?: string | null) {
  if (agentId) {
    const supabaseRow = await readSupabaseSiteConfig(agentId);
    if (supabaseRow) return supabaseRow;

    const mongoRow = await readMongoSiteConfig(agentId);
    if (mongoRow) return mongoRow;
  }

  const fallback = createDefaultLaunchKit(agentId);
  const fallbackSupabaseRow = await readSupabaseSiteConfig(fallback.agentId);
  if (fallbackSupabaseRow) return fallbackSupabaseRow;

  return readMongoSiteConfig(fallback.agentId);
}

export async function readSiteConfigByOwnerUser(userId?: string | null) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return null;

  const supabaseRow = await readSupabaseSiteConfigByOwnerUser(normalizedUserId);
  if (supabaseRow) return supabaseRow;

  return readMongoSiteConfigByOwnerUser(normalizedUserId);
}

export async function readExpiredPastDueSiteConfigs(nowIso = new Date().toISOString(), limit = 50) {
  const rowsByAgentId = new Map<string, unknown>();

  for (const row of await readSupabaseExpiredPastDueSiteConfigs(nowIso, limit)) {
    const agentId = typeof (row as any)?.agent_id === 'string' ? (row as any).agent_id : '';
    if (agentId) rowsByAgentId.set(agentId, row);
  }

  for (const row of await readMongoExpiredPastDueSiteConfigs(nowIso, limit)) {
    const agentId = typeof (row as any)?.agentId === 'string' ? (row as any).agentId : '';
    if (agentId && !rowsByAgentId.has(agentId)) rowsByAgentId.set(agentId, row);
  }

  return Array.from(rowsByAgentId.values()).slice(0, limit);
}

export async function saveSiteConfig(kit: AgentLaunchKit, updatedBy: unknown) {
  const savedStores: string[] = [];

  try {
    const { error } = await supabaseAdmin
      .from('site_config')
      .upsert(toSiteConfigSupabaseRecord(kit, updatedBy), { onConflict: 'agent_id' });

    if (error) {
      console.warn('[SITE_CONFIG_SUPABASE_WRITE]', error.message);
    } else {
      savedStores.push('supabase');
    }
  } catch (error) {
    console.warn('[SITE_CONFIG_SUPABASE_WRITE_FALLBACK]', error);
  }

  try {
    await connectDB();
    await SiteConfig.findOneAndUpdate(
      { agentId: kit.agentId },
      toSiteConfigMongoRecord(kit, updatedBy),
      { upsert: true, new: true },
    );
    savedStores.push('mongo');
  } catch (error) {
    console.warn('[SITE_CONFIG_MONGO_WRITE]', error);
  }

  if (savedStores.length === 0) {
    throw new Error('No site config store accepted the launch-kit update.');
  }

  return savedStores;
}

async function readSupabaseSiteConfig(agentId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('site_config')
      .select('*')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (error) {
      console.warn('[SITE_CONFIG_SUPABASE_READ]', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('[SITE_CONFIG_SUPABASE_READ_FALLBACK]', error);
    return null;
  }
}

async function readSupabaseSiteConfigByOwnerUser(userId: string) {
  try {
    const ownerResult = await supabaseAdmin
      .from('site_config')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ownerResult.data && !ownerResult.error) return ownerResult.data;

    const billingResult = await supabaseAdmin
      .from('site_config')
      .select('*')
      .filter('billing_profile->>userId', 'eq', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (billingResult.error) {
      console.warn('[SITE_CONFIG_SUPABASE_OWNER_READ]', billingResult.error.message);
      return null;
    }

    return billingResult.data;
  } catch (error) {
    console.warn('[SITE_CONFIG_SUPABASE_OWNER_READ_FALLBACK]', error);
    return null;
  }
}

async function readMongoSiteConfig(agentId: string) {
  try {
    await connectDB();
    return await SiteConfig.findOne({ agentId }).lean();
  } catch (error) {
    console.warn('[SITE_CONFIG_MONGO_READ_FALLBACK]', error);
    return null;
  }
}

async function readMongoSiteConfigByOwnerUser(userId: string) {
  try {
    await connectDB();
    return await SiteConfig.findOne({
      $or: [
        { ownerId: userId },
        { 'billingProfile.userId': userId },
      ],
    }).sort({ updatedAt: -1 }).lean();
  } catch (error) {
    console.warn('[SITE_CONFIG_MONGO_OWNER_READ_FALLBACK]', error);
    return null;
  }
}

async function readSupabaseExpiredPastDueSiteConfigs(nowIso: string, limit: number) {
  try {
    const { data, error } = await supabaseAdmin
      .from('site_config')
      .select('*')
      .filter('billing_profile->>billingStatus', 'eq', 'past_due')
      .filter('billing_profile->>gracePeriodEndsAt', 'lt', nowIso)
      .order('updated_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.warn('[SITE_CONFIG_SUPABASE_EXPIRED_GRACE_READ]', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn('[SITE_CONFIG_SUPABASE_EXPIRED_GRACE_READ_FALLBACK]', error);
    return [];
  }
}

async function readMongoExpiredPastDueSiteConfigs(nowIso: string, limit: number) {
  try {
    await connectDB();
    return await SiteConfig.find({
      'billingProfile.billingStatus': 'past_due',
      'billingProfile.gracePeriodEndsAt': { $lt: nowIso },
    }).sort({ updatedAt: 1 }).limit(limit).lean();
  } catch (error) {
    console.warn('[SITE_CONFIG_MONGO_EXPIRED_GRACE_READ_FALLBACK]', error);
    return [];
  }
}
