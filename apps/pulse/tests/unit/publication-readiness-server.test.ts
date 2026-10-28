import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import * as profiles from '@/lib/marketing/sellerIntroduction.server';
import * as guides from '@/lib/marketing/neighborhoodGuides.server';
import * as presentations from '@/lib/marketing/neighborhoodPresentations.server';
import { loadPublicationReadiness } from '@/lib/marketing/publicationReadiness.server';
import oldTown from '@/content/neighborhoods/old-town-keller.v1.json';
import presentationFile from '@/content/neighborhoods/presentation.v1.json';
import { defaultAgentProfile, defaultIntegrationProfile } from '@/lib/sites/agentConfig';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-28T12:00:00.000Z')); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); (oldTown as Record<string, unknown>).status = 'published'; presentationFile.records.length = 0; });

describe('repository publication readiness', () => {
  it('reports the current seller draft and three published text guides, including the real Westlake slug', () => {
    const report = loadPublicationReadiness();
    expect(report.items.map(item => item.state)).toEqual(['needs_content', 'published', 'published', 'published']);
    expect(guides.getReviewedNeighborhoodGuide('westlake-overview')?.slug).toBe('westlake-overview');
    expect(guides.getReviewedNeighborhoodGuide('westlake')).toBeNull();
    expect(profiles.getPublishedSellerIntroduction()).toBeNull();
    expect(profiles.loadSellerIntroduction()).toMatchObject({ displayName: defaultAgentProfile.displayName, email: defaultAgentProfile.email });
    expect(profiles.loadSellerIntroduction().email).toBe(defaultIntegrationProfile.leadEmail);
    expect(report.items[0].required).toEqual(['biography', 'review']);
    expect(presentations.listPublishedNeighborhoodPresentations()).toEqual([]);
  });
  it('reports a failed profile source as unavailable without hiding healthy guides or exposing errors', () => {
    vi.spyOn(profiles, 'loadSellerIntroduction').mockImplementation(() => { throw new Error('private source details'); });
    const report = loadPublicationReadiness();
    expect(report.items.map(item => item.state)).toEqual(['unavailable', 'published', 'published', 'published']);
    expect(JSON.stringify(report)).not.toContain('private source details');
  });
  it('returns only readiness fields rather than copying identity or contact data into the report', () => {
    vi.spyOn(profiles, 'loadSellerIntroduction').mockReturnValue({ schemaVersion: 1, status: 'published', displayName: 'Identity Sentinel', biography: 'A fictional biography used only for this redaction check.', email: 'private-sentinel@example.test' });
    const report = loadPublicationReadiness();
    expect(report.items[0]).toMatchObject({ state: 'published', optional: ['photo'] });
    expect(JSON.stringify(report)).not.toMatch(/Identity Sentinel|private-sentinel|fictional biography/);
  });
  it('reports the shared guide source as unavailable when one record fails validation at read time', () => {
    (oldTown as Record<string, unknown>).status = 'invalid';
    expect(() => guides.getReviewedNeighborhoodGuide('old-town-keller')).toThrow();
    expect(() => guides.listPublishedNeighborhoodGuides()).toThrow();
    expect(loadPublicationReadiness().items.map(item => item.state)).toEqual(['needs_content', 'unavailable', 'unavailable', 'unavailable']);
  });
  it('distinguishes an unavailable presentation source from an empty valid collection', () => {
    vi.spyOn(presentations, 'listReviewedNeighborhoodPresentations').mockImplementation(() => { throw new Error('bad collection'); });
    expect(loadPublicationReadiness().items.map(item => item.state)).toEqual(['needs_content', 'unavailable', 'unavailable', 'unavailable']);
  });
  it('matches public guide omission after all evidence expires', () => {
    vi.setSystemTime(new Date('2028-01-01T00:00:00.000Z'));
    expect(guides.listPublishedNeighborhoodGuides()).toEqual([]);
    for (const item of loadPublicationReadiness().items.slice(1)) expect(item).toMatchObject({ state: 'needs_content', required: ['evidence'] });
  });
  it('preserves filtering of expired places and omission of the public map', () => {
    (presentationFile.records as unknown[]).push({ schemaVersion: 1, slug: 'old-town-keller', status: 'published', photos: [], map: { latitude: 32.9, longitude: -97.2, zoom: 12 }, places: [{ id: 'fixture', name: 'Fixture Park', category: 'park', description: 'A fictional park used for loader verification.', latitude: 32.9, longitude: -97.2, evidenceIds: ['missing-evidence'] }] });
    const record = presentations.getPublishedNeighborhoodPresentation('old-town-keller');
    expect(record?.places).toEqual([]);
    expect(record?.map).toBeUndefined();
    expect(loadPublicationReadiness().items[1].warnings).toContain('expired_places');
  });
});
