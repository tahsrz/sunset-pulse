import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock server-only compiler guard for Vitest environment
vi.mock('server-only', () => ({}));

const { 
  mockPrismaFindMany, 
  mockPrismaDeleteMany, 
  mockPrismaCreate, 
  mockPrismaUpdateMany,
  mockPrismaFindFirst
} = vi.hoisted(() => ({
  mockPrismaFindMany: vi.fn(),
  mockPrismaDeleteMany: vi.fn(),
  mockPrismaCreate: vi.fn(),
  mockPrismaUpdateMany: vi.fn(),
  mockPrismaFindFirst: vi.fn(),
}));

vi.mock('@/lib/core/prisma', () => ({
  prisma: {
    booking: {
      findMany: mockPrismaFindMany,
      deleteMany: mockPrismaDeleteMany,
      create: mockPrismaCreate,
      updateMany: mockPrismaUpdateMany,
      findFirst: mockPrismaFindFirst,
    },
  },
}));

import { POST as predictPOST } from '@/app/api/scheduling/predict/route';
import { POST as approvePOST } from '@/app/api/scheduling/approve/route';
import { NextRequest } from 'next/server';

describe('Sunset Gas and Grill // Roster Operations Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Sunday May 24, 2026
    vi.setSystemTime(new Date('2026-05-24T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Roster Shift Prediction', () => {
    it('should clone confirmed shifts from current week to next week as PENDING drafts', async () => {
      // Setup confirmed source shifts (e.g. Monday, May 25, 2026)
      const mockSourceShifts = [
        {
          id: 101,
          startTime: new Date('2026-05-25T10:00:00Z'),
          endTime: new Date('2026-05-25T22:00:00Z'),
          title: 'Grill Shift - Mark',
          description: 'Grill master assignment',
          userId: 5,
          eventTypeId: 1,
          userPrimaryEmail: 'mark@sunset.com',
          eventType: { slug: 'grill-shift' },
        },
      ];

      mockPrismaFindMany.mockResolvedValueOnce(mockSourceShifts);
      mockPrismaFindFirst.mockResolvedValueOnce(null); // No existing target shifts
      mockPrismaCreate.mockImplementation((args: any) => Promise.resolve({ id: 999, ...args.data }));

      const request = new NextRequest('http://localhost/api/scheduling/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 1 }),
      });

      const response = await predictPOST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.predictedShiftsCount).toBe(1);

      // Verify DeleteMany was run to overwrite previous target drafts
      expect(mockPrismaDeleteMany).toHaveBeenCalledTimes(1);

      // Verify the prediction was created with PENDING status and date shifted forward by 7 days
      expect(mockPrismaCreate).toHaveBeenCalledTimes(1);
      const createArgs = mockPrismaCreate.mock.calls[0][0].data;
      expect(createArgs.status).toBe('PENDING');
      expect(createArgs.userId).toBe(5);
      
      // Monday May 25, 2026 + 7 days = Monday June 1, 2026
      const expectedTargetDate = new Date('2026-06-01T10:00:00Z');
      expect(new Date(createArgs.startTime).getTime()).toBe(expectedTargetDate.getTime());
    });

    it('should skip duplicate forecasts if the shift already exists in target week', async () => {
      const mockSourceShifts = [
        {
          id: 101,
          startTime: new Date('2026-05-25T10:00:00Z'),
          endTime: new Date('2026-05-25T22:00:00Z'),
          title: 'Grill Shift - Mark',
          userId: 5,
          eventTypeId: 1,
          eventType: { slug: 'grill-shift' },
        },
      ];

      mockPrismaFindMany.mockResolvedValueOnce(mockSourceShifts);
      mockPrismaFindFirst.mockResolvedValueOnce({ id: 202 }); // Existing shift found

      const request = new NextRequest('http://localhost/api/scheduling/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 1 }),
      });

      const response = await predictPOST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.predictedShiftsCount).toBe(0); // Cloned shift skipped due to duplication
      expect(mockPrismaCreate).not.toHaveBeenCalled();
    });
  });

  describe('Roster Shift Approval', () => {
    it('should transition PENDING draft shifts to ACCEPTED confirmed shifts', async () => {
      mockPrismaUpdateMany.mockResolvedValueOnce({ count: 3 });

      const request = new NextRequest('http://localhost/api/scheduling/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 1 }),
      });

      const response = await approvePOST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.approvedCount).toBe(3);

      // Verify updateMany was called targeting PENDING state in next week range
      expect(mockPrismaUpdateMany).toHaveBeenCalledTimes(1);
      const updateArgs = mockPrismaUpdateMany.mock.calls[0][0];
      expect(updateArgs.where.status).toBe('PENDING');
      expect(updateArgs.data.status).toBe('ACCEPTED');
    });
  });
});
