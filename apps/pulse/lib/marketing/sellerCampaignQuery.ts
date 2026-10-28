import { normalizeCampaign } from './leadMagnetContract';

export type SellerCampaignSearchParams = Record<string, string | string[] | undefined>;

export function sellerCampaignQuery(searchParams: SellerCampaignSearchParams): string {
  const campaign = normalizeCampaign({
    source: typeof searchParams.utm_source === 'string' ? searchParams.utm_source : undefined,
    medium: typeof searchParams.utm_medium === 'string' ? searchParams.utm_medium : undefined,
    campaign: typeof searchParams.utm_campaign === 'string' ? searchParams.utm_campaign : undefined,
    content: typeof searchParams.utm_content === 'string' ? searchParams.utm_content : undefined,
  });
  if (!campaign) return '';

  const query = new URLSearchParams();
  if (campaign.source) query.set('utm_source', campaign.source);
  if (campaign.medium) query.set('utm_medium', campaign.medium);
  if (campaign.campaign) query.set('utm_campaign', campaign.campaign);
  if (campaign.content) query.set('utm_content', campaign.content);
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}
