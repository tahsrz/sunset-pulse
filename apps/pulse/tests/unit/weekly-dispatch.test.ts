import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock server-only compiler guard for Vitest environment
vi.mock('server-only', () => ({}));

// Mock @calcom/prisma client using vi.hoisted to prevent hoisting errors
const { mockPrismaFindMany } = vi.hoisted(() => ({
  mockPrismaFindMany: vi.fn(),
}));

vi.mock('@calcom/prisma', () => ({
  prisma: {
    booking: {
      findMany: mockPrismaFindMany,
    },
  },
}));

// Mock Twilio module using vi.hoisted
const { mockMessagesCreate } = vi.hoisted(() => ({
  mockMessagesCreate: vi.fn().mockResolvedValue({ sid: 'SMweeklymock123' }),
}));

vi.mock('twilio', () => {
  const mockClient = {
    messages: {
      create: mockMessagesCreate,
    },
  };
  return {
    default: vi.fn(() => mockClient),
  };
});

import { POST } from '@/app/api/scheduling/dispatch/route';
import { NextRequest } from 'next/server';

describe('Sunset Gas and Grill // Weekly Schedule SMS Dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Configure default environment keys
    process.env.SCHEDULER_DISPATCH_SECRET = 'test-dispatch-secret-999';
    process.env.TWILIO_FROM_NUMBER = '+18777804236';
    process.env.TWILIO_ACCOUNT_SID = 'ACrealcredentialsid';
    process.env.TWILIO_AUTH_TOKEN = 'realtokenhere';
    process.env.FALLBACK_NOTIFICATION_PHONE = '+15551112222';
    
    // Lock system time to a fixed Sunday (May 24, 2026)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return 401 when Authorization header is invalid or missing', async () => {
    const request = new NextRequest('http://localhost/api/scheduling/dispatch', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer wrong-secret',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    
    const body = await response.json();
    expect(body.error).toBe(true);
    expect(body.message).toContain('Unauthorized');
  });

  it('should calculate upcoming Mon-Sun range and compile + dispatch rosters correctly', async () => {
    // Current locked date: Sunday, May 24, 2026.
    // Upcoming Monday: May 25, 2026
    // Upcoming Sunday: May 31, 2026

    const mockBookings = [
      {
        id: 1,
        startTime: new Date('2026-05-25T10:00:00Z'), // Monday
        endTime: new Date('2026-05-25T22:00:00Z'),
        eventType: { slug: 'grill-shift' },
        user: {
          name: 'Mark',
          verifiedNumbers: [{ phoneNumber: '+15551111111' }],
        },
      },
      {
        id: 2,
        startTime: new Date('2026-05-27T10:00:00Z'), // Wednesday
        endTime: new Date('2026-05-27T22:00:00Z'),
        eventType: { slug: 'register-shift' },
        user: {
          name: 'Mark',
          verifiedNumbers: [{ phoneNumber: '+15551111111' }],
        },
      },
      {
        id: 3,
        startTime: new Date('2026-05-28T11:00:00Z'), // Thursday
        endTime: new Date('2026-05-28T23:00:00Z'),
        eventType: { slug: 'grill-shift' },
        user: {
          name: 'Jane',
          verifiedNumbers: [{ phoneNumber: '+15552222222' }],
        },
      },
    ];

    mockPrismaFindMany.mockResolvedValueOnce(mockBookings);

    const request = new NextRequest('http://localhost/api/scheduling/dispatch', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-dispatch-secret-999',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.bookingsProcessed).toBe(3);

    // Should fetch bookings in correct date range (Monday 00:00:00 to Sunday 23:59:59.999 local time)
    expect(mockPrismaFindMany).toHaveBeenCalledTimes(1);
    const queryArgs = mockPrismaFindMany.mock.calls[0][0];
    const startObj = queryArgs.where.startTime.gte;
    const endObj = queryArgs.where.startTime.lte;

    expect(startObj.getDay()).toBe(1); // 1 is Monday
    expect(startObj.getHours()).toBe(0);
    expect(startObj.getMinutes()).toBe(0);

    expect(endObj.getDay()).toBe(0); // 0 is Sunday
    expect(endObj.getHours()).toBe(23);
    expect(endObj.getMilliseconds()).toBe(999);

    // Messages sent: 2 for employees (Mark and Jane) + 1 master summary for manager
    expect(mockMessagesCreate).toHaveBeenCalledTimes(3);

    // Verify Mark's SMS content (should contain both shifts sorted chronologically)
    const markCall = mockMessagesCreate.mock.calls.find(call => call[0].to === '+15551111111');
    expect(markCall).toBeDefined();
    const markBody = markCall[0].body;
    expect(markBody).toContain('Hello Mark');
    expect(markBody).toContain('Monday: Grill Staff');
    expect(markBody).toContain('Wednesday: Register Staff');

    // Verify Jane's SMS content
    const janeCall = mockMessagesCreate.mock.calls.find(call => call[0].to === '+15552222222');
    expect(janeCall).toBeDefined();
    const janeBody = janeCall[0].body;
    expect(janeBody).toContain('Hello Jane');
    expect(janeBody).toContain('Thursday: Grill Staff');

    // Verify Manager Master Digest SMS content
    const managerCall = mockMessagesCreate.mock.calls.find(call => call[0].to === '+15551112222');
    expect(managerCall).toBeDefined();
    const managerBody = managerCall[0].body;
    expect(managerBody).toContain('MASTER WEEKLY SCHEDULE');
    expect(managerBody).toContain('Range: May 25 - May 31, 2026');
    expect(managerBody).toContain('Monday:\n  - Grill: Mark (+15551111111)');
    expect(managerBody).toContain('Tuesday:\n  - Grill: ⚠️ UNASSIGNED\n  - Register: ⚠️ UNASSIGNED');
    expect(managerBody).toContain('Thursday:\n  - Grill: Jane (+15552222222)');
  });
});
