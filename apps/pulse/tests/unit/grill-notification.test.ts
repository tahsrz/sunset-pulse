import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only compiler guard for Vitest environment
vi.mock('server-only', () => ({}));

import { notifyStaffOfBurgerOrder, sendSMS } from '@/lib/twilio';
import { sendTelnyxSMS } from '@/lib/messaging/telnyxClient';

const { mockSendTelnyxSMS } = vi.hoisted(() => ({
  mockSendTelnyxSMS: vi.fn().mockResolvedValue({ success: true, messageId: 'telnyx-message-12345' }),
}));

vi.mock('@/lib/messaging/telnyxClient', () => {
  return {
    sendTelnyxSMS: mockSendTelnyxSMS,
  };
});

describe('Sunset Gas and Grill // SMS Notification System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELNYX_FROM_NUMBER = '+15550001111';
    process.env.TELNYX_API_KEY = 'test-telnyx-key';
    process.env.TELNYX_MESSAGING_PROFILE_ID = 'test-profile-id';
  });

  it('should format message and dispatch SMS to both scheduled employees', async () => {
    const mockOrder = {
      _id: '664f33fae73a38dfbf9df193',
      items: [
        { name: 'Hamburger Basket', quantity: 2, price: 9.99 },
        { name: 'Cheeseburger', quantity: 1, price: 8.49 },
      ],
      totalAmount: 28.47,
    };

    const grillPhone = '+15559998888';
    const registerPhone = '+15557776666';

    const results = await notifyStaffOfBurgerOrder(mockOrder, grillPhone, registerPhone);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);

    expect(sendTelnyxSMS).toHaveBeenCalledTimes(2);

    // Verify content of first SMS
    const firstCallArgs = mockSendTelnyxSMS.mock.calls[0];
    expect(firstCallArgs[0]).toBe(grillPhone);
    expect(firstCallArgs[1]).toContain('NEW BURGER ORDER');
    expect(firstCallArgs[1]).toContain('2x Hamburger Basket');
    expect(firstCallArgs[1]).toContain('1x Cheeseburger');
    expect(firstCallArgs[1]).toContain('Total: $28.47');
    expect(firstCallArgs[1]).toContain('Role: GRILL STAFF');

    // Verify content of second SMS
    const secondCallArgs = mockSendTelnyxSMS.mock.calls[1];
    expect(secondCallArgs[0]).toBe(registerPhone);
    expect(secondCallArgs[1]).toContain('Role: REGISTER STAFF');
  });

  it('should skip sending if phone number is missing but log warning', async () => {
    const mockOrder = {
      _id: '664f33fae73a38dfbf9df193',
      items: [{ name: 'Bacon Cheeseburger', quantity: 1, price: 10.99 }],
      totalAmount: 10.99,
    };

    const results = await notifyStaffOfBurgerOrder(mockOrder, null, '+15557776666');

    // Only 1 SMS should be dispatched (to register)
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);

    expect(sendTelnyxSMS).toHaveBeenCalledTimes(1);
    expect(mockSendTelnyxSMS.mock.calls[0][0]).toBe('+15557776666');
  });

  it('should gracefully handle Telnyx dispatch errors', async () => {
    const mockOrder = {
      _id: '664f33fae73a38dfbf9df193',
      items: [{ name: 'Hamburger', quantity: 1, price: 7.99 }],
      totalAmount: 7.99,
    };

    mockSendTelnyxSMS.mockResolvedValueOnce({ success: false, error: 'Telnyx Network Timeout' });

    const results = await notifyStaffOfBurgerOrder(mockOrder, '+15559998888', null);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe('Telnyx Network Timeout');
  });

  it('rejects malformed phone numbers before dispatching to Telnyx', async () => {
    const result = await sendSMS('9403382260', 'Test message');

    expect(result.success).toBe(false);
    expect(result.reason).toContain('E.164');
    expect(sendTelnyxSMS).not.toHaveBeenCalled();
  });
});
