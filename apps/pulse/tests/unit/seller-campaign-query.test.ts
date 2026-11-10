import { describe, expect, it } from 'vitest';
import { sellerCampaignQuery } from '@/lib/marketing/sellerCampaignQuery';

describe('seller campaign query forwarding', () => {
  it('preserves bounded, safe campaign values for the seller request route', () => {
    expect(sellerCampaignQuery({
      utm_source: 'homepage',
      utm_medium: 'organic social',
      utm_campaign: 'fall-sellers-2026',
      utm_content: 'hero-cta',
    })).toBe('?utm_source=homepage&utm_medium=organic+social&utm_campaign=fall-sellers-2026&utm_content=hero-cta');
  });

  it('drops unsupported, repeated, and contact-like values before forwarding', () => {
    expect(sellerCampaignQuery({
      utm_source: 'owner@example.com',
      utm_medium: ['email', 'social'],
      utm_campaign: 'fall/sellers',
      utm_content: 'homepage-hero',
    })).toBe('?utm_content=homepage-hero');
  });

  it('returns no query when there is no safe campaign attribution', () => {
    expect(sellerCampaignQuery({})).toBe('');
  });
});
