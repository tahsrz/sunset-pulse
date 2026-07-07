import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JamieVolleyGame } from '@/components/jamie-games/JamieVolleyGame';

describe('Play Jamie Sunset Volley UI', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it('renders the court and starts a playable rally', () => {
    render(<JamieVolleyGame />);

    expect(screen.getByRole('heading', { name: /Sunset Volley with Jamie/i })).toBeTruthy();
    expect(screen.getByRole('application', { name: /Sunset Volley court/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Left' })).toBeDisabled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Serve' })[0]);

    expect(screen.getByRole('button', { name: 'Left' })).not.toBeDisabled();
    expect(screen.getByLabelText('Volleyball')).toBeTruthy();
  });
});
