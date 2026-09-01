import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { VibePanel } from '@/app/vibes/_components/VibePanel';

describe('VibePanel', () => {
  it('toggles visibility while keeping content mounted', () => {
    render(<VibePanel id="metadata" title="Metadata" defaultOpen><input aria-label="Title" name="title" defaultValue="Example" /></VibePanel>);
    const toggle = screen.getByRole('button', { name: 'Metadata' });
    const input = screen.getByRole('textbox', { name: 'Title' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(input).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
