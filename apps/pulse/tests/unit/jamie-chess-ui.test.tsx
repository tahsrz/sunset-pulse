import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JamieChessGame } from '@/components/jamie-games/JamieChessGame';

describe('Play Jamie chess UI', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('plays a legal turn against Jamie and can undo the full turn', () => {
    render(<JamieChessGame />);

    fireEvent.click(screen.getByRole('gridcell', { name: /^e2, white pawn/ }));
    fireEvent.click(screen.getByRole('gridcell', { name: /^e4, empty, legal destination/ }));

    expect(screen.getByText('Jamie is calculating')).toBeTruthy();
    expect(screen.getByText('e4')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText('Your move')).toBeTruthy();
    const undo = screen.getByRole('button', { name: /undo turn/i });
    expect(undo).not.toBeDisabled();
    fireEvent.click(undo);

    expect(screen.queryByText('e4')).toBeNull();
    expect(screen.getByText('No moves yet.')).toBeTruthy();
  });
});
