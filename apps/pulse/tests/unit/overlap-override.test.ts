import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock server-only compiler guard for Vitest environment
vi.mock('server-only', () => ({}));

// Mock Supabase logEvent
vi.mock('@/lib/supabase', () => ({
  logEvent: vi.fn().mockResolvedValue({}),
}));

// Mock getSessionUser
const { mockGetSessionUser } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn().mockResolvedValue({
    userId: 56,
    role: 'realtor',
    user: {
      id: 56,
      name: 'Taz Operator',
      email: 'taz@sunsetgrill.com',
      role: 'realtor',
    },
  }),
}));

vi.mock('@/lib/core/getSessionUser', () => ({
  getSessionUser: mockGetSessionUser,
}));

// Mock Prisma
const {
  mockPrismaBookingFindUnique,
  mockPrismaBookingFindMany,
  mockPrismaBookingUpdate,
  mockPrismaUserFindUnique,
  mockPrismaUserFindMany,
  mockPrismaTransaction,
} = vi.hoisted(() => ({
  mockPrismaBookingFindUnique: vi.fn(),
  mockPrismaBookingFindMany: vi.fn(),
  mockPrismaBookingUpdate: vi.fn(),
  mockPrismaUserFindUnique: vi.fn(),
  mockPrismaUserFindMany: vi.fn(),
  mockPrismaTransaction: vi.fn((p) => Promise.all(p)),
}));

vi.mock('@/lib/core/prisma', () => ({
  prisma: {
    booking: {
      findUnique: mockPrismaBookingFindUnique,
      findMany: mockPrismaBookingFindMany,
      update: mockPrismaBookingUpdate,
    },
    user: {
      findUnique: mockPrismaUserFindUnique,
      findMany: mockPrismaUserFindMany,
    },
    $transaction: mockPrismaTransaction,
  },
}));

import { PATCH, GET } from '@/app/api/scheduling/route';

describe('Roster Scheduler // Overlap & Draft Sandbox Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 OVERLAP_WARNING when self overlap conflict is detected without override', async () => {
    // Mock user being reassigned
    mockPrismaUserFindUnique.mockResolvedValue({
      id: 51,
      name: 'Shaikh',
      email: 'shaikh@sunsetgrill.com',
    });

    // Mock shift being reassigned
    mockPrismaBookingFindUnique.mockResolvedValue({
      id: 101,
      startTime: new Date('2026-05-25T10:00:00.000Z'),
      endTime: new Date('2026-05-25T18:00:00.000Z'),
      eventTypeId: 8801,
      eventType: { title: 'Grill Shift' },
    });

    // Mock another same-day overlapping booking assigned to Shaikh (selfConflict)
    mockPrismaBookingFindMany.mockResolvedValue([
      {
        id: 102,
        startTime: new Date('2026-05-25T12:00:00.000Z'), // overlaps with 10:00 - 18:00
        endTime: new Date('2026-05-25T20:00:00.000Z'),
        userId: 51,
        status: 'ACCEPTED',
        eventType: { slug: 'grill-shift' },
        user: { id: 51, name: 'Shaikh', email: 'shaikh@sunsetgrill.com' },
      },
    ]);

    const req = new NextRequest('http://localhost/api/scheduling', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reassign',
        bookingId: 101,
        userId: 51,
        allowOverlap: false, // Override is off
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe(true);
    expect(data.details.code).toBe('OVERLAP_WARNING');
    expect(data.details.conflict.selfConflict).toBe(true);
  });

  it('should succeed and bypass block when self overlap conflict is present but allowOverlap is true', async () => {
    mockPrismaUserFindUnique.mockResolvedValue({
      id: 51,
      name: 'Shaikh',
      email: 'shaikh@sunsetgrill.com',
    });

    mockPrismaBookingFindUnique.mockResolvedValue({
      id: 101,
      startTime: new Date('2026-05-25T10:00:00.000Z'),
      endTime: new Date('2026-05-25T18:00:00.000Z'),
      eventTypeId: 8801,
      eventType: { title: 'Grill Shift' },
    });

    // Mock an overlapping shift
    mockPrismaBookingFindMany.mockResolvedValue([
      {
        id: 102,
        startTime: new Date('2026-05-25T12:00:00.000Z'),
        endTime: new Date('2026-05-25T20:00:00.000Z'),
        userId: 51,
        status: 'ACCEPTED',
        eventType: { slug: 'grill-shift' },
        user: { id: 51, name: 'Shaikh', email: 'shaikh@sunsetgrill.com' },
      },
    ]);

    mockPrismaBookingUpdate.mockResolvedValue({
      id: 101,
      userId: 51,
      title: 'Grill Shift - Shaikh',
    });

    const req = new NextRequest('http://localhost/api/scheduling', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reassign',
        bookingId: 101,
        userId: 51,
        allowOverlap: true, // Override is enabled!
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.message).toBe('Shift successfully reassigned.');
    expect(mockPrismaBookingUpdate).toHaveBeenCalled();
  });

  it('should support publishing drafts in batch via action publish-draft', async () => {
    // Mock draft booking in date range
    mockPrismaBookingFindMany.mockResolvedValue([
      {
        id: 301,
        metadata: { isDraft: true },
      },
      {
        id: 302,
        metadata: { isDraft: false }, // Live shift (not a draft)
      },
    ]);

    mockPrismaBookingUpdate.mockResolvedValue({
      id: 301,
      metadata: { isDraft: false },
    });

    const req = new NextRequest('http://localhost/api/scheduling', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'publish-draft',
        startDate: '2026-05-18T05:00:00.000Z',
        endDate: '2026-05-25T04:59:59.999Z',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.publishedCount).toBe(1); // 1 shift promoted
  });
});
