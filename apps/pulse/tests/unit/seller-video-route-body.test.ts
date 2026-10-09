import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

import { readSellerVideoJson } from '@/lib/marketing/sellerVideoRouteBody.server';

describe('seller video mutation request boundary', () => {
  it('accepts same-origin JSON', async () => {
    const request = new NextRequest('https://sunsetpulse.app/api/seller-video-briefs/publications', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://sunsetpulse.app' }, body: JSON.stringify({ ok: true }),
    });
    const result = await readSellerVideoJson(request, 'Publication request rejected');
    expect(result.body).toEqual({ ok: true });
    expect(result.response).toBeNull();
  });

  it('rejects cross-origin and over-limit bodies with private responses', async () => {
    const crossOrigin = new NextRequest('https://sunsetpulse.app/api/seller-video-briefs/publications', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' }, body: '{}',
    });
    const crossResult = await readSellerVideoJson(crossOrigin, 'Publication request rejected');
    expect(crossResult.response?.status).toBe(403);
    expect(crossResult.response?.headers.get('Cache-Control')).toBe('private, no-store');

    const oversized = new NextRequest('https://sunsetpulse.app/api/seller-video-briefs/publications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(140_000) }),
    });
    expect((await readSellerVideoJson(oversized, 'Publication request rejected')).response?.status).toBe(413);
  });
});
