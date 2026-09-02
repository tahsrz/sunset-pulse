import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VibeEditorToolbar } from '@/app/vibes/_components/VibeEditorToolbar';

vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

describe('VibeEditorToolbar', () => {
  it('communicates dirty and conflict states', () => {
    render(<VibeEditorToolbar title="Coastal" dirty conflict previewHref="/vibes/coastal/preview" onSave={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Conflict detected');
    expect(screen.getByRole('link', { name: 'Preview' })).toHaveAttribute('href', '/vibes/coastal/preview');
  });
});
