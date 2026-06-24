import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  mockCreateRelaySession,
  mockFindByIdAndUpdate,
  mockPlaceInteractivePhoneRelayCall,
  mockPlacePhoneRelayCall,
} = vi.hoisted(() => ({
  mockCreateRelaySession: vi.fn().mockResolvedValue({
    id: 'relay-123',
    ticket: 'ORDER: 1 Honey Crunchy Corn Dog',
    callScript: 'Test script',
    madeDifferent: false,
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  mockFindByIdAndUpdate: vi.fn().mockResolvedValue({}),
  mockPlaceInteractivePhoneRelayCall: vi.fn().mockResolvedValue({
    success: true,
    sid: 'call-control-123',
  }),
  mockPlacePhoneRelayCall: vi.fn().mockResolvedValue({
    success: true,
    sid: 'call-control-123',
  }),
}));

vi.mock('@/models/Order', () => ({
  default: {
    findByIdAndUpdate: mockFindByIdAndUpdate,
  },
}));

vi.mock('@/lib/grill/relaySessions', () => ({
  createRelaySession: mockCreateRelaySession,
}));

vi.mock('@/lib/twilio', () => ({
  placeInteractivePhoneRelayCall: mockPlaceInteractivePhoneRelayCall,
  placePhoneRelayCall: mockPlacePhoneRelayCall,
}));

import { dispatchPaidOrderPhoneRelay } from '@/lib/grill/phoneRelay';

const paidOrder = {
  _id: 'order-123',
  isPaid: true,
  paymentState: 'PAID_STRIPE',
  items: [
    {
      id: 'corn-dog',
      name: 'Honey Crunchy Corn Dog',
      quantity: 1,
      price: 3.99,
    },
  ],
};

describe('phone relay dispatch guardrails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PHONE_RELAY_PUBLIC_BASE_URL;
    delete process.env.NEXT_PUBLIC_DOMAIN;
  });

  it('rejects malformed destination numbers before creating a relay session', async () => {
    const result = await dispatchPaidOrderPhoneRelay({
      order: paidOrder,
      to: '9403382260',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.reason).toContain('E.164');
    expect(mockCreateRelaySession).not.toHaveBeenCalled();
    expect(mockPlaceInteractivePhoneRelayCall).not.toHaveBeenCalled();
  });

  it('normalizes a bare callback domain for interactive relay calls', async () => {
    process.env.NEXT_PUBLIC_DOMAIN = 'sunsetpulse.app';

    const result = await dispatchPaidOrderPhoneRelay({
      order: paidOrder,
      to: '+19403382260',
      interactive: true,
    });

    expect(result.success).toBe(true);
    expect(mockCreateRelaySession).toHaveBeenCalledTimes(1);
    expect(mockPlaceInteractivePhoneRelayCall).toHaveBeenCalledWith(
      '+19403382260',
      'https://sunsetpulse.app/api/grill/relay/twiml/relay-123',
      'https://sunsetpulse.app/api/grill/relay/call-status/relay-123',
      { relayId: 'relay-123' },
    );
  });

  it('rejects empty or malformed order items before dialing', async () => {
    const result = await dispatchPaidOrderPhoneRelay({
      order: {
        ...paidOrder,
        items: [{ id: '', name: '', quantity: 0 }],
      },
      to: '+19403382260',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.reason).toContain('valid phone relay items');
    expect(mockPlaceInteractivePhoneRelayCall).not.toHaveBeenCalled();
  });
});
