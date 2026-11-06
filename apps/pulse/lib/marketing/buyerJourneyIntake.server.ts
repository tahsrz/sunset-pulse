import 'server-only';

import { createHash } from 'node:crypto';
import { getTenantSite } from '@/lib/sites/siteData';
import { supabaseAdmin } from '@/lib/supabase';
import { type BuyerRequest } from './buyerJourneyContract';
import { normalizeCampaign } from './leadMagnetContract';

type BuyerSaveResult = 'saved' | 'replayed' | 'conflict' | 'configuration' | 'unavailable';

export async function saveBuyerRequest(input: BuyerRequest, configuredSite: string): Promise<BuyerSaveResult> {
  try {
    const tenant = await getTenantSite(configuredSite);
    if (!tenant.isPublished || tenant.status !== 'active' || tenant.site.toLowerCase() !== configuredSite || !tenant.agentId) {
      return 'configuration';
    }

    const email = input.email.toLowerCase();
    const campaign = normalizeCampaign(input.campaign) ?? {};
    const fingerprint = createHash('sha256').update(JSON.stringify({
      offerKey: input.offerKey, offerVersion: input.offerVersion, name: input.name, email,
      requestedContact: input.requestedContact, marketingOptIn: input.marketingOptIn, campaign, journey: input.journey,
    })).digest('hex');

    const { data, error } = await supabaseAdmin.rpc('save_guided_buyer_request', {
      p_site: configuredSite, p_agent_id: tenant.agentId, p_submission_id: input.submissionId,
      p_fingerprint: fingerprint, p_name: input.name, p_email: email, p_journey: input.journey,
      p_campaign: campaign, p_marketing_opt_in: input.marketingOptIn,
    });
    if (error) {
      console.error('[BUYER_REQUEST_SAVE]', error.code || 'ProviderError');
      return 'unavailable';
    }
    if (data === 'saved' || data === 'replayed' || data === 'conflict' || data === 'configuration') return data;
    return 'unavailable';
  } catch (error) {
    console.error('[BUYER_REQUEST_SAVE]', error instanceof Error ? error.name : 'ProviderError');
    return 'unavailable';
  }
}
