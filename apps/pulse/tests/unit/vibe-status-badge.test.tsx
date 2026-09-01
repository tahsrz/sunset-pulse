import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VibeStatusBadge } from '@/app/vibes/_components/VibeStatusBadge';

describe('VibeStatusBadge', () => {
  it('formats lifecycle labels while preserving unknown values', () => {
    render(<VibeStatusBadge status="in_review" />);
    expect(screen.getByText('in review')).toBeInTheDocument();
    render(<VibeStatusBadge status="custom_state" />);
    expect(screen.getByText('custom state')).toBeInTheDocument();
  });
});
