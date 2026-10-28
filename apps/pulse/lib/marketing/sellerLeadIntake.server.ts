import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { getTenantSite } from '@/lib/sites/siteData';
import { supabaseAdmin } from '@/lib/supabase';
import { savedSellerIdentitySchema, type SavedSellerIdentity } from '@/lib/scheduling/sellerConsultationContract';
import { normalizeCampaign, type SellerPlanLeadInput } from './leadMagnetContract';

export type SellerLeadSaveResult =
  | { status: 'saved'; identity: SavedSellerIdentity }
  | { status: 'replayed'; identity: SavedSellerIdentity }
  | { status: 'conflict' }
  | { status: 'unavailable'; reason: 'configuration' | 'storage' };

/** Saves the owner's configured seller inquiry after server-side tenant resolution. */
export async function saveSellerPlanLead(
  input: SellerPlanLeadInput,
  configuredSite: string,
  submittedAt = new Date().toISOString(),
): Promise<SellerLeadSaveResult> {
  let tenant;
  try {
    tenant = await getTenantSite(configuredSite);
  } catch (error) {
    console.error('[SELLER_PLAN_SITE_LOOKUP]', error instanceof Error ? error.name : 'ProviderError');
    return { status: 'unavailable', reason: 'storage' };
  }
  if (!tenant.isPublished || tenant.status !== 'active' || !tenant.agentId) {
    return { status: 'unavailable', reason: 'configuration' };
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const message = [
    input.requestKind === 'pricing_review'
      ? 'Seller requested a personally reviewed pricing / CMA conversation.'
      : 'Seller requested a preparation and timing plan.',
    `Seller plan request; stated timing: ${input.timing}.`,
  ].join('\n');
  const campaign = normalizeCampaign(input.campaign);
  const fingerprint = createHash('sha256').update(JSON.stringify({
    offerKey: input.offerKey,
    offerVersion: input.offerVersion,
    name,
    email,
    requestKind: input.requestKind,
    timing: input.timing,
    requestedContact: input.requestedContact,
    marketingOptIn: input.marketingOptIn,
    campaign: campaign || {},
  })).digest('hex');
  const idempotencyKey = createHash('sha256')
    .update(`${tenant.agentId}:${configuredSite}:${input.submissionId}`)
    .digest('hex');
  const metadata = {
    funnelId: randomUUID(),
    sellerPlan: {
      offerKey: input.offerKey,
      offerVersion: input.offerVersion,
      requestKind: input.requestKind,
      timing: input.timing,
      requestedContact: { granted: true as const, capturedAt: submittedAt },
      marketingOptIn: input.marketingOptIn
        ? { granted: true as const, capturedAt: submittedAt }
        : { granted: false as const },
      requestFingerprint: fingerprint,
    },
    ...(campaign ? { campaign } : {}),
  };

  try {
    const { data: savedLead, error } = await supabaseAdmin.from('agent_site_leads').insert({
      agent_id: tenant.agentId,
      site: configuredSite,
      site_name: tenant.siteName,
      source: 'seller_plan',
      page_path: '/seller-plan',
      name,
      email,
      preferred_contact: 'email',
      message,
      metadata,
      funnel_id: metadata.funnelId,
      idempotency_key: idempotencyKey,
    }).select('id, funnel_id, agent_id, site').single();

    if (!error && savedLead) {
      const identity = identityFromLeadRow(savedLead);
      if (!matchesConfiguredIdentity(identity, tenant.agentId, configuredSite, metadata.funnelId)) {
        console.error('[SELLER_PLAN_LEAD_INSERT]', 'SavedIdentityMismatch');
        return { status: 'unavailable', reason: 'storage' };
      }
      return { status: 'saved', identity };
    }
    if (!error) {
      console.error('[SELLER_PLAN_LEAD_INSERT]', 'MissingSavedLeadReceipt');
      return { status: 'unavailable', reason: 'storage' };
    }
    if (error.code !== '23505') {
      console.error('[SELLER_PLAN_LEAD_INSERT]', error.code || 'ProviderError');
      return { status: 'unavailable', reason: 'storage' };
    }

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('agent_site_leads')
      .select('id, funnel_id, agent_id, site, metadata')
      .eq('agent_id', tenant.agentId)
      .eq('site', configuredSite)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (lookupError) {
      console.error('[SELLER_PLAN_LEAD_REPLAY]', lookupError.code || 'ProviderError');
      return { status: 'unavailable', reason: 'storage' };
    }
    if (existing?.metadata?.sellerPlan?.requestFingerprint !== fingerprint) return { status: 'conflict' };
    const identity = identityFromLeadRow(existing);
    if (!matchesConfiguredIdentity(identity, tenant.agentId, configuredSite, existing.metadata?.funnelId)) {
      console.error('[SELLER_PLAN_LEAD_REPLAY]', 'FunnelIdentityMismatch');
      return { status: 'unavailable', reason: 'storage' };
    }
    return { status: 'replayed', identity };
  } catch (error) {
    console.error('[SELLER_PLAN_LEAD_SAVE]', error instanceof Error ? error.name : 'ProviderError');
    return { status: 'unavailable', reason: 'storage' };
  }
}

function identityFromLeadRow(row: { id?: unknown; funnel_id?: unknown; agent_id?: unknown; site?: unknown }): SavedSellerIdentity {
  return savedSellerIdentitySchema.parse({
    leadId: row.id,
    funnelId: row.funnel_id,
    agentId: row.agent_id,
    site: row.site,
  });
}

function matchesConfiguredIdentity(identity: SavedSellerIdentity, agentId: string, site: string, funnelId: unknown) {
  return identity.agentId === agentId && identity.site === site && identity.funnelId === funnelId;
}
