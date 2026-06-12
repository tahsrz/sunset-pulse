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

// Mock FS module for reading static files (read-only fallbacks)
const { mockReadFile, mockWriteFile, mockMkdir } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn(),
  mockMkdir: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
  },
}));

// Mock prisma client and operations
const {
  mockPrismaUserFindMany,
  mockPrismaUserFindUnique,
  mockPrismaUserUpdate,
} = vi.hoisted(() => ({
  mockPrismaUserFindMany: vi.fn(),
  mockPrismaUserFindUnique: vi.fn(),
  mockPrismaUserUpdate: vi.fn(),
}));

vi.mock('@/lib/core/prisma', () => ({
  prisma: {
    user: {
      findMany: mockPrismaUserFindMany,
      findUnique: mockPrismaUserFindUnique,
      update: mockPrismaUserUpdate,
    },
  },
}));

import { GET as ratesGET, POST as ratesPOST } from '@/app/api/scheduling/rates/route';

describe('Sunset Gas and Grill // Hourly Rates Administration API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fetch Hourly Rates (GET)', () => {
    it('should successfully read empty rates if file does not exist and no database overrides exist', async () => {
      // Mock ENOENT error for static rates file
      const enoentError = new Error('File not found') as any;
      enoentError.code = 'ENOENT';
      mockReadFile.mockRejectedValue(enoentError);

      // Mock empty database result
      mockPrismaUserFindMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/scheduling/rates');
      const response = await ratesGET(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.rates).toEqual({});
    });

    it('should successfully return merged rates from static file and database overrides', async () => {
      const mockStaticRates = {
        'beth@sunsetgrill.com': 10,
        'tamara@sunsetgrill.com': 10,
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockStaticRates));

      // Mock database override for tamara
      mockPrismaUserFindMany.mockResolvedValue([
        {
          email: 'tamara@sunsetgrill.com',
          metadata: { hourlyRate: 19.5 },
        },
      ]);

      const request = new NextRequest('http://localhost/api/scheduling/rates');
      const response = await ratesGET(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.rates).toEqual({
        'beth@sunsetgrill.com': 10,
        'tamara@sunsetgrill.com': 19.5,
      });
    });

    it('should return 500 error if querying database fails', async () => {
      const mockStaticRates = {
        'beth@sunsetgrill.com': 10,
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockStaticRates));
      mockPrismaUserFindMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/scheduling/rates');
      const response = await ratesGET(request);
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.message).toContain('Failed to fetch hourly rates.');
    });
  });

  describe('Update Hourly Rates (POST)', () => {
    it('should successfully update or add custom hourly rate for employee in metadata', async () => {
      const mockStaticRates = {};
      mockReadFile.mockResolvedValue(JSON.stringify(mockStaticRates));

      const mockUser = {
        id: 101,
        email: 'tamara@sunsetgrill.com',
        metadata: {},
      };
      mockPrismaUserFindUnique.mockResolvedValue(mockUser);
      mockPrismaUserUpdate.mockResolvedValue({ ...mockUser, metadata: { hourlyRate: 19.5 } });
      
      // GET compilation mock to return updated rate list
      mockPrismaUserFindMany.mockResolvedValue([
        {
          email: 'tamara@sunsetgrill.com',
          metadata: { hourlyRate: 19.5 },
        },
      ]);

      const request = new NextRequest('http://localhost/api/scheduling/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'tamara@sunsetgrill.com',
          rate: 19.5,
        }),
      });

      const response = await ratesPOST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.rates['tamara@sunsetgrill.com']).toBe(19.5);
      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { id: 101 },
        data: { metadata: { hourlyRate: 19.5 } },
      });
    });

    it('should successfully remove custom rate if rate is null/undefined', async () => {
      const mockStaticRates = {};
      mockReadFile.mockResolvedValue(JSON.stringify(mockStaticRates));

      const mockUser = {
        id: 101,
        email: 'tamara@sunsetgrill.com',
        metadata: { hourlyRate: 19.5, existingConfig: true },
      };
      mockPrismaUserFindUnique.mockResolvedValue(mockUser);
      mockPrismaUserUpdate.mockResolvedValue({ id: 101, email: 'tamara@sunsetgrill.com', metadata: { existingConfig: true } });
      mockPrismaUserFindMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/scheduling/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'tamara@sunsetgrill.com',
          rate: null,
        }),
      });

      const response = await ratesPOST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.rates['tamara@sunsetgrill.com']).toBeUndefined();
      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { id: 101 },
        data: { metadata: { existingConfig: true } },
      });
    });

    it('should return 400 bad request if email is missing', async () => {
      const request = new NextRequest('http://localhost/api/scheduling/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rate: 18.5,
        }),
      });

      const response = await ratesPOST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.message).toContain('email is required');
    });

    it('should return 404 not found if email does not match any enrolled user', async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/scheduling/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'notfound@sunsetgrill.com',
          rate: 18.5,
        }),
      });

      const response = await ratesPOST(request);
      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.message).toContain('could not be found');
    });
  });
});
