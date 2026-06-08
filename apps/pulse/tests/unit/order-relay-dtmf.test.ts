import { describe, expect, it } from 'vitest';
import { POST as handleRelayInput } from '@/app/api/grill/relay/input/[relayId]/route';
import { GET as getRelayStatus } from '@/app/api/grill/relay/status/[relayId]/route';
import { GET as getRelayTwiml } from '@/app/api/grill/relay/twiml/[relayId]/route';
import { createRelaySession } from '@/lib/grill/relaySessions';

describe('AI phone relay keypad flow', () => {
  it('serves TwiML that gathers one keypad digit', async () => {
    const session = createRelaySession({
      ticket: 'ORDER: 1 Cheeseburger Basket',
      callScript: 'Test order script.',
      madeDifferent: false,
    });

    const response = await getRelayTwiml(new Request('http://localhost/api/grill/relay/twiml/test'), {
      params: Promise.resolve({ relayId: session.id }),
    });
    const body = await response.text();

    expect(response.headers.get('content-type')).toContain('text/xml');
    expect(body).toContain('<Gather input="dtmf" numDigits="1" timeout="8"');
    expect(body).toContain('Press 1 to skip to the order.');
    expect(body).toContain('press 2 to confirm');
    expect(body).toContain('press 3 to repeat');
  });

  it('serves the order readout with confirm and repeat options', async () => {
    const session = createRelaySession({
      ticket: 'ORDER: 1 Cheeseburger Basket',
      callScript: 'Test order script.',
      madeDifferent: false,
    });

    const response = await getRelayTwiml(new Request('http://localhost/api/grill/relay/twiml/test?section=order'), {
      params: Promise.resolve({ relayId: session.id }),
    });
    const body = await response.text();

    expect(body).toContain('Test order script.');
    expect(body).toContain('Press 2 to confirm the order.');
    expect(body).toContain('Press 3 to repeat the order.');
  });

  it('skips to the order when employee presses 1', async () => {
    const session = createRelaySession({
      ticket: 'ORDER: 1 Cheeseburger Basket',
      callScript: 'Test order script.',
      madeDifferent: false,
    });
    const formData = new FormData();
    formData.set('Digits', '1');

    const response = await handleRelayInput(new Request('http://localhost/api/grill/relay/input/test', {
      method: 'POST',
      body: formData,
    }), {
      params: Promise.resolve({ relayId: session.id }),
    });
    const body = await response.text();

    expect(body).toContain(`<Redirect method="GET">/api/grill/relay/twiml/${session.id}?section=order</Redirect>`);
  });

  it('marks a relay session confirmed when employee presses 2', async () => {
    const session = createRelaySession({
      ticket: 'ORDER: 1 Cheeseburger Basket',
      callScript: 'Test order script.',
      madeDifferent: false,
    });
    const formData = new FormData();
    formData.set('Digits', '2');

    const response = await handleRelayInput(new Request('http://localhost/api/grill/relay/input/test', {
      method: 'POST',
      body: formData,
    }), {
      params: Promise.resolve({ relayId: session.id }),
    });
    const body = await response.text();
    const statusResponse = await getRelayStatus(new Request('http://localhost/api/grill/relay/status/test'), {
      params: Promise.resolve({ relayId: session.id }),
    });
    const status = await statusResponse.json();

    expect(body).toContain('The order is confirmed for pickup.');
    expect(status.data.status).toBe('confirmed');
    expect(status.data.lastDigits).toBe('2');
  });

  it('redirects to repeat when employee presses 3', async () => {
    const session = createRelaySession({
      ticket: 'ORDER: 1 Cheeseburger Basket',
      callScript: 'Test order script.',
      madeDifferent: false,
    });
    const formData = new FormData();
    formData.set('Digits', '3');

    const response = await handleRelayInput(new Request('http://localhost/api/grill/relay/input/test', {
      method: 'POST',
      body: formData,
    }), {
      params: Promise.resolve({ relayId: session.id }),
    });
    const body = await response.text();

    expect(body).toContain(`<Redirect method="GET">/api/grill/relay/twiml/${session.id}?section=order</Redirect>`);
  });
});
