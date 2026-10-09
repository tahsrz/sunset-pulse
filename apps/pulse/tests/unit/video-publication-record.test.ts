import { describe, expect, it } from 'vitest';
import { videoPublicationRecordSchema } from '@/lib/marketing/videoPublicationRecordSchema';
import { videoPublicationOutcomeSchema } from '@/lib/marketing/videoPublicationOutcomeSchema';
import { sellerLeadAttributionSchema } from '@/lib/marketing/sellerLeadAttributionSchema';
import { sellerVideoTrackingLink } from '@/lib/marketing/sellerVideoTrackingLink';

const record = {
  workspaceId: '11111111-1111-4111-8111-111111111111',
  briefId: '22222222-2222-4222-8222-222222222222',
  revision: 1,
  platform: 'youtube-shorts',
  publicUrl: 'https://www.youtube.com/shorts/example',
  publishedAt: '2026-10-05T12:00:00Z',
  requestKey: '33333333-3333-4333-8333-333333333333',
};

describe('manual video publication record contract', () => {
  it('accepts a historical public HTTPS post URL on the selected platform', () => {
    expect(videoPublicationRecordSchema.parse(record).platform).toBe('youtube-shorts');
  });

  it('rejects mismatched, insecure, deceptive, and credential-bearing URLs', () => {
    expect(videoPublicationRecordSchema.safeParse({ ...record, platform: 'tiktok', publicUrl: record.publicUrl }).success).toBe(false);
    expect(videoPublicationRecordSchema.safeParse({ ...record, publicUrl: 'http://youtube.com/shorts/example' }).success).toBe(false);
    expect(videoPublicationRecordSchema.safeParse({ ...record, publicUrl: 'https://youtube.com.attacker.test/shorts/example' }).success).toBe(false);
    expect(videoPublicationRecordSchema.safeParse({ ...record, publicUrl: 'https://user:pass@youtube.com/shorts/example' }).success).toBe(false);
  });

  it('rejects future timestamps and unknown fields', () => {
    expect(videoPublicationRecordSchema.safeParse({ ...record, publishedAt: '2999-01-01T00:00:00Z' }).success).toBe(false);
    expect(videoPublicationRecordSchema.safeParse({ ...record, sendNow: true }).success).toBe(false);
  });
});

describe('manual video publication outcome contract', () => {
  const outcome = {
    workspaceId: '11111111-1111-4111-8111-111111111111',
    publicationId: '22222222-2222-4222-8222-222222222222',
    capturedAt: '2026-10-05T12:00:00Z',
    views: 100,
    engagements: 12,
    linkClicks: 3,
    sellerPlanRequests: 1,
    sourceNote: 'Entered from the visible post insights.',
    requestKey: '33333333-3333-4333-8333-333333333333',
  };

  it('accepts bounded, dated, owner-entered count snapshots', () => {
    expect(videoPublicationOutcomeSchema.parse(outcome).views).toBe(100);
  });

  it('rejects future captures, invalid counts, excessive engagement, and missing provenance', () => {
    expect(videoPublicationOutcomeSchema.safeParse({ ...outcome, capturedAt: '2999-01-01T00:00:00Z' }).success).toBe(false);
    expect(videoPublicationOutcomeSchema.safeParse({ ...outcome, views: -1 }).success).toBe(false);
    expect(videoPublicationOutcomeSchema.safeParse({ ...outcome, engagements: 101 }).success).toBe(false);
    expect(videoPublicationOutcomeSchema.safeParse({ ...outcome, sourceNote: 'guess' }).success).toBe(false);
    expect(videoPublicationOutcomeSchema.safeParse({ ...outcome, inferredAttribution: true }).success).toBe(false);
  });
});

describe('owner-reported seller lead attribution contract', () => {
  const attribution = {
    workspaceId: '11111111-1111-4111-8111-111111111111',
    publicationId: '22222222-2222-4222-8222-222222222222',
    leadId: '44444444-4444-4444-8444-444444444444',
    evidenceNote: 'Seller named this post on their request form.',
    requestKey: '33333333-3333-4333-8333-333333333333',
  };

  it('accepts an explicit private association with a provenance note', () => {
    expect(sellerLeadAttributionSchema.parse(attribution).evidenceNote).toContain('Seller named');
  });

  it('rejects missing evidence, malformed identifiers, and inferred/unknown fields', () => {
    expect(sellerLeadAttributionSchema.safeParse({ ...attribution, evidenceNote: 'guess' }).success).toBe(false);
    expect(sellerLeadAttributionSchema.safeParse({ ...attribution, leadId: 'not-a-uuid' }).success).toBe(false);
    expect(sellerLeadAttributionSchema.safeParse({ ...attribution, attributedByModel: true }).success).toBe(false);
  });
});

describe('seller video campaign tracking links', () => {
  it('adds URL-encoded source, medium, persisted campaign key, and brief identity', () => {
    const result = new URL(sellerVideoTrackingLink('https://example.com/seller?ref=home', 'fall-seller-guide', record.briefId));
    expect(result.searchParams.get('ref')).toBe('home');
    expect(result.searchParams.get('utm_source')).toBe('sunset-pulse');
    expect(result.searchParams.get('utm_medium')).toBe('organic-video');
    expect(result.searchParams.get('utm_campaign')).toBe('fall-seller-guide');
    expect(result.searchParams.get('utm_content')).toBe(record.briefId);
  });

  it('rejects credential-bearing and non-web destinations', () => {
    expect(() => sellerVideoTrackingLink('javascript:alert(1)', 'campaign', record.briefId)).toThrow();
    expect(() => sellerVideoTrackingLink('https://user:pass@example.com', 'campaign', record.briefId)).toThrow();
  });
});
