import { describe, expect, it } from 'vitest';
import { POST as createOrder } from '@/app/api/orders/route';
import { POST as prepareCounterPayment } from '@/app/api/verifone/transaction/prepare/route';

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('grill Stripe-only checkout guardrails', () => {
  it('rejects direct order creation that is not part of Stripe checkout', async () => {
    const response = await createOrder(jsonRequest('http://localhost/api/orders', {
      items: [{ id: 'burger', name: 'Burger', quantity: 1, price: 7.99 }],
    }) as any);
    const body = await response.json();

    expect(response.status).toBe(402);
    expect(body.message).toContain('Stripe checkout');
  });

  it('keeps counter payment preparation disabled by default', async () => {
    const response = await prepareCounterPayment(jsonRequest('http://localhost/api/verifone/transaction/prepare', {
      orderId: '665a00000000000000000001',
    }) as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toContain('paid online');
  });
});
