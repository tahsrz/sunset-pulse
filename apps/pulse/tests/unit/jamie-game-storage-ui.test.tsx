import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JamieChessGame } from '@/components/jamie-games/JamieChessGame';
import { JamiePokerGame } from '@/components/jamie-games/JamiePokerGame';
import { JamieTetrisGame } from '@/components/jamie-games/JamieTetrisGame';
import { JamieVolleyGame } from '@/components/jamie-games/JamieVolleyGame';

describe('Jamie games with unavailable browser storage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([
    ['chess', JamieChessGame],
    ['poker', JamiePokerGame],
    ['Block Drop', JamieTetrisGame],
    ['volley', JamieVolleyGame],
  ] as const)('opens %s when storage reads are denied', (_name, Game) => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    expect(() => render(<Game />)).not.toThrow();
    expect(screen.getByRole('main')).toBeTruthy();
  });

  it('keeps Block Drop playable when saving the high score exceeds storage quota', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    render(<JamieTetrisGame />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Hard drop' }))).not.toThrow();
    expect(screen.getByRole('grid', { name: /Score [1-9]\d*/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByText('Game paused')).toBeTruthy();
  });
});
