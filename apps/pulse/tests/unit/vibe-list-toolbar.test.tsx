import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VibeListToolbar } from '@/app/vibes/_components/VibeListToolbar';

describe('VibeListToolbar', () => {
  it('keeps Apply disabled until a bulk action is selected', () => {
    render(<VibeListToolbar position="top" selectedCount={2} action="" onActionChange={vi.fn()} onApply={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveClass('w-48', 'pr-10');
  });
});
