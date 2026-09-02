import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VibeStatusViews } from '@/app/vibes/_components/VibeStatusViews';

describe('VibeStatusViews', () => {
  it('marks the selected view and emits changes', () => {
    const onChange = vi.fn();
    render(<VibeStatusViews views={[{ value: '', label: 'All', count: 3 }, { value: 'draft', label: 'Drafts', count: 2 }]} activeValue="draft" onChange={onChange} />);
    expect(screen.getByRole('button', { name: /Drafts/ })).toHaveAttribute('aria-current', 'page');
    screen.getByRole('button', { name: /All/ }).click();
    expect(onChange).toHaveBeenCalledWith('');
  });
});
