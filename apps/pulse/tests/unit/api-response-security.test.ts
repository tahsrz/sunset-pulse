import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorResponse, validationErrorResponse } from '@/lib/core/apiResponse';

describe('API error response hardening', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'incident-123') });
  });

  it('keeps internal details in logs but out of 5xx responses', async () => {
    const response = errorResponse('Unable to load listings.', 500, 'database hostname and stack trace');

    await expect(response.json()).resolves.toEqual({
      error: true,
      message: 'Unable to load listings.',
      incidentId: 'incident-123',
      timestamp: expect.any(String),
    });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('incident-123'),
      'database hostname and stack trace'
    );
  });

  it('preserves actionable validation details for 4xx responses', async () => {
    const response = validationErrorResponse({ city: 'Required' });
    await expect(response.json()).resolves.toMatchObject({
      error: true,
      incidentId: 'incident-123',
      details: { city: 'Required' },
    });
  });
});
