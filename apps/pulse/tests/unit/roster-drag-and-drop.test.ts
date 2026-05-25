import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock server-only compiler guard for Vitest environment
vi.mock('server-only', () => ({}));

// Mock Supabase logEvent
vi.mock('@/lib/supabase', () => ({
  logEvent: vi.fn().mockResolvedValue({}),
}));

// Mock getSessionUser
vi.mock('@/lib/core/getSessionUser', () => ({
  getSessionUser: vi.fn().mockResolvedValue({
    userId: 'mock-operator-id',
    role: 'realtor',
    user: {
      id: 'mock-operator-id',
      name: 'Mock Operator',
      email: 'mock-operator@sunsetgrill.com',
      role: 'realtor',
    },
  }),
}));

const { 
  mockPrismaFindUnique, 
  mockPrismaUpdate, 
  mockPrismaTransaction,
  mockPrismaFindMany,
} = vi.hoisted(() => ({
  mockPrismaFindUnique: vi.fn(),
  mockPrismaUpdate: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockPrismaFindMany: vi.fn(),
}));

vi.mock('@calcom/prisma', () => ({
  prisma: {
    booking: {
      findUnique: mockPrismaFindUnique,
      update: mockPrismaUpdate,
      findMany: mockPrismaFindMany,
    },
    user: {
      findUnique: mockPrismaFindUnique, // Reuses same mocked finder, or we can separate them
    },
    $transaction: mockPrismaTransaction,
  },
}));

import { PATCH as schedulingPATCH } from '@/app/api/scheduling/route';
import { NextRequest } from 'next/server';

describe('Sunset Gas and Grill // Roster Drag-and-Drop Modifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaFindMany.mockResolvedValue([]);
  });

  describe('Reassign Shift Action', () => {
    it('should successfully reassign user and update title & idempotencyKey', async () => {
      // Mock existing booking (Register Shift)
      const mockBooking = {
        id: 101,
        startTime: new Date('2026-05-25T10:00:00Z'),
        endTime: new Date('2026-05-25T18:00:00Z'),
        userId: 1,
        eventType: { id: 8802, title: 'Register Shift' },
      };

      // Mock targeted user (Taz)
      const mockUser = {
        id: 3,
        name: 'Taz',
        email: 'taz@sunsetgrill.com',
      };

      // Set findUnique mocks sequentially:
      // 1. booking
      // 2. user
      mockPrismaFindUnique
        .mockResolvedValueOnce(mockBooking) // first call (booking)
        .mockResolvedValueOnce(mockUser);   // second call (user)

      mockPrismaUpdate.mockImplementation((args: any) => Promise.resolve({ id: 101, ...args.data }));

      const request = new NextRequest('http://localhost/api/scheduling', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reassign',
          bookingId: 101,
          userId: 3,
        }),
      });

      const response = await schedulingPATCH(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.booking.userId).toBe(3);
      expect(body.data.booking.title).toBe('Register Shift - Taz');
      expect(body.data.booking.idempotencyKey).toBeDefined();

      expect(mockPrismaUpdate).toHaveBeenCalledTimes(1);
    });

    it('should return 404 if booking is not found', async () => {
      mockPrismaFindUnique.mockResolvedValueOnce(null); // Booking not found

      const request = new NextRequest('http://localhost/api/scheduling', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reassign',
          bookingId: 999,
          userId: 3,
        }),
      });

      const response = await schedulingPATCH(request);
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.message).toContain('Booking with ID 999 not found.');
    });

    it('should reject reassignment if a compatibility conflict is detected with another employee on an overlapping same-day shift', async () => {
      const mockBookingToReassign = {
        id: 101,
        startTime: new Date('2026-05-25T10:00:00Z'),
        endTime: new Date('2026-05-25T18:00:00Z'),
        userId: 9,
        eventType: { id: 8802, title: 'Register Shift' },
      };

      const mockUserBeth = {
        id: 2,
        name: 'Beth',
        email: 'beth@sunsetgrill.com',
      };

      const mockOverlapBooking = {
        id: 102,
        startTime: new Date('2026-05-25T12:00:00Z'),
        endTime: new Date('2026-05-25T20:00:00Z'),
        userId: 5,
        user: {
          id: 5,
          name: 'Tamara',
          email: 'tamara@sunsetgrill.com',
        },
      };

      mockPrismaFindUnique
        .mockResolvedValueOnce(mockBookingToReassign)
        .mockResolvedValueOnce(mockUserBeth)
        .mockResolvedValueOnce(mockUserBeth);

      mockPrismaFindMany.mockResolvedValueOnce([mockOverlapBooking]);

      const request = new NextRequest('http://localhost/api/scheduling', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reassign',
          bookingId: 101,
          userId: 2,
        }),
      });

      const response = await schedulingPATCH(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.message).toContain('COMPATIBILITY CONFLICT');
      expect(body.message).toContain('Beth');
      expect(body.message).toContain('Tamara');
    });

    it('should reject reassignment if user is already scheduled to work an overlapping same-day shift', async () => {
      const mockBookingToReassign = {
        id: 101,
        startTime: new Date('2026-05-25T10:00:00Z'),
        endTime: new Date('2026-05-25T18:00:00Z'),
        userId: 9,
        eventType: { id: 8802, title: 'Register Shift' },
      };

      const mockUserBeth = {
        id: 2,
        name: 'Beth',
        email: 'beth@sunsetgrill.com',
      };

      const mockOverlapBookingSameUser = {
        id: 102,
        startTime: new Date('2026-05-25T12:00:00Z'),
        endTime: new Date('2026-05-25T20:00:00Z'),
        userId: 2,
        user: {
          id: 2,
          name: 'Beth',
          email: 'beth@sunsetgrill.com',
        },
      };

      mockPrismaFindUnique
        .mockResolvedValueOnce(mockBookingToReassign)
        .mockResolvedValueOnce(mockUserBeth)
        .mockResolvedValueOnce(mockUserBeth);

      mockPrismaFindMany.mockResolvedValueOnce([mockOverlapBookingSameUser]);

      const request = new NextRequest('http://localhost/api/scheduling', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reassign',
          bookingId: 101,
          userId: 2,
        }),
      });

      const response = await schedulingPATCH(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.message).toContain('DOUBLE SCHEDULING CONFLICT');
      expect(body.message).toContain('Beth');
    });

    it('should allow reassignment of conflicting employees to different, non-overlapping shifts on the same calendar day', async () => {
      const mockBookingToReassign = {
        id: 101,
        startTime: new Date('2026-05-25T13:00:00Z'), // Closing shift (1:00 PM – 10:00 PM)
        endTime: new Date('2026-05-25T22:00:00Z'),
        userId: 9,
        eventType: { id: 8802, title: 'Register Shift' },
      };

      const mockUserBeth = {
        id: 2,
        name: 'Beth',
        email: 'beth@sunsetgrill.com',
      };

      // Mock Tamara's booking which is contiguous but non-overlapping (5:00 AM – 1:00 PM) on the same day
      const mockNonOverlapBooking = {
        id: 102,
        startTime: new Date('2026-05-25T05:00:00Z'),
        endTime: new Date('2026-05-25T13:00:00Z'),
        userId: 5,
        user: {
          id: 5,
          name: 'Tamara',
          email: 'tamara@sunsetgrill.com',
        },
      };

      mockPrismaFindUnique
        .mockResolvedValueOnce(mockBookingToReassign)
        .mockResolvedValueOnce(mockUserBeth)
        .mockResolvedValueOnce(mockUserBeth);

      mockPrismaFindMany.mockResolvedValueOnce([mockNonOverlapBooking]);
      mockPrismaUpdate.mockImplementation((args: any) => Promise.resolve({ id: 101, ...args.data }));

      const request = new NextRequest('http://localhost/api/scheduling', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reassign',
          bookingId: 101,
          userId: 2,
        }),
      });

      const response = await schedulingPATCH(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.booking.userId).toBe(2);
    });
  });

  describe('Swap Shifts Action', () => {
    it('should successfully swap two users on the same calendar day inside transaction', async () => {
      // Mock two bookings on the same calendar day (Monday May 25, 2026)
      const mockBooking1 = {
        id: 201,
        startTime: new Date('2026-05-25T05:00:00.000Z'), // Opening shift
        endTime: new Date('2026-05-25T13:00:00.000Z'),
        userId: 1, // User 1
        eventType: { id: 8801, title: 'Grill Shift' },
      };

      const mockBooking2 = {
        id: 202,
        startTime: new Date('2026-05-25T13:00:00.000Z'), // Closing shift
        endTime: new Date('2026-05-25T22:00:00.000Z'),
        userId: 2, // User 2
        eventType: { id: 8801, title: 'Grill Shift' },
      };

      const mockUser1 = { id: 1, name: 'Sierra', email: 'sierra@sunsetgrill.com' };
      const mockUser2 = { id: 2, name: 'Beth', email: 'beth@sunsetgrill.com' };

      // Sequentially mock findUnique:
      // 1. booking1
      // 2. booking2
      // 3. user1
      // 4. user2
      mockPrismaFindUnique
        .mockResolvedValueOnce(mockBooking1)
        .mockResolvedValueOnce(mockBooking2)
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);

      // Mock transaction execution
      mockPrismaTransaction.mockImplementation(async (callback: any) => {
        const tx = {
          booking: {
            update: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
          },
        };
        return callback(tx);
      });

      const request = new NextRequest('http://localhost/api/scheduling', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'swap',
          bookingId1: 201,
          bookingId2: 202,
        }),
      });

      const response = await schedulingPATCH(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);

      // Verify that transaction completed successfully
      expect(mockPrismaTransaction).toHaveBeenCalledTimes(1);
    });

    it('should reject swap if the bookings occur on different calendar days', async () => {
      // Mock booking 1 (Monday May 25, 2026)
      const mockBooking1 = {
        id: 201,
        startTime: new Date('2026-05-25T10:00:00.000Z'),
        endTime: new Date('2026-05-25T18:00:00.000Z'),
        userId: 1,
        eventType: { id: 8801, title: 'Grill Shift' },
      };

      // Mock booking 2 (Tuesday May 26, 2026)
      const mockBooking2 = {
        id: 203,
        startTime: new Date('2026-05-26T10:00:00.000Z'),
        endTime: new Date('2026-05-26T18:00:00.000Z'),
        userId: 2,
        eventType: { id: 8801, title: 'Grill Shift' },
      };

      mockPrismaFindUnique
        .mockResolvedValueOnce(mockBooking1)
        .mockResolvedValueOnce(mockBooking2);

      const request = new NextRequest('http://localhost/api/scheduling', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'swap',
          bookingId1: 201,
          bookingId2: 203,
        }),
      });

      const response = await schedulingPATCH(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.message).toContain('Swaps are strictly constrained to bookings on the same calendar day.');
    });

    it('should reject swap if swapping would cause a compatibility conflict for either employee on an overlapping same-day shift', async () => {
      const mockBooking1 = {
        id: 201,
        startTime: new Date('2026-05-25T10:00:00.000Z'),
        endTime: new Date('2026-05-25T18:00:00.000Z'),
        userId: 1,
        eventType: { id: 8801, title: 'Grill Shift' },
      };

      const mockBooking2 = {
        id: 202,
        startTime: new Date('2026-05-25T12:00:00.000Z'),
        endTime: new Date('2026-05-25T20:00:00.000Z'),
        userId: 2,
        eventType: { id: 8802, title: 'Register Shift' },
      };

      const mockUserSierra = { id: 1, name: 'Sierra', email: 'sierra@sunsetgrill.com' };
      const mockUserBeth = { id: 2, name: 'Beth', email: 'beth@sunsetgrill.com' };

      const mockBookingTamara = {
        id: 203,
        startTime: new Date('2026-05-25T11:00:00.000Z'),
        endTime: new Date('2026-05-25T15:00:00.000Z'),
        userId: 5,
        user: {
          id: 5,
          name: 'Tamara',
          email: 'tamara@sunsetgrill.com',
        },
      };

      mockPrismaFindUnique
        .mockResolvedValueOnce(mockBooking1)
        .mockResolvedValueOnce(mockBooking2)
        .mockResolvedValueOnce(mockUserSierra)
        .mockResolvedValueOnce(mockUserBeth)
        .mockResolvedValueOnce(mockUserBeth);

      mockPrismaFindMany.mockResolvedValueOnce([mockBookingTamara]);

      const request = new NextRequest('http://localhost/api/scheduling', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'swap',
          bookingId1: 201,
          bookingId2: 202,
        }),
      });

      const response = await schedulingPATCH(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.message).toContain('COMPATIBILITY CONFLICT');
      expect(body.message).toContain('Beth');
      expect(body.message).toContain('Tamara');
    });

    it('should reject swap if swapping would cause a double-scheduling conflict for either employee on an overlapping same-day shift', async () => {
      const mockBooking1 = {
        id: 201,
        startTime: new Date('2026-05-25T10:00:00.000Z'),
        endTime: new Date('2026-05-25T18:00:00.000Z'),
        userId: 1,
        eventType: { id: 8801, title: 'Grill Shift' },
      };

      const mockBooking2 = {
        id: 202,
        startTime: new Date('2026-05-25T12:00:00.000Z'),
        endTime: new Date('2026-05-25T20:00:00.000Z'),
        userId: 2,
        eventType: { id: 8802, title: 'Register Shift' },
      };

      const mockUserSierra = { id: 1, name: 'Sierra', email: 'sierra@sunsetgrill.com' };
      const mockUserBeth = { id: 2, name: 'Beth', email: 'beth@sunsetgrill.com' };

      // Overlap booking with Sierra (user 1) on target booking 2's slot (12:00-20:00)
      const mockOverlapBookingSierra = {
        id: 203,
        startTime: new Date('2026-05-25T14:00:00.000Z'),
        endTime: new Date('2026-05-25T22:00:00.000Z'),
        userId: 1,
        user: {
          id: 1,
          name: 'Sierra',
          email: 'sierra@sunsetgrill.com',
        },
      };

      mockPrismaFindUnique
        .mockResolvedValueOnce(mockBooking1)
        .mockResolvedValueOnce(mockBooking2)
        .mockResolvedValueOnce(mockUserSierra)
        .mockResolvedValueOnce(mockUserBeth)
        .mockResolvedValueOnce(mockUserBeth)
        .mockResolvedValueOnce(mockUserSierra);

      mockPrismaFindMany.mockResolvedValue([mockOverlapBookingSierra]);

      const request = new NextRequest('http://localhost/api/scheduling', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'swap',
          bookingId1: 201,
          bookingId2: 202,
        }),
      });

      const response = await schedulingPATCH(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.message).toContain('DOUBLE SCHEDULING CONFLICT');
      expect(body.message).toContain('Sierra');
    });
  });
});
