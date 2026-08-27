import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ access: vi.fn(), persist: vi.fn(), load: vi.fn() }));
vi.mock('@/lib/core/operator_access', () => ({ getOperatorAccess: mocks.access }));
vi.mock('@/lib/profit/conversionBaselineStore', () => ({ persistConversionBaseline: mocks.persist, loadConversionBaseline: mocks.load }));

import { GET, POST } from '@/app/api/admin/profit/baseline/route';

describe('LUNA-402 conversion baseline route', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.access.mockResolvedValue({ allowed: true }); mocks.persist.mockResolvedValue({ id: 'baseline-1' }); });
  it('rejects non-operators', async () => { mocks.access.mockResolvedValue({ allowed: false }); expect((await POST(request({}))).status).toBe(403); });
  it('rejects an inverted measurement window', async () => { expect((await POST(request({ windowStart: '2026-08-25T00:00:00Z', windowEnd: '2026-08-24T00:00:00Z', handoffPercent: 20, appointmentPercent: 10 }))).status).toBe(400); });
  it('persists a validated baseline', async () => {
    const response = await POST(request({ windowStart: '2026-08-01T00:00:00Z', windowEnd: '2026-08-15T00:00:00Z', handoffPercent: 20, appointmentPercent: 10 }));
    expect(response.status).toBe(200);
    expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({ tenantSite: 'agent-one.sunsetpulse.app', handoffPercent: 20, appointmentPercent: 10 }));
  });
  it('returns the active baseline to an operator', async () => {
    mocks.load.mockResolvedValue({ tenantSite: 'agent-one.sunsetpulse.app', handoffPercent: 20, appointmentPercent: 10, windowStart: '2026-08-01T00:00:00.000Z', windowEnd: '2026-08-15T00:00:00.000Z' });
    const response = await GET(new NextRequest('http://localhost/api/admin/profit/baseline', { headers: { host: 'agent-one.sunsetpulse.app' } }));
    expect(response.status).toBe(200); expect((await response.json()).baseline.handoffPercent).toBe(20);
  });
});

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/profit/baseline', { method: 'POST', headers: { host: 'agent-one.sunsetpulse.app', 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
