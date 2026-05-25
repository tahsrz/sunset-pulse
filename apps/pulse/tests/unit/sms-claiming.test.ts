import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock server-only compiler guard
vi.mock('server-only', () => ({}));

// Mock Supabase logEvent
vi.mock('@/lib/supabase', () => ({
  logEvent: vi.fn().mockResolvedValue({}),
}));

// Mock Prisma
const {
  mockPrismaVerifiedNumberFindFirst,
  mockPrismaSmsShiftOfferFindFirst,
  mockPrismaSmsShiftOfferUpdate,
  mockPrismaSmsShiftOfferUpdateMany,
  mockPrismaBookingFindUnique,
  mockPrismaBookingFindMany,
  mockPrismaBookingUpdate,
  mockPrismaUserFindUnique,
  mockPrismaTransaction,
} = vi.hoisted(() => ({
  mockPrismaVerifiedNumberFindFirst: vi.fn(),
  mockPrismaSmsShiftOfferFindFirst: vi.fn(),
  mockPrismaSmsShiftOfferUpdate: vi.fn(),
  mockPrismaSmsShiftOfferUpdateMany: vi.fn(),
  mockPrismaBookingFindUnique: vi.fn(),
  mockPrismaBookingFindMany: vi.fn(),
  mockPrismaBookingUpdate: vi.fn(),
  mockPrismaUserFindUnique: vi.fn(),
  mockPrismaTransaction: vi.fn((p) => Promise.all(p)),
}));

vi.mock('@calcom/prisma', () => ({
  prisma: {
    verifiedNumber: {
      findFirst: mockPrismaVerifiedNumberFindFirst,
    },
    smsShiftOffer: {
      findFirst: mockPrismaSmsShiftOfferFindFirst,
      update: mockPrismaSmsShiftOfferUpdate,
      updateMany: mockPrismaSmsShiftOfferUpdateMany,
    },
    booking: {
      findUnique: mockPrismaBookingFindUnique,
      findMany: mockPrismaBookingFindMany,
      update: mockPrismaBookingUpdate,
    },
    user: {
      findUnique: mockPrismaUserFindUnique,
    },
    $transaction: mockPrismaTransaction,
  },
}));

import { POST } from '@/app/api/scheduling/sms/incoming/route';

describe('Bidirectional SMS Webhook // Claim response tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process ACCEPT body correctly and claim the pending offer', async () => {
    // 1. Mock verified number lookup for Beth
    mockPrismaVerifiedNumberFindFirst.mockResolvedValue({
      id: 5,
      phoneNumber: '+18175551234',
      userId: 2,
      user: {
        id: 2,
        name: 'Beth',
        email: 'beth@sunsetgrill.com',
      },
    });

    // 2. Mock pending shift offer lookup
    mockPrismaSmsShiftOfferFindFirst.mockResolvedValue({
      id: 'offer-uuid-777',
      bookingId: 444,
      userId: 2,
      phoneNumber: '+18175551234',
      status: 'PENDING',
    });

    // 3. Mock shift booking details
    mockPrismaBookingFindUnique.mockResolvedValue({
      id: 444,
      startTime: new Date('2026-05-25T18:00:00.000Z'),
      endTime: new Date('2026-05-26T03:00:00.000Z'),
      userId: null, // open, unassigned
      eventType: { title: 'Register Shift' },
    });

    // 4. Mock user details
    mockPrismaUserFindUnique.mockResolvedValue({
      id: 2,
      name: 'Beth',
      email: 'beth@sunsetgrill.com',
    });

    // 5. Mock no conflicting shifts on same day
    mockPrismaBookingFindMany.mockResolvedValue([]);

    // Create simulated Twilio form-data POST payload
    const formData = new FormData();
    formData.append('From', '+18175551234');
    formData.append('Body', 'ACCEPT');

    const req = new NextRequest('http://localhost/api/scheduling/sms/incoming', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const xmlText = await res.text();
    expect(xmlText).toContain('<Response>');
    expect(xmlText).toContain('<Message>');
    expect(xmlText).toContain('Success! You have claimed');

    // Assert database modifications inside $transaction
    expect(mockPrismaBookingUpdate).toHaveBeenCalled();
    expect(mockPrismaSmsShiftOfferUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'offer-uuid-777' },
      data: { status: 'CLAIMED' },
    }));
  });

  it('should return error when shift is already claimed by someone else', async () => {
    mockPrismaVerifiedNumberFindFirst.mockResolvedValue({
      id: 5,
      phoneNumber: '+18175551234',
      userId: 2,
      user: { id: 2, name: 'Beth', email: 'beth@sunsetgrill.com' },
    });

    mockPrismaSmsShiftOfferFindFirst.mockResolvedValue({
      id: 'offer-uuid-777',
      bookingId: 444,
      userId: 2,
    });

    mockPrismaBookingFindUnique.mockResolvedValue({
      id: 444,
      userId: 50, // Sherrie already claimed this shift!
      eventType: { title: 'Register Shift' },
    });

    const formData = new FormData();
    formData.append('From', '+18175551234');
    formData.append('Body', 'ACCEPT');

    const req = new NextRequest('http://localhost/api/scheduling/sms/incoming', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    const xmlText = await res.text();
    expect(xmlText).toContain('already been claimed by another team member');
    expect(mockPrismaBookingUpdate).not.toHaveBeenCalled();
  });
});
