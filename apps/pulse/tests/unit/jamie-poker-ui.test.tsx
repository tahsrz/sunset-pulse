import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JamiePokerGame } from '@/components/jamie-games/JamiePokerGame';

describe('Play Jamie poker UI', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it('renders a playable poker table and advances after a check', () => {
    render(<JamiePokerGame random={() => 0.99} />);

    expect(screen.getByRole('heading', { name: /Texas Hold'em with Jamie/i })).toBeTruthy();
    expect(screen.getByText('Preflop')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Check' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.getByText('Flop')).toBeTruthy();
    expect(screen.getByLabelText('Community card 1')).toBeTruthy();
  });
});
