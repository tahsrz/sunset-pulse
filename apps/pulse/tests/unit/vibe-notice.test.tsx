import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VibeNotice } from '@/app/vibes/_components/VibeNotice';

describe('VibeNotice', () => {
  it('uses alert semantics for errors and renders actions', () => {
    render(<VibeNotice tone="error" action={{ href: '/vibes', label: 'Back to Vibes' }}>Unable to save.</VibeNotice>);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save.');
    expect(screen.getByRole('link', { name: 'Back to Vibes' })).toHaveAttribute('href', '/vibes');
  });
});
