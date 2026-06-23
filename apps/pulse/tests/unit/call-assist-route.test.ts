import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/call-assist/analyze/route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/call-assist/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

describe('call assist analyze route', () => {
  it('rejects requests without a transcript string', async () => {
    const response = await POST(request({ transcript: null }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(true);
    expect(body.message).toBe('transcript must be a string.');
  });

  it('returns a consent gate when caller consent is missing', async () => {
    const response = await POST(request({
      transcript: 'Caller wants a showing tomorrow.',
      consent: { disclosureRead: true, callerConsented: false }
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.consent.ready).toBe(false);
    expect(body.data.cards[0].id).toBe('consent-required');
  });

  it('returns live assist cards for consented transcripts', async () => {
    const response = await POST(request({
      transcript: 'Caller says the payment is expensive, but they are preapproved and want to tour.',
      consent: { disclosureRead: true, callerConsented: true },
      context: {
        callerName: 'Avery',
        propertyAddress: '123 Oak Trail',
        propertyPrice: 525000,
        budget: 500000
      }
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.intentScore).toBeGreaterThan(60);
    expect(body.data.cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'objection-price' }),
      expect.objectContaining({ id: 'next-question-payment' })
    ]));
  });
});
