import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  adminFrom: vi.fn(),
  sessionFrom: vi.fn(),
  leadMaybeSingle: vi.fn(),
  siteMaybeSingle: vi.fn(),
  detailMaybeSingle: vi.fn(),
  insertSingle: vi.fn(),
  privateInsert: vi.fn(),
  expiredCleanup: vi.fn(),
  deleteSelect: vi.fn(),
  detailInsert: vi.fn(),
  detailDelete: vi.fn(),
}));

vi.mock('@/lib/core/routeAuth', () => ({ requireOperatorRouteAccess: mocks.requireAccess, isAuthResponse: (value: unknown) => value instanceof Response }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.adminFrom } }));
vi.mock('@/utils/supabase/server', () => ({ createClient: () => ({ from: mocks.sessionFrom }) }));

import { DELETE, GET, POST } from '@/app/api/admin/agent-leads/[leadId]/cma-details/route';

const leadId = 'c3a0b539-406e-4983-80a2-810f795500a7';
const ownerId = '9f4678ce-07e7-4200-a674-c14e14f96435';

function request(method: string, body?: unknown) {
  return new NextRequest(`https://sunsetpulse.app/api/admin/agent-leads/${leadId}/cma-details`, {
    method,
    ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  });
}

const context = { params: Promise.resolve({ leadId }) };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccess.mockResolvedValue({ allowed: true, mode: 'authenticated', user: { id: ownerId, role: 'realtor' } });
  mocks.leadMaybeSingle.mockResolvedValue({ data: { id: leadId, agent_id: 'keller-agent', metadata: { sellerPlan: { requestKind: 'pricing_review' } } }, error: null });
  mocks.siteMaybeSingle.mockResolvedValue({ data: { agent_id: 'keller-agent' }, error: null });
  mocks.detailMaybeSingle.mockResolvedValue({ data: { property_address: '12 Cedar Street', consent_captured_at: '2026-10-02T12:00:00Z', expires_at: '2026-12-31T12:00:00Z' }, error: null });
  mocks.insertSingle.mockResolvedValue({ data: { lead_id: leadId, consent_captured_at: '2026-10-02T12:00:00Z', expires_at: '2026-12-31T12:00:00Z' }, error: null });
  mocks.deleteSelect.mockResolvedValue({ data: [{ lead_id: leadId }], error: null });
  mocks.detailInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mocks.insertSingle }) });
  mocks.detailDelete.mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ select: mocks.deleteSelect }),
    }),
  });
  mocks.adminFrom.mockImplementation((table: string) => ({
    insert: mocks.privateInsert,
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: table === 'agent_site_leads' ? mocks.leadMaybeSingle : mocks.siteMaybeSingle })),
      })),
    })),
  }));
  mocks.privateInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mocks.insertSingle }) });
  mocks.expiredCleanup.mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ lte: vi.fn().mockResolvedValue({ error: null }) }),
    }),
  });
  const privateTable = {
    delete: mocks.expiredCleanup,
    insert: mocks.privateInsert,
  };
  mocks.sessionFrom.mockReturnValue({
    select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: mocks.detailMaybeSingle })) })) })),
    insert: mocks.detailInsert,
    delete: mocks.detailDelete,
  });
  const adminFrom = mocks.adminFrom.getMockImplementation();
  mocks.adminFrom.mockImplementation((table: string) => table === 'seller_cma_private_details' ? privateTable : adminFrom?.(table));
});

describe('owner-scoped private CMA detail route', () => {
  it('requires an authenticated account and refuses local operator bypass', async () => {
    mocks.requireAccess.mockResolvedValueOnce({ allowed: true, mode: 'local', user: null });
    const response = await POST(request('POST', { propertyAddress: '12 Cedar Street', sellerPermissionConfirmed: true }), context);
    expect(response.status).toBe(401);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('hides a pricing request unless the signed-in user owns its configured agent site', async () => {
    mocks.siteMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const response = await GET(request('GET'), context);
    expect(response.status).toBe(404);
    expect(mocks.sessionFrom).not.toHaveBeenCalled();
  });

  it('records the address only after explicit seller permission and binds it to the auth/site/lead scope', async () => {
    const response = await POST(request('POST', { propertyAddress: '12 Cedar Street', sellerPermissionConfirmed: true }), context);
    expect(response.status).toBe(201);
    expect(mocks.adminFrom).toHaveBeenCalledWith('seller_cma_private_details');
    expect(mocks.privateInsert).toHaveBeenCalledWith({
      lead_id: leadId,
      agent_id: 'keller-agent',
      owner_user_id: ownerId,
      property_address: '12 Cedar Street',
      seller_permission_confirmed: true,
      consent_text_version: 'cma-address-consent.v1',
    });
    expect(mocks.expiredCleanup).toHaveBeenCalledOnce();
    expect(await response.json()).toMatchObject({ ok: true, details: { leadId } });
  });

  it('rejects an address without recorded seller permission before writing', async () => {
    const response = await POST(request('POST', { propertyAddress: '12 Cedar Street', sellerPermissionConfirmed: false }), context);
    expect(response.status).toBe(400);
    expect(mocks.sessionFrom).not.toHaveBeenCalled();
  });

  it('returns private no-store details with their fixed expiry and permits owner deletion', async () => {
    const read = await GET(request('GET'), context);
    expect(read.headers.get('cache-control')).toContain('no-store');
    expect(await read.json()).toMatchObject({ details: { propertyAddress: '12 Cedar Street', expiresAt: '2026-12-31T12:00:00Z' } });

    const deleted = await DELETE(request('DELETE'), context);
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toMatchObject({ deleted: true });
  });
});
