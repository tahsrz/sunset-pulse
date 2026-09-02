import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VibeRowActions } from '@/app/vibes/_components/VibeRowActions';

describe('VibeRowActions', () => {
  it('renders keyboard-reachable links', () => {
    render(<VibeRowActions actions={[{ label: 'Edit', href: '/vibes/demo/edit' }, { label: 'Preview', href: '/vibes/demo/preview' }]} />);
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/vibes/demo/edit');
    expect(screen.getByRole('link', { name: 'Preview' })).toHaveAttribute('href', '/vibes/demo/preview');
  });
});
