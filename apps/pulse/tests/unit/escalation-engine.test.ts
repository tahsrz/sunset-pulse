import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock server-only compiler guard
vi.mock('server-only', () => ({}));

// Mock Supabase logEvent
vi.mock('@/lib/supabase', () => ({
  logEvent: vi.fn().mockResolvedValue({}),
}));

// Mock Twilio sendSMS
const { mockSendSMS } = vi.hoisted(() => ({
  mockSendSMS: vi.fn().mockResolvedValue({ success: true, sid: 'mockSmsSid123' }),
}));

vi.mock('@/lib/twilio', () => ({
  sendSMS: mockSendSMS,
}));

// Mock Prisma
const {
  mockPrismaShiftEscalationFindMany,
  mockPrismaShiftEscalationUpdate,
  mockPrismaBookingFindUnique,
  mockPrismaBookingFindMany,
  mockPrismaUserFindMany,
  mockPrismaSmsShiftOfferFindFirst,
  mockPrismaSmsShiftOfferCreate,
  mockPrismaSmsShiftOfferUpdateMany,
  mockPrismaTransaction,
} = vi.hoisted(() => ({
  mockPrismaShiftEscalationFindMany: vi.fn(),
  mockPrismaShiftEscalationUpdate: vi.fn(),
  mockPrismaBookingFindUnique: vi.fn(),
  mockPrismaBookingFindMany: vi.fn(),
  mockPrismaUserFindMany: vi.fn(),
  mockPrismaSmsShiftOfferFindFirst: vi.fn(),
  mockPrismaSmsShiftOfferCreate: vi.fn(),
  mockPrismaSmsShiftOfferUpdateMany: vi.fn(),
  mockPrismaTransaction: vi.fn((p) => Promise.all(p)),
}));

vi.mock('@calcom/prisma', () => ({
  prisma: {
    shiftEscalation: {
      findMany: mockPrismaShiftEscalationFindMany,
      update: mockPrismaShiftEscalationUpdate,
    },
    booking: {
      findUnique: mockPrismaBookingFindUnique,
      findMany: mockPrismaBookingFindMany,
    },
    user: {
      findMany: mockPrismaUserFindMany,
    },
    smsShiftOffer: {
      findFirst: mockPrismaSmsShiftOfferFindFirst,
      create: mockPrismaSmsShiftOfferCreate,
      updateMany: mockPrismaSmsShiftOfferUpdateMany,
    },
    $transaction: mockPrismaTransaction,
  },
}));

import { POST } from '@/app/api/scheduling/escalation/cron/route';

describe('Shift Drop Auto-Escalation Engine // Cron Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SCHEDULER_DISPATCH_SECRET = 'cron-secret-abc';
    process.env.FALLBACK_NOTIFICATION_PHONE = '+15559990000';
  });

  it('should promote an escalation from Tier 1 to Tier 2 and dispatch SMS', async () => {
    // 1. Mock expired pending escalations
    mockPrismaShiftEscalationFindMany.mockResolvedValue([
      {
        id: 'esc-uuid-111',
        bookingId: 501,
        currentTier: 1,
        status: 'PENDING',
      },
    ]);

    // 2. Mock booking shift details
    mockPrismaBookingFindUnique.mockResolvedValue({
      id: 501,
      startTime: new Date('2026-05-25T18:00:00.000Z'),
      endTime: new Date('2026-05-26T03:00:00.000Z'),
      userId: null, // open
      eventType: { slug: 'grill-shift' },
    });

    // 3. Mock active employees to broadcast to
    mockPrismaUserFindMany.mockResolvedValue([
      {
        id: 51,
        name: 'Shaikh',
        email: 'shaikh@sunsetgrill.com',
        verifiedNumbers: [{ phoneNumber: '+12145550001' }],
      },
    ]);

    // Mock no existing offers for Shaikh on this shift (to allow sending one)
    mockPrismaSmsShiftOfferFindFirst.mockResolvedValue(null);

    // Mock overlap check
    mockPrismaBookingFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/scheduling/escalation/cron', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer cron-secret-abc' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.processedCount).toBe(1);
    expect(data.data.details[0].status).toBe('PROMOTED_TO_TIER2');

    // Assert SMS dispatched to Shaikh (+12145550001)
    expect(mockSendSMS).toHaveBeenCalledWith('+12145550001', expect.stringContaining('Shift available:'));
    expect(mockPrismaShiftEscalationUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'esc-uuid-111' },
      data: expect.objectContaining({ currentTier: 2 }),
    }));
  });

  it('should escalate an escalation from Tier 2 to Tier 3, cancel pending offers, and SMS alert manager', async () => {
    mockPrismaShiftEscalationFindMany.mockResolvedValue([
      {
        id: 'esc-uuid-222',
        bookingId: 502,
        currentTier: 2,
        status: 'PENDING',
      },
    ]);

    mockPrismaBookingFindUnique.mockResolvedValue({
      id: 502,
      startTime: new Date('2026-05-25T18:00:00.000Z'),
      endTime: new Date('2026-05-26T03:00:00.000Z'),
      userId: null,
      eventType: { slug: 'register-shift' },
    });

    const req = new NextRequest('http://localhost/api/scheduling/escalation/cron', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer cron-secret-abc' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.details[0].status).toBe('FAILED_TO_TIER3');

    // Assert pending offers expired
    expect(mockPrismaSmsShiftOfferUpdateMany).toHaveBeenCalledWith({
      where: { bookingId: 502, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });

    // Assert critical alert SMS sent to manager Fallback number (+15559990000)
    expect(mockSendSMS).toHaveBeenCalledWith('+15559990000', expect.stringContaining('CRITICAL:'));
  });
});
