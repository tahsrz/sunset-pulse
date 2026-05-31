import { describe, expect, it, vi } from 'vitest';
import { normalizeVerifoneEvent } from '@/lib/verifone/events';
import { signVerifonePayload, verifyVerifoneSignature } from '@/lib/verifone/signature';
import { applyVerifoneEventToOrder } from '@/lib/verifone/stateMachine';

describe('Verifone bridge integration helpers', () => {
  it('validates HMAC signatures over timestamp and body', () => {
    const body = JSON.stringify({ eventId: 'evt_1', type: 'PAYMENT_APPROVED', orderId: 'order_1' });
    const timestamp = String(Date.now());
    const secret = 'test-secret';
    const signature = signVerifonePayload(body, timestamp, secret);

    const result = verifyVerifoneSignature(
      body,
      new Headers({
        'x-pulse-signature': signature,
        'x-timestamp': timestamp,
      }),
      secret
    );

    expect(result.ok).toBe(true);
  });

  it('rejects expired signed bridge events', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-30T18:00:00.000Z'));

    const body = JSON.stringify({ eventId: 'evt_1', type: 'PAYMENT_APPROVED', orderId: 'order_1' });
    const timestamp = String(new Date('2026-05-30T17:50:00.000Z').getTime());
    const secret = 'test-secret';

    const result = verifyVerifoneSignature(
      body,
      new Headers({
        'x-pulse-signature': signVerifonePayload(body, timestamp, secret),
        'x-timestamp': timestamp,
      }),
      secret
    );

    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.message).toContain('Expired');

    vi.useRealTimers();
  });

  it('normalizes payment approval events and maps them to paid POS state', () => {
    const event = normalizeVerifoneEvent({
      eventId: 'evt_approved_1',
      type: 'PAYMENT_APPROVED',
      orderId: '665a00000000000000000001',
      posTransactionId: 'ruby-ci-12345',
      terminalId: 'Register 1',
      tenderType: 'CREDIT_DEBIT',
      authCode: 'A12345',
      amount: 12.99,
      idVerifiedByCashier: true,
    });

    const { updates, posEvent } = applyVerifoneEventToOrder(event, 'digest');

    expect(updates).toEqual(
      expect.objectContaining({
        paymentState: 'PAID_POS',
        isPaid: true,
        paymentReference: 'Verifone A12345',
        'posProperties.posTransactionId': 'ruby-ci-12345',
        'posProperties.posSyncStatus': 'SYNCED',
        'posProperties.idVerifiedByCashier': true,
      })
    );
    expect(posEvent).toEqual(
      expect.objectContaining({
        eventId: 'evt_approved_1',
        type: 'PAYMENT_APPROVED',
        posTransactionId: 'ruby-ci-12345',
        rawDigest: 'digest',
      })
    );
  });

  it('maps reversals to refunded and unpaid release state', () => {
    const event = normalizeVerifoneEvent({
      eventId: 'evt_reversal_1',
      type: 'REVERSAL',
      pickupCode: '123456',
      posTransactionId: 'ruby-ci-12345',
      terminalId: 'Register 1',
      amount: 12.99,
    });

    const { updates } = applyVerifoneEventToOrder(event, 'digest');

    expect(updates).toEqual(
      expect.objectContaining({
        paymentState: 'REFUNDED',
        isPaid: false,
        'posProperties.posSyncStatus': 'REVERSED',
      })
    );
  });
});
