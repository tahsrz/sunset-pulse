import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VibeEditor } from '@/app/vibes/[vibeId]/edit/VibeEditor';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const vibe = {
  vibeId: 'format-test',
  title: 'Format test',
  slug: 'format-test',
  status: 'draft',
  currentDraftVersion: 0,
  draftPayload: {
    title: 'Format test',
    slug: 'format-test',
    description: '',
    taxonomyTermIds: [],
    tokens: {
      visual: {
        theme: {
          colors: { primary: '#2563eb', background: '#0f172a', surface: '#1e293b', textPrimary: '#f8fafc', textSecondary: '#cbd5e1' },
          typography: { fontFamilyHeading: 'Inter', fontFamilyBody: 'Inter', baseFontSize: '16px', scaleRatio: 1.25, fontWeightNormal: 400, fontWeightBold: 700 },
          layout: { borderRadius: 'md', spacingBasePx: 4, elevation: 'subtle' },
        },
      },
      linguistic: { voice: { primaryTone: 'warm' } },
    },
    source: { kind: 'manual' },
  },
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('VibeEditor native validation', () => {
  it('loads normalized catalog terms and preserves their IDs in the draft payload', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      if (String(input) === '/api/vibes/taxonomy') {
        return new Response(JSON.stringify({
          terms: [{ id: 'mood:focused', group: 'mood', term: 'focused', label: 'Deep Focus' }],
        }), { status: 200 });
      }
      if (init?.method === 'PATCH') return new Response(JSON.stringify({ vibe }), { status: 200 });
      return new Response(JSON.stringify({ vibe }), { status: 200 });
    });

    render(<VibeEditor vibeId="format-test" />);
    const term = await screen.findByRole('checkbox', { name: /Deep Focus/i });
    expect(screen.getByRole('group', { name: 'Mood' })).toBeInTheDocument();
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    fireEvent.click(term);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    fireEvent.submit(screen.getByRole('button', { name: 'Save changes' }).closest('form')!);

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
      expect(patchCall).toBeDefined();
      expect(JSON.parse(String(patchCall?.[1]?.body)).draft.taxonomyTermIds).toEqual(['mood:focused']);
    });
  });

  it('presents hierarchical terms with their parent context', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      if (String(input) === '/api/vibes/taxonomy') return new Response(JSON.stringify({ terms: [
        { id: 'neighborhood:downtown', group: 'neighborhood', term: 'downtown', label: 'Downtown' },
        { id: 'neighborhood:downtown-east', group: 'neighborhood', term: 'downtown-east', label: 'Downtown East', parentId: 'neighborhood:downtown' },
      ] }), { status: 200 });
      return new Response(JSON.stringify({ vibe }), { status: 200 });
    });
    render(<VibeEditor vibeId="format-test" />);
    expect(await screen.findByText('Child of Downtown')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Downtown East, child of Downtown' })).toHaveAttribute('value', 'neighborhood:downtown-east');
  });

  it('keeps a selected term that is absent from the active catalog until the operator removes it', async () => {
    const vibeWithLegacyTerm = {
      ...vibe,
      draftPayload: { ...vibe.draftPayload, taxonomyTermIds: ['mood:archived-focus'] },
    };
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      if (String(input) === '/api/vibes/taxonomy') {
        return new Response(JSON.stringify({ terms: [] }), { status: 200 });
      }
      if (init?.method === 'PATCH') return new Response(JSON.stringify({ vibe: vibeWithLegacyTerm }), { status: 200 });
      return new Response(JSON.stringify({ vibe: vibeWithLegacyTerm }), { status: 200 });
    });

    render(<VibeEditor vibeId="format-test" />);
    const unavailableTerm = await screen.findByRole('checkbox', { name: /archived focus \(unavailable\)/i });
    expect(unavailableTerm).toBeChecked();
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Updated title' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Save changes' }).closest('form')!);

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
      expect(JSON.parse(String(patchCall?.[1]?.body)).draft.taxonomyTermIds).toEqual(['mood:archived-focus']);
    });
  });

  it('accepts the seeded base font size and submits the draft', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      if (init?.method === 'PATCH') return new Response(JSON.stringify({ vibe }), { status: 200 });
      return new Response(JSON.stringify({ vibe }), { status: 200 });
    });

    render(<VibeEditor vibeId="format-test" />);
    const input = await screen.findByRole('textbox', { name: /Base font size/i });
    expect(input).toBeValid();
    expect(input).toHaveAttribute('aria-describedby', 'base-font-size-help');
    expect(screen.getByText(/Use a number followed by px/)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '1.25rem' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Save changes' }).closest('form')!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/vibes/format-test?tenantId=default',
      expect.objectContaining({ method: 'PATCH' }),
    ));
  });

  it.each(['16', '12pt', '-1px', '16px trailing'])('rejects invalid base font size %s before submit', async (value) => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ vibe }), { status: 200 }));
    render(<VibeEditor vibeId="format-test" />);
    const input = await screen.findByRole('textbox', { name: /Base font size/i });
    fetchMock.mockClear();
    fireEvent.change(input, { target: { value } });
    expect(input).toBeInvalid();
    expect(input.closest('form')!.checkValidity()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
