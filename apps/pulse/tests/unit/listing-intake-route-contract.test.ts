import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: vi.fn().mockResolvedValue({
    allowed: true,
    mode: 'local',
    reason: 'Local operator access.',
    user: { id: 'local-operator', email: 'operator@example.com', role: 'admin', name: 'Operator' },
  }),
  isAuthResponse: (value: unknown) => value instanceof Response,
  operatorAuditUser: (access: any) => ({
    userId: access.user?.id || 'local-operator',
    email: access.user?.email || null,
    name: access.user?.name || null,
    role: access.user?.role || 'admin',
  }),
}));

describe('listing intake route contracts', () => {
  it('returns a 400 for malformed listing intake create JSON', async () => {
    const { POST } = await import('@/app/api/command-center/listing-intakes/route');

    const response = await POST(malformedRequest('http://localhost/api/command-center/listing-intakes') as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual(expect.objectContaining({
      error: true,
      message: 'Invalid JSON listing intake request.',
    }));
  });

  it('returns a 400 for malformed listing intake update JSON', async () => {
    const { PUT } = await import('@/app/api/command-center/listing-intakes/[intakeId]/route');

    const response = await PUT(
      malformedRequest('http://localhost/api/command-center/listing-intakes/li_12345678-1234-4234-9234-123456789abc') as any,
      { params: Promise.resolve({ intakeId: 'li_12345678-1234-4234-9234-123456789abc' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual(expect.objectContaining({
      error: true,
      message: 'Invalid JSON listing intake update request.',
    }));
  });

  it('returns a 400 for malformed canonical property-link JSON', async () => {
    const { PUT } = await import('@/app/api/command-center/listing-intakes/[intakeId]/property-link/route');

    const response = await PUT(
      malformedRequest('http://localhost/api/command-center/listing-intakes/li_12345678-1234-4234-9234-123456789abc/property-link') as any,
      { params: Promise.resolve({ intakeId: 'li_12345678-1234-4234-9234-123456789abc' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual(expect.objectContaining({
      error: true,
      message: 'Invalid JSON canonical listing update request.',
    }));
  });
});

function malformedRequest(url: string) {
  return new Request(url, {
    method: 'PUT',
    body: '{',
    headers: { 'content-type': 'application/json' },
  });
}
