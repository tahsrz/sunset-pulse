import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import BuyerStart from '@/app/buyer-plan/start/page';
import GuidedBuyerRequestForm from '@/components/lead-capture/journey/GuidedBuyerRequestForm';
import { isLightweightGlobalSurface, isMinimalChromeSurface } from '@/lib/navigation/focusedSurfaces';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('requires an enabled rollout and a valid site to open the focused form', async () => {
  const searchParams = Promise.resolve({ utm_source: 'local', utm_content: 'person@example.test' });
  vi.stubEnv('BUYER_REQUEST_AGENT_SITE', 'buyer-example');
  vi.stubEnv('BUYER_GUIDED_INTAKE_ENABLED', 'false');
  await expect(BuyerStart({ searchParams })).rejects.toThrow('NOT_FOUND');
  vi.stubEnv('BUYER_GUIDED_INTAKE_ENABLED', 'true');
  vi.stubEnv('BUYER_REQUEST_AGENT_SITE', 'https://buyer-example.test');
  await expect(BuyerStart({ searchParams })).rejects.toThrow('NOT_FOUND');
  vi.stubEnv('BUYER_REQUEST_AGENT_SITE', 'buyer-example');
  const page = await BuyerStart({ searchParams });
  expect(page.props).toEqual({ campaign: { source: 'local' } });
  expect(isLightweightGlobalSurface('/buyer-plan/start')).toBe(true);
  expect(isMinimalChromeSurface('/buyer-plan/start')).toBe(true);
});

function choose(value: string) {
  fireEvent.click(screen.getByRole('radio', { name: value }));
  fireEvent.click(screen.getByRole('button', { name: /^Next/ }));
}

it('reviews editable answers, waits for an accepted receipt, and reuses the ID on a retry', async () => {
  let finish!: (response: Response) => void;
  const pending = new Promise<Response>(resolve => { finish = resolve; });
  const fetcher = vi.fn<typeof fetch>().mockReturnValueOnce(pending)
    .mockResolvedValueOnce(Response.json({ success: true, accepted: true, duplicate: true }));
  const firstId = '11111111-1111-4111-8111-111111111111';
  const uuid = vi.fn(() => firstId);
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('crypto', { randomUUID: uuid });
  const { container } = render(<GuidedBuyerRequestForm />);

  expect(screen.queryByText('I’m Not Buying Right Now')).toBeNull();
  for (const value of ['Looking at Homes', 'Yes', 'An Existing Home', 'No', 'Yes']) choose(value);
  expect(screen.getByRole('heading', { name: 'Review Your Answers' })).toHaveFocus();
  expect(screen.queryByText(/approved amount/i)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /edit what kind of home/i }));
  expect(screen.getByRole('radio', { name: 'An Existing Home' })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: 'New Construction' }));
  fireEvent.click(screen.getByRole('button', { name: 'Back to Review' }));
  expect(screen.getByText('New Construction')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Next/ }));
  expect(fetcher).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'Taylor Example' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'TAYLOR@example.test' } });
  const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
  send();
  expect(fetcher).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Choose whether we may respond');
  fireEvent.click(screen.getByRole('checkbox', { name: /email about this request/i }));
  expect(screen.getByRole('checkbox', { name: /optional/i })).not.toBeChecked();
  send();
  expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
  fireEvent.submit(container.querySelector('form')!);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('heading', { name: 'Request Received' })).toBeNull();
  await act(async () => { finish(Response.json({ success: true })); });
  expect(screen.getByRole('alert')).toHaveTextContent('Please try again');

  send();
  expect(await screen.findByRole('heading', { name: 'Request Received' })).toHaveFocus();
  expect(screen.getByRole('link', { name: 'Open Explorer' })).toHaveAttribute('href', '/explorer');
  expect(uuid).toHaveBeenCalledOnce();
  for (const [url, init] of fetcher.mock.calls) {
    expect(url).toBe('/api/buyer-requests');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      offerKey: 'sunset-pulse-buyer-plan', offerVersion: '1', submissionId: firstId,
      name: 'Taylor Example', email: 'taylor@example.test', requestedContact: true, marketingOptIn: false, company: '',
      journey: { mode: 'buy', buyingStage: { state: 'answered', value: 'searching' }, buyerPreferences: {
        destination: { state: 'answered', value: 'local' }, construction: { state: 'answered', value: 'new' },
        representation: { state: 'answered', value: 'no' }, preApproval: 'yes',
      } },
    });
  }
});
