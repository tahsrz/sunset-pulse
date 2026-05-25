import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock server-only compiler guard for Vitest environment
vi.mock('server-only', () => ({}));

// Mock FS module for reading/writing hourly rates
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

import { GET as ratesGET, POST as ratesPOST } from '@/app/api/scheduling/rates/route';

describe('Sunset Gas and Grill // Hourly Rates Administration API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fetch Hourly Rates (GET)', () => {
    it('should successfully read empty rates if file does not exist', async () => {
      // Mock ENOENT error
      const enoentError = new Error('File not found') as any;
      enoentError.code = 'ENOENT';
      mockReadFile.mockRejectedValue(enoentError);

      const request = new NextRequest('http://localhost/api/scheduling/rates');
      const response = await ratesGET(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.rates).toEqual({});
    });

    it('should successfully return parsed rates if file exists', async () => {
      const mockRates = {
        'beth@sunsetgrill.com': 22.5,
        'tamara@sunsetgrill.com': 19.0,
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockRates));

      const request = new NextRequest('http://localhost/api/scheduling/rates');
      const response = await ratesGET(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.rates).toEqual(mockRates);
    });

    it('should return 500 error if reading file fails with other error', async () => {
      mockReadFile.mockRejectedValue(new Error('Permission denied'));

      const request = new NextRequest('http://localhost/api/scheduling/rates');
      const response = await ratesGET(request);
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.message).toContain('Failed to fetch hourly rates.');
    });
  });

  describe('Update Hourly Rates (POST)', () => {
    it('should successfully update or add custom hourly rate for employee', async () => {
      const existingRates = {
        'beth@sunsetgrill.com': 22.5,
      };
      mockReadFile.mockResolvedValue(JSON.stringify(existingRates));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

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
      expect(body.data.rates['beth@sunsetgrill.com']).toBe(22.5);
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
    });

    it('should successfully remove custom rate if rate is null/undefined', async () => {
      const existingRates = {
        'beth@sunsetgrill.com': 22.5,
        'tamara@sunsetgrill.com': 19.5,
      };
      mockReadFile.mockResolvedValue(JSON.stringify(existingRates));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

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
      expect(body.data.rates['beth@sunsetgrill.com']).toBe(22.5);
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
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
  });
});
