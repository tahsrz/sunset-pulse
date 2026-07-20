import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  sendMessage: vi.fn(),
  stop: vi.fn(),
  useChat: vi.fn(),
}));

vi.mock('@ai-sdk/react', () => ({ useChat: mocks.useChat }));
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    DefaultChatTransport: class DefaultChatTransport {},
  };
});

import { JamieGuideWorkspace } from '@/components/chat/JamieGuideWorkspace';

const listing = {
  id: 'listing-100',
  mlsId: 'MLS-100',
  name: '100 Verified Street',
  city: 'Frisco',
  state: 'TX',
  href: 'https://sunsetpulse.app/properties/MLS-100',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('React', React);
  vi.stubGlobal('ResizeObserver', class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.fetch.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/sites/leads') {
      return new Response(JSON.stringify({ accepted: true, id: 'lead-1' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(null, { status: 204 });
  });
  mocks.useChat.mockReturnValue({
    messages: [
      {
        id: 'message-user',
        role: 'user',
        parts: [{ type: 'text', text: 'Find a three bedroom home under $750,000.' }],
      },
      {
        id: 'message-assistant',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'I found one verified home and can send a compact brief to the agent.' },
          {
            type: 'data-listings',
            data: { properties: [listing], disclaimer: 'MLS data disclaimer.' },
          },
          {
            type: 'data-actions',
            data: {
              items: [{
                id: 'contact_agent',
                description: 'Send a private, consented inquiry to the agent.',
                kind: 'handoff',
                label: 'Contact Verified Agent',
              }],
            },
          },
        ],
      },
    ],
    sendMessage: mocks.sendMessage,
    status: 'ready',
    error: null,
    stop: mocks.stop,
  });
});

afterEach(() => {
  cleanup();
  delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  vi.unstubAllGlobals();
});

describe('Jamie public guide handoff UI', () => {
  it('submits only consented, bounded conversation context and the stated next step', async () => {
    render(
      <JamieGuideWorkspace
        initialContext={{
          listing,
          agent: {
            agentId: 'agent-1',
            agentName: 'Verified Agent',
            brokerageName: 'Verified Realty',
            primaryColor: '#38bdf8',
            publicUrl: 'https://verified.sunsetpulse.app',
            site: 'verified',
            siteName: 'Verified Homes',
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Contact Verified Agent/i }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Taylor Visitor' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taylor@example.com' } });
    fireEvent.change(screen.getByLabelText('What should happen next?'), {
      target: { value: 'schedule_tour' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Send private inquiry' }));

    await screen.findByText('Inquiry sent.');
    const leadCall = mocks.fetch.mock.calls.find(([url]) => url === '/api/sites/leads');
    expect(leadCall).toBeTruthy();
    const payload = JSON.parse(String(leadCall?.[1]?.body));

    expect(payload).toMatchObject({
      source: 'jamie_public_guide',
      consent: true,
      listing: { id: 'listing-100', mlsId: 'MLS-100', name: '100 Verified Street' },
      guide: {
        nextStep: 'schedule_tour',
        discussedListingIds: ['MLS-100'],
        conversation: [
          { role: 'user', text: 'Find a three bedroom home under $750,000.' },
          { role: 'assistant', text: 'I found one verified home and can send a compact brief to the agent.' },
        ],
      },
    });
    expect(payload.guide.sessionId).toEqual(expect.any(String));
    expect(payload).not.toHaveProperty('pagePath');
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledWith(
      '/api/jamie/guide/events',
      expect.objectContaining({ method: 'POST' }),
    ));
  });
});
