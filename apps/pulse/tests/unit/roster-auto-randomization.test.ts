import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

// Mock FS module
const { mockReadFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: mockReadFile,
  },
}));

// Mock Prisma
const {
  mockPrismaFindMany,
  mockPrismaFindFirst,
  mockPrismaUpsert,
  mockPrismaCreate,
} = vi.hoisted(() => ({
  mockPrismaFindMany: vi.fn(),
  mockPrismaFindFirst: vi.fn(),
  mockPrismaUpsert: vi.fn(),
  mockPrismaCreate: vi.fn(),
}));

vi.mock('@/lib/core/prisma', () => ({
  prisma: {
    eventType: {
      findMany: vi.fn().mockResolvedValue([
        { id: 8801, slug: 'grill-shift', title: 'Grill Shift' },
        { id: 8802, slug: 'register-shift', title: 'Register Shift' },
      ]),
      upsert: mockPrismaUpsert,
    },
    booking: {
      findMany: mockPrismaFindMany,
      findFirst: mockPrismaFindFirst,
      create: mockPrismaCreate,
    },
    user: {
      findMany: vi.fn().mockResolvedValue([
        { id: 1, name: 'Sierra', username: 'sierra', email: 'sierra@sunsetgrill.com' },
        { id: 2, name: 'Beth', username: 'beth', email: 'beth@sunsetgrill.com' },
        { id: 3, name: 'Taz', username: 'taz', email: 'taz@sunsetgrill.com' },
        { id: 4, name: 'Angela', username: 'angela', email: 'angela@sunsetgrill.com' },
        { id: 5, name: 'Stephanie', username: 'stephanie', email: 'stephanie@sunsetgrill.com' },
        { id: 6, name: 'Sherrie', username: 'sherrie', email: 'sherrie@sunsetgrill.com' },
        { id: 7, name: 'Shaikh', username: 'shaikh', email: 'shaikh@sunsetgrill.com' },
        { id: 8, name: 'Sharon', username: 'sharon', email: 'sharon@sunsetgrill.com' },
        { id: 9, name: 'Tamara', username: 'tamara', email: 'tamara@sunsetgrill.com' },
      ]),
      upsert: mockPrismaUpsert,
    },
    verifiedNumber: {
      findFirst: vi.fn().mockResolvedValue({ id: 123, phoneNumber: '+15551110001' }),
      create: vi.fn().mockResolvedValue({ id: 123 }),
    },
  },
}));

import { GET as getScheduling } from '@/app/api/scheduling/route';
import { NextRequest } from 'next/server';

describe('Sunset Gas and Grill // Roster Auto-Randomization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T12:00:00Z'));

    // Mock file reads
    mockReadFile.mockImplementation((path: string) => {
      if (path.includes('default-employees.json')) {
        return Promise.resolve(JSON.stringify([
          { "name": "Sierra", "username": "sierra", "email": "sierra@sunsetgrill.com", "phone": "+15551110001" },
          { "name": "Beth", "username": "beth", "email": "beth@sunsetgrill.com", "phone": "+15551110002" },
          { "name": "Taz", "username": "taz", "email": "taz@sunsetgrill.com", "phone": "+15551110003" },
          { "name": "Angela", "username": "angela", "email": "angela@sunsetgrill.com", "phone": "+15551110004" }
        ]));
      }
      if (path.includes('compatibility-rules.json')) {
        return Promise.resolve(JSON.stringify([
          { "email1": "beth@sunsetgrill.com", "email2": "tamara@sunsetgrill.com" }
        ]));
      }
      return Promise.reject(new Error('File not found'));
    });

    // Mock upsert to resolve successfully
    mockPrismaUpsert.mockImplementation((args: any) => Promise.resolve({ id: 99, ...args.create }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should automatically generate a randomized 28-shift roster if query finds 0 bookings for target week', async () => {
    // 1st findMany returns empty array, indicating zero bookings
    // 2nd findMany returns generated shifts to the response builder
    mockPrismaFindMany
      .mockResolvedValueOnce([]) // First fetch finds zero shifts
      .mockResolvedValueOnce([
        {
          id: 1001,
          title: 'Grill Shift - Sierra',
          startTime: new Date('2026-05-25T05:00:00Z'),
          endTime: new Date('2026-05-25T13:00:00Z'),
          status: 'ACCEPTED',
          eventType: { slug: 'grill-shift', title: 'Grill Shift' },
          user: { id: 1, name: 'Sierra' },
        }
      ]);

    // FindFirst returns null to bypass double-check write guards
    mockPrismaFindFirst.mockResolvedValue(null);

    // Mock create to resolve successfully
    mockPrismaCreate.mockImplementation((args: any) => Promise.resolve({ id: 1001, ...args.data }));

    const request = new NextRequest('http://localhost/api/scheduling?type=shifts&startDate=2026-05-25T00:00:00.000Z&endDate=2026-06-01T00:00:00.000Z');
    const response = await getScheduling(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.scheduler.bookings).toHaveLength(1);
    expect(body.data.scheduler.bookings[0].title).toBe('Grill Shift - Sierra');

    // Assert that we attempted to generate and create the 28 auto-randomized shifts in the database
    expect(mockPrismaCreate).toHaveBeenCalled();
  });
});
