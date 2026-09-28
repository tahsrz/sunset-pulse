import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestCommandSupervisorReview } from '@/lib/command-center/commandSupervisorClient';
import type { CommandResponse } from '@/lib/command-center/commandTypes';

const result: CommandResponse = { commandId: 'command-1', intent: 'listing_analysis', worker: { id: 'listing-summary', name: 'Listing', role: 'Summary' }, result: { title: 'Title', summary: 'Summary', confidence: 90, actions: [], deliverable: { title: 'Copy', copyReadyText: 'Text', sourceSummary: 'Source' } }, trace: { selectedShards: [{ title: 'Shard', source: 'source', excerpt: 'text', score: 0.8 }] } };
describe('per-run supervisor client', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('queues then processes only the matching review with the immutable command', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ trace: { status: 'queued', path: 'review', reviewId: 'review-1' } })).mockResolvedValueOnce(Response.json({ snapshot: { recent: [{ id: 'other', status: 'failed' }, { id: 'review-1', status: 'succeeded', severity: 'warning', findings: ['Review claim'] }] } }));
    vi.stubGlobal('fetch', fetcher);
    const update = vi.fn();
    await requestCommandSupervisorReview(result, 'Original immutable command', update, new AbortController().signal);
    expect(fetcher.mock.calls.map((call) => call[1].method)).toEqual(['POST', 'PUT']);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ commandId: 'command-1', command: 'Original immutable command', workerId: 'listing-summary' });
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ reviewId: 'review-1', status: 'succeeded', findingCount: 1, severity: 'warning' }));
  });
  it('keeps review errors recoverable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));
    const update = vi.fn();
    await requestCommandSupervisorReview(result, 'Original', update, new AbortController().signal);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'unavailable' }));
  });
});
