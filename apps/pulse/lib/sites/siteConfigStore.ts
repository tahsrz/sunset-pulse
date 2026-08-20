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
  const targetAgentId = agentId || createDefaultLaunchKit(agentId).agentId;
  if (isMockMode()) return readMockSiteConfig(targetAgentId);

  const [supabaseRow, mongoRow] = await Promise.all([
    readSupabaseSiteConfig(targetAgentId),
    readMongoSiteConfig(targetAgentId),
  ]);

  return chooseFreshestSiteConfigRow(supabaseRow, mongoRow);
}

export async function readSiteConfigByOwnerUser(userId?: string | null) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return null;
  if (isMockMode()) return readMockSiteConfigByOwnerUser(normalizedUserId);

  const [supabaseRow, mongoRow] = await Promise.all([
    readSupabaseSiteConfigByOwnerUser(normalizedUserId),
    readMongoSiteConfigByOwnerUser(normalizedUserId),
  ]);

  return chooseFreshestSiteConfigRow(supabaseRow, mongoRow);
}

export async function readSiteConfigByStripeSubscriptionId(subscriptionId?: string | null) {
  const normalizedSubscriptionId = String(subscriptionId || '').trim();
  if (!normalizedSubscriptionId) return null;
  if (isMockMode()) return readMockSiteConfigByStripeSubscriptionId(normalizedSubscriptionId);

  const [supabaseRow, mongoRow] = await Promise.all([
    readSupabaseSiteConfigByStripeSubscriptionId(normalizedSubscriptionId),
    readMongoSiteConfigByStripeSubscriptionId(normalizedSubscriptionId),
  ]);

  return chooseFreshestSiteConfigRow(supabaseRow, mongoRow);
}

export async function readExpiredPastDueSiteConfigs(nowIso = new Date().toISOString(), limit = 50) {
  if (isMockMode()) return [];

  const candidateAgentIds = new Set<string>();

  for (const row of await readSupabaseExpiredPastDueSiteConfigs(nowIso, limit)) {
    const agentId = getSiteConfigAgentId(row);
    if (agentId) candidateAgentIds.add(agentId);
  }

  for (const row of await readMongoExpiredPastDueSiteConfigs(nowIso, limit)) {
    const agentId = getSiteConfigAgentId(row);
    if (agentId) candidateAgentIds.add(agentId);
  }

  const currentRows = await Promise.all(
    Array.from(candidateAgentIds).map((candidateAgentId) => readSiteConfig(candidateAgentId)),
  );

  return currentRows
    .filter((row) => isExpiredPastDueSiteConfig(row, nowIso))
    .sort((a, b) => getGracePeriodEndsAtMs(a) - getGracePeriodEndsAtMs(b))
    .slice(0, limit);
}

export async function saveSiteConfig(
  kit: AgentLaunchKit,
  updatedBy: unknown,
  options: { expectedUpdatedAt?: string } = {},
) {
  if (isMockMode()) {
    saveMockSiteConfig(kit, updatedBy);
    return ['mock'];
  }

  const savedStores: string[] = [];
  const updatedAt = new Date().toISOString();

  try {
    let query = supabaseAdmin
      .from('site_config')
      .upsert(toSiteConfigSupabaseRecord(kit, updatedBy, updatedAt), { onConflict: 'agent_id' });

    if (options.expectedUpdatedAt) {
      query = query.eq('updated_at', options.expectedUpdatedAt);
    }

    const { error } = await query;

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
    const query = options.expectedUpdatedAt
      ? { agentId: kit.agentId, updatedAt: new Date(options.expectedUpdatedAt) }
      : { agentId: kit.agentId };
    const saved = await SiteConfig.findOneAndUpdate(
      query,
      toSiteConfigMongoRecord(kit, updatedBy, updatedAt),
      { upsert: true, new: true },
    );
    if (saved || !options.expectedUpdatedAt) savedStores.push('mongo');
  } catch (error) {
    console.warn('[SITE_CONFIG_MONGO_WRITE]', error);
  }

  if (savedStores.length === 0) {
    if (options.expectedUpdatedAt) {
      throw new Error('Site changed while this form was open. Reload and try again.');
    }
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

    if (ownerResult.error) {
      console.warn('[SITE_CONFIG_SUPABASE_OWNER_ID_READ]', ownerResult.error.message);
    }

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

async function readSupabaseSiteConfigByStripeSubscriptionId(subscriptionId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('site_config')
      .select('*')
      .filter('billing_profile->>stripeSubscriptionId', 'eq', subscriptionId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[SITE_CONFIG_SUPABASE_STRIPE_SUBSCRIPTION_READ]', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('[SITE_CONFIG_SUPABASE_STRIPE_SUBSCRIPTION_READ_FALLBACK]', error);
    return null;
  }
}

async function readMongoSiteConfigByStripeSubscriptionId(subscriptionId: string) {
  try {
    await connectDB();
    return await SiteConfig.findOne({
      'billingProfile.stripeSubscriptionId': subscriptionId,
    }).sort({ updatedAt: -1 }).lean();
  } catch (error) {
    console.warn('[SITE_CONFIG_MONGO_STRIPE_SUBSCRIPTION_READ_FALLBACK]', error);
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

function chooseFreshestSiteConfigRow<TSupabase, TMongo>(supabaseRow: TSupabase | null, mongoRow: TMongo | null) {
  if (!supabaseRow) return mongoRow;
  if (!mongoRow) return supabaseRow;

  const supabaseFreshness = getSiteConfigFreshnessMs(supabaseRow);
  const mongoFreshness = getSiteConfigFreshnessMs(mongoRow);

  if (mongoFreshness !== null && (supabaseFreshness === null || mongoFreshness > supabaseFreshness)) {
    return mongoRow;
  }

  return supabaseRow;
}

function getSiteConfigAgentId(row: unknown) {
  const value = row as any;
  return typeof value?.agent_id === 'string' ? value.agent_id : typeof value?.agentId === 'string' ? value.agentId : '';
}

function getSiteConfigFreshnessMs(row: unknown) {
  const value = row as any;
  const times = [
    toTime(value?.updated_at),
    toTime(value?.updatedAt),
    getLatestProvisioningAuditMs(value?.provisioning_audit || value?.provisioningAudit),
  ].filter((time): time is number => time !== null);

  if (times.length === 0) return null;
  return Math.max(...times);
}

function getLatestProvisioningAuditMs(value: unknown) {
  if (!Array.isArray(value)) return null;

  const times = value
    .map((event) => toTime((event as any)?.occurredAt))
    .filter((time): time is number => time !== null);

  if (times.length === 0) return null;
  return Math.max(...times);
}

function isExpiredPastDueSiteConfig(row: unknown, nowIso: string) {
  if (!row) return false;
  const billingProfile = (row as any)?.billing_profile || (row as any)?.billingProfile || {};
  if (billingProfile.billingStatus !== 'past_due') return false;

  const gracePeriodEndsAt = toTime(billingProfile.gracePeriodEndsAt);
  const now = toTime(nowIso);
  return gracePeriodEndsAt !== null && now !== null && gracePeriodEndsAt < now;
}

function getGracePeriodEndsAtMs(row: unknown) {
  const billingProfile = (row as any)?.billing_profile || (row as any)?.billingProfile || {};
  return toTime(billingProfile.gracePeriodEndsAt) || Number.MAX_SAFE_INTEGER;
}

function toTime(value: unknown) {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }

  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export async function claimPastDueSiteConfigForExpiry(agentId: string, gracePeriodEndsAt: string, nowIso: string) {
  if (isMockMode()) return true;

  let claimed = false;

  try {
    const { data, error } = await supabaseAdmin
      .from('site_config')
      .update({ status: 'draft', updated_at: nowIso })
      .eq('agent_id', agentId)
      .neq('status', 'draft')
      .filter('billing_profile->>billingStatus', 'eq', 'past_due')
      .filter('billing_profile->>gracePeriodEndsAt', 'lt', nowIso)
      .select('agent_id')
      .maybeSingle();

    if (error) console.warn('[SITE_CONFIG_SUPABASE_EXPIRY_CLAIM]', error.message);
    if (data && !error) claimed = true;
  } catch (error) {
    console.warn('[SITE_CONFIG_SUPABASE_EXPIRY_CLAIM_FALLBACK]', error);
  }

  try {
    await connectDB();
    const mongoClaim = await SiteConfig.findOneAndUpdate(
      {
        agentId,
        status: { $ne: 'draft' },
        'billingProfile.billingStatus': 'past_due',
        'billingProfile.gracePeriodEndsAt': { $lt: nowIso },
      },
      { $set: { status: 'draft', updatedAt: new Date(nowIso) } },
      { new: true },
    ).lean();
    if (mongoClaim) claimed = true;
  } catch (error) {
    console.warn('[SITE_CONFIG_MONGO_EXPIRY_CLAIM]', error);
  }

  return claimed;
}

type MockSiteConfigGlobal = typeof globalThis & {
  __sunsetPulseMockSiteConfigs?: Map<string, AgentLaunchKit>;
};

function readMockSiteConfig(agentId: string) {
  const kit = getMockSiteConfigMap().get(agentId) || createDefaultLaunchKit(agentId);
  return toSiteConfigSupabaseRecord(kit, { role: 'mock' }, new Date().toISOString());
}

function readMockSiteConfigByOwnerUser(userId: string) {
  const kit = Array.from(getMockSiteConfigMap().values()).find((row) => (
    row.ownerId === userId || row.billingProfile.userId === userId
  ));
  return kit ? toSiteConfigSupabaseRecord(kit, { role: 'mock' }, new Date().toISOString()) : null;
}

function readMockSiteConfigByStripeSubscriptionId(subscriptionId: string) {
  const kit = Array.from(getMockSiteConfigMap().values()).find((row) => (
    row.billingProfile.stripeSubscriptionId === subscriptionId
  ));
  return kit ? toSiteConfigSupabaseRecord(kit, { role: 'mock' }, new Date().toISOString()) : null;
}

function saveMockSiteConfig(kit: AgentLaunchKit, updatedBy: unknown) {
  const updatedAt = new Date().toISOString();
  getMockSiteConfigMap().set(kit.agentId, {
    ...kit,
    provisioningAudit: kit.provisioningAudit,
    billingProfile: {
      ...kit.billingProfile,
      billingStatusChangedAt: kit.billingProfile.billingStatusChangedAt || updatedAt,
    },
  });
  void updatedBy;
}

function getMockSiteConfigMap() {
  const globalStore = globalThis as MockSiteConfigGlobal;
  if (!globalStore.__sunsetPulseMockSiteConfigs) {
    globalStore.__sunsetPulseMockSiteConfigs = new Map();
  }
  return globalStore.__sunsetPulseMockSiteConfigs;
}

function isMockMode() {
  return process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
}
