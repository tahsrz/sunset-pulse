import { describe, expect, it } from 'vitest';
import { initialJamieAudioState, jamieAudioReducer, recentTranscript } from '@/context/JamieAudioContext';

describe('Jamie audio state', () => {
  it('keeps only the rolling 30-second query context and removes the wake phrase', () => {
    const now = 100_000;
    const transcript = recentTranscript([
      { id: 'old', text: 'ignore this', capturedAt: now - 31_000, final: true },
      { id: 'recent', text: 'Fort Worth homes under five hundred thousand', capturedAt: now - 5_000, final: true },
      { id: 'wake', text: 'pull that up', capturedAt: now, final: true },
    ], now);

    expect(transcript).toBe('Fort Worth homes under five hundred thousand');
  });

  it('supports review, cancellation, submission, and one-time consumption', () => {
    const query = { id: 'query-1', text: 'North Texas market report', submitAt: 2_000 };
    const queued = jamieAudioReducer(initialJamieAudioState, { type: 'QUEUE_QUERY', query });
    expect(queued.pendingQuery).toEqual(query);
    expect(queued.caption).toContain(query.text);

    const cancelled = jamieAudioReducer(queued, { type: 'CANCEL_QUERY' });
    expect(cancelled.pendingQuery).toBeNull();
    expect(cancelled.submittedQuery).toBeNull();

    const submitted = jamieAudioReducer(queued, { type: 'SUBMIT_QUERY' });
    expect(submitted.pendingQuery).toBeNull();
    expect(submitted.submittedQuery).toEqual({ id: query.id, text: query.text });

    const consumed = jamieAudioReducer(submitted, { type: 'CONSUME_QUERY', id: query.id });
    expect(consumed.submittedQuery).toBeNull();
  });
});
