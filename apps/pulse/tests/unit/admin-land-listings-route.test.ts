// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { normalizeListing } from '@/lib/data/listingContract';
import { landEditorInput, landFacts } from '../fixtures/landListing';

const mocks = vi.hoisted(() => ({ access: vi.fn(), read: vi.fn(), write: vi.fn(), revalidate: vi.fn(), upload: vi.fn() }));
vi.mock('@/lib/core/routeAuth', () => ({ requireOperatorRouteAccess: mocks.access, isAuthResponse: (value: unknown) => value instanceof Response }));
vi.mock('@/lib/data/listingRepository', () => ({ getCanonicalListingForEdit: mocks.read, upsertCanonicalListing: mocks.write }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('@/config/cloudinary', () => ({ default: { uploader: { upload: mocks.upload } } }));
import { GET, PUT } from '@/app/api/admin/listings/route';

const original = normalizeListing({ id: 'land-record', mls_id: landEditorInput.mls_id, metadata: { private_note: 'never public', land_details: landFacts } });
function request(overrides: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...landEditorInput, ...overrides })) form.set(key, value);
  return new NextRequest('http://localhost/api/admin/listings', { method: 'PUT', body: form });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({ allowed: true, mode: 'local' });
  mocks.read.mockResolvedValue({ listing: original, archived: false });
  mocks.write.mockImplementation(async (input) => normalizeListing(input));
});

describe('admin land listing route', () => {
  it.each([401, 403])('refuses reads and writes when access returns %s', async (status) => {
    mocks.access.mockResolvedValue(new Response('Denied', { status }));
    expect((await GET(new NextRequest(`http://localhost/api/admin/listings?mlsId=${landEditorInput.mls_id}`))).status).toBe(status);
    expect((await PUT(request())).status).toBe(status);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it('loads editable public land facts without returning private metadata', async () => {
    const response = await GET(new NextRequest(`http://localhost/api/admin/listings?mlsId=${landEditorInput.mls_id}`));
    const body = await response.json();
    expect(body.data).toMatchObject({ land_surveyed_acres: 4.866, land_documents: landEditorInput.land_documents });
    expect(JSON.stringify(body)).not.toContain('never public');
  });

  it('saves validated facts, preserves unrelated metadata, and refreshes detail routes', async () => {
    const response = await PUT(request());
    expect(response.status).toBe(200);
    expect(mocks.write.mock.calls[0][0].metadata).toEqual({ private_note: 'never public', land_details: landFacts });
    expect(mocks.revalidate).toHaveBeenCalledWith('/properties/land-record');
    expect(mocks.revalidate).toHaveBeenCalledWith(`/properties/${landEditorInput.mls_id}`);
    expect((await response.json()).data.land_surveyed_acres).toBe(4.866);
  });

  it('rejects malformed source documents before reading or writing the catalog', async () => {
    expect((await PUT(request({ land_documents: 'Packet | javascript:alert(1)' }))).status).toBe(400);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('does not restore an archived listing', async () => {
    mocks.read.mockResolvedValue({ listing: original, archived: true });
    expect((await PUT(request())).status).toBe(409);
    expect(mocks.write).not.toHaveBeenCalled();
  });
});
