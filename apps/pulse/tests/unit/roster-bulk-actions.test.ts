import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock server-only compiler guard for Vitest environment
vi.mock('server-only', () => ({}));

// Mock FS module for reading compatibility rules
const { mockReadFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: mockReadFile,
  },
}));

// Mock local Prisma client
const {
  mockPrismaFindMany,
  mockPrismaFindUnique,
  mockPrismaUpdate,
  mockPrismaTransaction,
} = vi.hoisted(() => ({
  mockPrismaFindMany: vi.fn(),
  mockPrismaFindUnique: vi.fn(),
  mockPrismaUpdate: vi.fn(),
  mockPrismaTransaction: vi.fn(),
}));

vi.mock('@/lib/core/prisma', () => ({
  prisma: {
    booking: {
      findMany: mockPrismaFindMany,
      findUnique: mockPrismaFindUnique,
      update: mockPrismaUpdate,
    },
    user: {
      findUnique: mockPrismaFindUnique,
    },
    $transaction: mockPrismaTransaction,
  },
}));

import { POST as bulkPOST } from '@/app/api/scheduling/bulk/route';
import { NextRequest } from 'next/server';

describe('Sunset Gas and Grill // Roster Bulk Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock default transaction runner to execute with a mock prisma-like client
    const mockTxClient = {
      booking: {
        update: mockPrismaUpdate,
        findMany: mockPrismaFindMany,
      },
    };
    mockPrismaTransaction.mockImplementation((callback) => callback(mockTxClient));
    
    // Mock user findUnique globally with an argument-aware implementation
    mockPrismaFindUnique.mockImplementation(({ where }) => {
      if (where.id === 1 || where.email === 'beth@sunsetgrill.com') {
        return Promise.resolve({ id: 1, name: 'Beth', email: 'beth@sunsetgrill.com' });
      }
      if (where.id === 2 || where.email === 'tamara@sunsetgrill.com') {
        return Promise.resolve({ id: 2, name: 'Tamara', email: 'tamara@sunsetgrill.com' });
      }
      return Promise.resolve(null);
    });

    // Default compatibility rules (empty)
    mockReadFile.mockResolvedValue(JSON.stringify([]));

    // Lock system time to a fixed Sunday (May 24, 2026) to make weekOffset predictable
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Action: CLEAR WEEK', () => {
    it('should unassign all matching shifts in targeted weekOffset and reset titles', async () => {
      // Mock existing assigned shifts for Monday (May 25, 2026)
      const mockBookings = [
        {
          id: 101,
          startTime: new Date('2026-05-25T05:00:00Z'),
          endTime: new Date('2026-05-25T13:00:00Z'),
          eventTypeId: 1,
          userId: 1,
          userPrimaryEmail: 'beth@sunsetgrill.com',
          eventType: { slug: 'grill-shift', title: 'Grill Shift' },
        },
        {
          id: 102,
          startTime: new Date('2026-05-25T13:00:00Z'),
          endTime: new Date('2026-05-25T21:00:00Z'),
          eventTypeId: 2,
          userId: 2,
          userPrimaryEmail: 'taz@sunsetgrill.com',
          eventType: { slug: 'register-shift', title: 'Register Shift' },
        },
      ];

      mockPrismaFindMany.mockResolvedValueOnce(mockBookings);
      mockPrismaUpdate.mockImplementation((args: any) => Promise.resolve({ id: args.where.id, ...args.data }));

      const request = new NextRequest('http://localhost/api/scheduling/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear',
          weekOffset: 1, // targeting next week
        }),
      });

      const response = await bulkPOST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.clearedCount).toBe(2);

      // Verify transaction update params
      expect(mockPrismaUpdate).toHaveBeenCalledTimes(2);
      expect(mockPrismaUpdate).toHaveBeenNthCalledWith(1, {
        where: { id: 101 },
        data: expect.objectContaining({
          userId: null,
          userPrimaryEmail: null,
          title: 'Grill Shift',
          idempotencyKey: expect.any(String),
        }),
      });
    });

    it('should handle empty states gracefully', async () => {
      mockPrismaFindMany.mockResolvedValueOnce([]); // No shifts found

      const request = new NextRequest('http://localhost/api/scheduling/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear',
          weekOffset: 1,
        }),
      });

      const response = await bulkPOST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.clearedCount).toBe(0);
      expect(mockPrismaUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Action: CLONE WEEK', () => {
    it('should copy previous week assignments chronologically onto target week', async () => {
      // Source week: weekOffset 0 (May 18 to May 24, 2026)
      const sourceBookings = [
        {
          id: 50,
          startTime: new Date('2026-05-18T05:00:00Z'), // Monday
          endTime: new Date('2026-05-18T13:00:00Z'),
          userId: 1,
          eventType: { slug: 'grill-shift', title: 'Grill Shift' },
          user: { id: 1, name: 'Beth', email: 'beth@sunsetgrill.com' },
        },
      ];

      // Target week: weekOffset 1 (May 25 to May 31, 2026)
      const targetBookings = [
        {
          id: 101,
          startTime: new Date('2026-05-25T05:00:00Z'), // Monday
          endTime: new Date('2026-05-25T13:00:00Z'),
          userId: null,
          eventType: { slug: 'grill-shift', title: 'Grill Shift' },
        },
      ];

      mockPrismaFindMany
        .mockResolvedValueOnce(sourceBookings) // first findMany call (source)
        .mockResolvedValueOnce(targetBookings); // second findMany call (target)

      mockPrismaUpdate.mockImplementation((args: any) => Promise.resolve({ id: args.where.id, ...args.data }));

      const request = new NextRequest('http://localhost/api/scheduling/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clone',
          weekOffset: 1,
        }),
      });

      const response = await bulkPOST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.clonedCount).toBe(1);
      expect(body.data.skippedCount).toBe(0);

      expect(mockPrismaUpdate).toHaveBeenCalledTimes(1);
      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 101 },
        data: expect.objectContaining({
          userId: 1,
          userPrimaryEmail: 'beth@sunsetgrill.com',
          title: 'Grill Shift - Beth',
          idempotencyKey: expect.any(String),
        }),
      });
    });

    it('should skip cloning assignments that result in compatibility or double-scheduling conflicts', async () => {
      // Mock compatibility rule: Beth can't work with Tamara
      mockReadFile.mockResolvedValue(JSON.stringify([
        { email1: 'beth@sunsetgrill.com', email2: 'tamara@sunsetgrill.com' }
      ]));

      // Source week booking: Beth is on Monday Grill Shift
      const sourceBookings = [
        {
          id: 50,
          startTime: new Date('2026-05-18T05:00:00Z'),
          endTime: new Date('2026-05-18T13:00:00Z'),
          userId: 1,
          eventType: { slug: 'grill-shift', title: 'Grill Shift' },
          user: { id: 1, name: 'Beth', email: 'beth@sunsetgrill.com' },
        },
      ];

      // Target week: Tamara is already scheduled on Monday Register Shift overlapping Beth's time slot
      const targetBookings = [
        {
          id: 101,
          startTime: new Date('2026-05-25T05:00:00Z'), // Monday
          endTime: new Date('2026-05-25T13:00:00Z'),
          userId: null,
          eventType: { slug: 'grill-shift', title: 'Grill Shift' },
        },
        {
          id: 102,
          startTime: new Date('2026-05-25T06:00:00Z'), // Overlapping Monday
          endTime: new Date('2026-05-25T14:00:00Z'),
          userId: 2,
          eventType: { slug: 'register-shift', title: 'Register Shift' },
          user: { id: 2, name: 'Tamara', email: 'tamara@sunsetgrill.com' },
        },
      ];

      mockPrismaFindMany
        .mockResolvedValueOnce(sourceBookings)
        .mockResolvedValueOnce(targetBookings);

      // Mock user lookup for Beth and Tamara
      mockPrismaFindUnique
        .mockResolvedValueOnce({ id: 1, name: 'Beth', email: 'beth@sunsetgrill.com' }) // Beth lookup in conflict check
        .mockResolvedValueOnce({ id: 2, name: 'Tamara', email: 'tamara@sunsetgrill.com' }); // Tamara lookup in conflict check

      const request = new NextRequest('http://localhost/api/scheduling/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clone',
          weekOffset: 1,
        }),
      });

      const response = await bulkPOST(request);
      
      // In this case, the single match failed because of the compatibility conflict
      // Since clonedCount is 0, the API returns a 400 Bad Request with details
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.message).toContain('Failed to clone previous roster');
      expect(body.details).toHaveLength(1);
      expect(body.details[0].userName).toBe('Beth');
      expect(body.details[0].reason).toContain('⚠️ COMPATIBILITY CONFLICT');
      
      expect(mockPrismaUpdate).not.toHaveBeenCalled();
    });
  });
});
