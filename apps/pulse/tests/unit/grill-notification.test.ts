import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only compiler guard for Vitest environment
vi.mock('server-only', () => ({}));

import { notifyStaffOfBurgerOrder, sendSMS } from '@/lib/twilio';
import twilio from 'twilio';

// Mock Twilio module
vi.mock('twilio', () => {
  const mockMessagesCreate = vi.fn().mockResolvedValue({ sid: 'SMmockedsid12345' });
  const mockClient = {
    messages: {
      create: mockMessagesCreate,
    },
  };
  const mockTwilio = vi.fn(() => mockClient);
  return {
    default: mockTwilio,
  };
});

describe('Sunset Gas and Grill // SMS Notification System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TWILIO_FROM_NUMBER = '+15550001111';
    process.env.TWILIO_ACCOUNT_SID = 'ACrealcredentialsid';
    process.env.TWILIO_AUTH_TOKEN = 'realtokenhere';
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

    const twilioMock = twilio() as any;
    expect(twilioMock.messages.create).toHaveBeenCalledTimes(2);

    // Verify content of first SMS
    const firstCallArgs = twilioMock.messages.create.mock.calls[0][0];
    expect(firstCallArgs.to).toBe(grillPhone);
    expect(firstCallArgs.body).toContain('NEW BURGER ORDER');
    expect(firstCallArgs.body).toContain('2x Hamburger Basket');
    expect(firstCallArgs.body).toContain('1x Cheeseburger');
    expect(firstCallArgs.body).toContain('Total: $28.47');
    expect(firstCallArgs.body).toContain('Role: GRILL STAFF');

    // Verify content of second SMS
    const secondCallArgs = twilioMock.messages.create.mock.calls[1][0];
    expect(secondCallArgs.to).toBe(registerPhone);
    expect(secondCallArgs.body).toContain('Role: REGISTER STAFF');
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

    const twilioMock = twilio() as any;
    expect(twilioMock.messages.create).toHaveBeenCalledTimes(1);
    expect(twilioMock.messages.create.mock.calls[0][0].to).toBe('+15557776666');
  });

  it('should gracefully handle Twilio dispatch errors', async () => {
    const mockOrder = {
      _id: '664f33fae73a38dfbf9df193',
      items: [{ name: 'Hamburger', quantity: 1, price: 7.99 }],
      totalAmount: 7.99,
    };

    const twilioMock = twilio() as any;
    twilioMock.messages.create.mockRejectedValueOnce(new Error('Twilio Network Timeout'));

    const results = await notifyStaffOfBurgerOrder(mockOrder, '+15559998888', null);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe('Twilio Network Timeout');
  });
});
