import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JamieLocalScorecard } from '@/components/jamie-games/JamieLocalScorecard';
import { JAMIE_RECORD_KEYS } from '@/lib/jamie-games/records';

beforeEach(() => window.localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Jamie local scorecard', () => {
  it('displays existing browser records and excludes external game results', () => {
    window.localStorage.setItem(JAMIE_RECORD_KEYS.chess, '{"wins":4,"draws":2,"losses":3}');
    window.localStorage.setItem(JAMIE_RECORD_KEYS.tetris, '1200');
    render(<JamieLocalScorecard />);
    expect(within(screen.getByRole('group', { name: 'Chess record' })).getByText('4 wins · 2 draws · 3 losses')).toBeTruthy();
    expect(screen.getByText('Best score: 1200')).toBeTruthy();
    expect(screen.getAllByRole('group')).toHaveLength(4);
    expect(screen.getByText(/Crash Bash keeps its own records/)).toBeTruthy();
  });

  it('refreshes after another tab changes or clears a record and after focus', () => {
    render(<JamieLocalScorecard />);
    window.localStorage.setItem(JAMIE_RECORD_KEYS.tetris, '320');
    fireEvent(window, new StorageEvent('storage', { key: JAMIE_RECORD_KEYS.tetris }));
    expect(screen.getByText('Best score: 320')).toBeTruthy();
    window.localStorage.clear();
    fireEvent(window, new StorageEvent('storage', { key: null }));
    expect(screen.getByText('Best score: 0')).toBeTruthy();
    window.localStorage.setItem(JAMIE_RECORD_KEYS.tetris, '640');
    fireEvent.focus(window);
    expect(screen.getByText('Best score: 640')).toBeTruthy();
  });

  it('does not present unreadable storage as an empty record', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    render(<JamieLocalScorecard />);
    expect(screen.getAllByText('Storage unavailable')).toHaveLength(4);
    expect(screen.queryByText('Best score: 0')).toBeNull();
    expect(screen.getByText(/Games remain playable/)).toBeTruthy();
  });

  it('isolates a corrupt record, preserves valid records, and makes no writes', () => {
    window.localStorage.setItem(JAMIE_RECORD_KEYS.chess, '{"wins":{},"draws":0,"losses":0}');
    window.localStorage.setItem(JAMIE_RECORD_KEYS.tetris, '256');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<JamieLocalScorecard />);
    expect(screen.getByText('Saved record unreadable')).toBeTruthy();
    expect(screen.getByText('Best score: 256')).toBeTruthy();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('removes refresh listeners on unmount', () => {
    const { unmount } = render(<JamieLocalScorecard />);
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    unmount();
    fireEvent.focus(window);
    fireEvent(window, new StorageEvent('storage', { key: null }));
    expect(getItem).not.toHaveBeenCalled();
  });
});
