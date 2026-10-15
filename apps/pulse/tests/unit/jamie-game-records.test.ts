import { afterEach, describe, expect, it, vi } from 'vitest';
import { JAMIE_RECORD_KEYS, readJamieGameRecord, readJamieScorecard, saveJamieGameRecord } from '@/lib/jamie-games/records';

afterEach(() => vi.restoreAllMocks());

describe('Jamie browser record boundary', () => {
  it('reads existing records without migrating or writing them', () => {
    const saved = {
      [JAMIE_RECORD_KEYS.chess]: '{"wins":4,"draws":2,"losses":3,"extra":"ignored"}',
      [JAMIE_RECORD_KEYS.poker]: '{"hands":9,"wins":4,"losses":3,"ties":2}',
      [JAMIE_RECORD_KEYS.tetris]: '12500',
      [JAMIE_RECORD_KEYS.volley]: '{"matches":5,"wins":3,"losses":2}',
    };
    const getItem = vi.fn((key: string) => saved[key as keyof typeof saved] ?? null);
    const scorecard = readJamieScorecard({ getItem });
    expect(scorecard.chess.value).toEqual({ wins: 4, draws: 2, losses: 3 });
    expect(scorecard.poker.value).toEqual({ hands: 9, wins: 4, losses: 3, ties: 2 });
    expect(scorecard.tetris.value).toBe(12500);
    expect(scorecard.volley.value).toEqual({ matches: 5, wins: 3, losses: 2 });
    expect(Object.values(scorecard).every((record) => record.status === 'saved')).toBe(true);
    expect(getItem).toHaveBeenCalledTimes(4);
  });

  it('distinguishes a new browser from unavailable storage', () => {
    expect(readJamieGameRecord('chess', { getItem: () => null })).toEqual({ value: { wins: 0, draws: 0, losses: 0 }, status: 'empty' });
    expect(readJamieGameRecord('tetris', null)).toEqual({ value: 0, status: 'unavailable' });
    expect(readJamieGameRecord('volley', { getItem: () => { throw new Error('Denied'); } }).status).toBe('unavailable');
  });

  it('handles a localStorage getter that throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    expect(readJamieScorecard().chess.status).toBe('unavailable');
    expect(saveJamieGameRecord('tetris', 12)).toBe(false);
  });

  it.each(['not-json', 'null', '[]', '{}', '{"wins":-1,"draws":0,"losses":0}', '{"wins":"2","draws":0,"losses":0}', '{"wins":0.5,"draws":0,"losses":0}', '{"wins":{},"draws":0,"losses":0}', '{"wins":9007199254740992,"draws":0,"losses":0}', ' '.repeat(4097)])('rejects malformed chess record %s', (raw) => {
    expect(readJamieGameRecord('chess', { getItem: () => raw })).toEqual({ value: { wins: 0, draws: 0, losses: 0 }, status: 'invalid' });
  });

  it.each(['-1', 'Infinity', 'NaN', '1e4', '2.5', '', '9007199254740992'])('rejects invalid high score %s', (raw) => {
    expect(readJamieGameRecord('tetris', { getItem: () => raw })).toEqual({ value: 0, status: 'invalid' });
  });

  it('writes only known fields in the established format', () => {
    const setItem = vi.fn();
    expect(saveJamieGameRecord('chess', { wins: 1, draws: 0, losses: 2, extra: 'discard' } as { wins: number; draws: number; losses: number }, { setItem })).toBe(true);
    expect(setItem).toHaveBeenCalledWith(JAMIE_RECORD_KEYS.chess, '{"wins":1,"draws":0,"losses":2}');
    expect(saveJamieGameRecord('tetris', 200, { setItem })).toBe(true);
    expect(setItem).toHaveBeenLastCalledWith(JAMIE_RECORD_KEYS.tetris, '200');
  });

  it('does not write invalid values or propagate quota errors', () => {
    const setItem = vi.fn();
    expect(saveJamieGameRecord('tetris', Infinity, { setItem })).toBe(false);
    expect(saveJamieGameRecord('poker', { hands: 1, wins: -1, losses: 0, ties: 0 }, { setItem })).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
    expect(saveJamieGameRecord('tetris', 20, { setItem: () => { throw new DOMException('Full', 'QuotaExceededError'); } })).toBe(false);
  });
});
