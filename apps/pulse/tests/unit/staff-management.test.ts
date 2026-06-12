import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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

// Mock prisma client and operations
const {
  mockPrismaUserCreate,
  mockPrismaUserFindUnique,
  mockPrismaUserDelete,
  mockPrismaBookingFindMany,
  mockPrismaBookingUpdate,
  mockPrismaVerifiedNumberCreate,
  mockPrismaVerifiedNumberDeleteMany,
  mockPrismaTransaction,
} = vi.hoisted(() => ({
  mockPrismaUserCreate: vi.fn(),
  mockPrismaUserFindUnique: vi.fn(),
  mockPrismaUserDelete: vi.fn(),
  mockPrismaBookingFindMany: vi.fn(),
  mockPrismaBookingUpdate: vi.fn(),
  mockPrismaVerifiedNumberCreate: vi.fn(),
  mockPrismaVerifiedNumberDeleteMany: vi.fn(),
  mockPrismaTransaction: vi.fn(),
}));

vi.mock('@/lib/core/prisma', () => ({
  prisma: {
    user: {
      create: mockPrismaUserCreate,
      findUnique: mockPrismaUserFindUnique,
      delete: mockPrismaUserDelete,
    },
    booking: {
      findMany: mockPrismaBookingFindMany,
      update: mockPrismaBookingUpdate,
    },
    verifiedNumber: {
      create: mockPrismaVerifiedNumberCreate,
      deleteMany: mockPrismaVerifiedNumberDeleteMany,
    },
    $transaction: mockPrismaTransaction,
  },
}));

import { POST as staffPOST, DELETE as staffDELETE } from '@/app/api/scheduling/staff/route';

describe('Sunset Gas and Grill // Staff Management Administration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Enroll Staff Member (POST)', () => {
    it('should successfully enroll a new employee and bind their phone number', async () => {
      const mockUser = {
        id: 501,
        name: 'Stephanie',
        email: 'stephanie@sunsetgrill.com',
        username: 'stephanie789',
        timeZone: 'America/Chicago',
      };

      // Mock prisma transaction to yield the user
      mockPrismaTransaction.mockImplementation(async (callback: any) => {
        const tx = {
          user: {
            create: vi.fn().mockResolvedValue(mockUser),
          },
          verifiedNumber: {
            create: vi.fn().mockResolvedValue({ id: 901, userId: 501, phoneNumber: '+15551110005' }),
          },
        };
        return callback(tx);
      });

      const request = new NextRequest('http://localhost/api/scheduling/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Stephanie',
          email: 'stephanie@sunsetgrill.com',
          phone: '+15551110005',
        }),
      });

      const response = await staffPOST(request);
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.user.name).toBe('Stephanie');
      expect(body.data.user.id).toBe(501);
      expect(mockPrismaTransaction).toHaveBeenCalledTimes(1);
    });

    it('should return 400 if required name parameter is missing', async () => {
      const request = new NextRequest('http://localhost/api/scheduling/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'missingname@sunsetgrill.com',
        }),
      });

      const response = await staffPOST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.message).toContain('name is required');
    });

    it('should fail with 400 if user email already exists (P2002 constraint error)', async () => {
      // Mock unique constraint error
      const p2002Error = new Error('Unique constraint violation') as any;
      p2002Error.code = 'P2002';
      mockPrismaTransaction.mockRejectedValueOnce(p2002Error);

      const request = new NextRequest('http://localhost/api/scheduling/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Sherrie',
          email: 'sherrie@sunsetgrill.com',
        }),
      });

      const response = await staffPOST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.message).toContain('already exists in the system');
    });
  });

  describe('Decommission Staff Member (DELETE)', () => {
    it('should return 404 if employee to remove does not exist', async () => {
      mockPrismaUserFindUnique.mockResolvedValueOnce(null); // User not found

      const request = new NextRequest('http://localhost/api/scheduling/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 9999,
        }),
      });

      const response = await staffDELETE(request);
      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.message).toContain('could not be found');
    });

    it('should unassign all active shifts and delete the user inside a transaction', async () => {
      const mockUser = {
        id: 505,
        name: 'Tamara',
        email: 'tamara@sunsetgrill.com',
      };

      // Mock existing shifts assigned to Tamara
      const mockBookings = [
        {
          id: 4001,
          startTime: new Date('2026-05-25T05:00:00.000Z'),
          endTime: new Date('2026-05-25T13:00:00.000Z'),
          userId: 505,
          eventTypeId: 8801,
          eventType: { id: 8801, title: 'Grill Shift' },
        },
        {
          id: 4002,
          startTime: new Date('2026-05-25T13:00:00.000Z'),
          endTime: new Date('2026-05-25T21:00:00.000Z'),
          userId: 505,
          eventTypeId: 8802,
          eventType: { id: 8802, title: 'Register Shift' },
        },
      ];

      mockPrismaUserFindUnique.mockResolvedValueOnce(mockUser);
      mockPrismaBookingFindMany.mockResolvedValueOnce(mockBookings);

      // Verify transaction unassigns each booking and deletes the user
      const mockTxBookingUpdate = vi.fn();
      const mockTxVerifiedNumberDelete = vi.fn();
      const mockTxUserDelete = vi.fn();

      mockPrismaTransaction.mockImplementation(async (callback: any) => {
        const tx = {
          booking: {
            update: mockTxBookingUpdate.mockResolvedValue({ id: 10 }),
          },
          verifiedNumber: {
            deleteMany: mockTxVerifiedNumberDelete.mockResolvedValue({ count: 1 }),
          },
          user: {
            delete: mockTxUserDelete.mockResolvedValue(mockUser),
          },
        };
        return callback(tx);
      });

      const request = new NextRequest('http://localhost/api/scheduling/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 505,
        }),
      });

      const response = await staffDELETE(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.message).toContain('successfully decommissioned. 2 shifts reverted to unassigned.');

      // Check shift updates: set to null and reset titles & deterministic keys
      expect(mockTxBookingUpdate).toHaveBeenCalledTimes(2);
      expect(mockTxBookingUpdate.mock.calls[0][0].data).toEqual({
        userId: null,
        userPrimaryEmail: null,
        title: 'Grill Shift',
        idempotencyKey: expect.any(String),
      });

      // Verify user and verified numbers deleted
      expect(mockTxVerifiedNumberDelete).toHaveBeenCalledWith({ where: { userId: 505 } });
      expect(mockTxUserDelete).toHaveBeenCalledWith({ where: { id: 505 } });
    });
  });
});
