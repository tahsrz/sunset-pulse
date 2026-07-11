import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JamieTetrisGame } from '@/components/jamie-games/JamieTetrisGame';

describe('Play Jamie Block Drop UI', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it('hard drops a piece and supports pause and resume', () => {
    render(<JamieTetrisGame />);

    fireEvent.click(screen.getByRole('button', { name: 'Hard drop' }));
    expect(screen.getByRole('grid', { name: /Score [1-9]\d*/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByText('Game paused')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Move left' })).toBeDisabled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Resume' })[0]);
    expect(screen.queryByText('Game paused')).toBeNull();
    expect(screen.getByRole('button', { name: 'Move left' })).not.toBeDisabled();
  });
});
