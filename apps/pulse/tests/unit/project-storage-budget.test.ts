import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBudgetedSignedUploadUrl, uploadWithStorageBudget } from '@/lib/storage/projectStorageBudget.mjs';

const rpc = vi.fn();
const upload = vi.fn();
const signed = vi.fn();
const from = vi.fn(() => ({ upload, createSignedUploadUrl: signed }));
// A narrow fixture exercises the production helper's Supabase protocol.
const client = { rpc, storage: { from } } as unknown as Parameters<typeof uploadWithStorageBudget>[0];

describe('project storage admission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: { reservationId: 'fixture', maxBytes: 1000 }, error: null });
    upload.mockResolvedValue({ data: { path: 'capture.png' }, error: null });
    signed.mockResolvedValue({ data: { path: 'capture.png', token: 'fixture', signedUrl: '/fixture' }, error: null });
  });
  it('reserves authoritative body bytes before issuing an immutable upload', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    await uploadWithStorageBudget(client, 'property-scans', 'capture.png', bytes, { upsert: true });
    expect(rpc).toHaveBeenCalledWith('reserve_project_storage', { p_bucket: 'property-scans', p_name: 'capture.png', p_bytes: 3 });
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(upload.mock.invocationCallOrder[0]);
    expect(upload).toHaveBeenCalledWith('capture.png', bytes, { upsert: false });
  });
  it('does not issue a signed capability when the global budget is exhausted', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Project storage budget reached; new uploads are paused' } });
    const result = await createBudgetedSignedUploadUrl(client, 'property-scans', 'capture.png', 100);
    expect(result.error).toMatchObject({ code: 'STORAGE_BUDGET_EXCEEDED', statusCode: '507' });
    expect(signed).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
  it.each(['missing migration', 'transport failure', 'malformed response'])('fails closed for %s', async (kind) => {
    if (kind === 'transport failure') rpc.mockRejectedValue(new Error('private network details'));
    else rpc.mockResolvedValue(kind === 'missing migration' ? { data: null, error: { code: 'PGRST202', message: 'private schema details' } } : { data: {} });
    const result = await uploadWithStorageBudget(client, 'cartridges', 'test.tah', new Uint8Array([1]));
    expect(result.error).toMatchObject({ code: 'STORAGE_BUDGET_UNAVAILABLE', statusCode: '503' });
    expect(JSON.stringify(result)).not.toContain('private');
    expect(upload).not.toHaveBeenCalled();
  });
  it('keeps signed uploads behind the same admission protocol', async () => {
    await createBudgetedSignedUploadUrl(client, 'property-scans', 'capture.png', 500);
    expect(rpc).toHaveBeenCalledWith('reserve_project_storage', { p_bucket: 'property-scans', p_name: 'capture.png', p_bytes: 500 });
    expect(signed).toHaveBeenCalledWith('capture.png', { upsert: false });
  });
  it('refuses an admission response smaller than the body', async () => {
    rpc.mockResolvedValue({ data: { reservationId: 'fixture', maxBytes: 1 } });
    const result = await uploadWithStorageBudget(client, 'cartridges', 'test.tah', new Uint8Array([1,2]));
    expect(result.error?.statusCode).toBe('503');
    expect(upload).not.toHaveBeenCalled();
  });
  it.each([new Uint8Array(), {} as Uint8Array])('rejects unknown or empty upload size before reserving', async (body) => {
    const result = await uploadWithStorageBudget(client, 'cartridges', 'test.tah', body);
    expect(result.error?.statusCode).toBe('400');
    expect(rpc).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });
  it('reserves File size without reading or transforming private file contents', async () => {
    const file = new File(['fixture'], 'capture.png');
    await uploadWithStorageBudget(client, 'property-scans', file.name, file);
    expect(rpc.mock.calls[0][1].p_bytes).toBe(file.size);
    expect(upload.mock.calls[0][1]).toBe(file);
  });
  it('does not release uncertain capacity after a provider failure', async () => {
    upload.mockResolvedValue({ data: null, error: { message: 'timeout' } });
    await uploadWithStorageBudget(client, 'cartridges', 'test.tah', new Uint8Array([1]));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe('reserve_project_storage');
  });
});
