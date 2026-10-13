import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectProjectStorage, publishBackgroundCartridge } from '@/lib/storage/projectStorageMaintenance.mjs';
import { projectStoragePolicy } from '@/lib/storage/projectStoragePolicy.mjs';

const rpc = vi.fn(), info = vi.fn(), upload = vi.fn(), from = vi.fn(() => ({ info, upload }));
const client = { rpc, storage: { from } } as unknown as Parameters<typeof inspectProjectStorage>[0];
const healthy = () => ({
  limitBytes: 800_000_000, liveBytes: 362399, reservedBytes: 0, retiredBytes: 0,
  availableBytes: 799637601, observedBytes: 362399, databaseBytes: 47934611,
  pendingUploads: 0, unknownSizeObjects: 0, paused: false,
  bucketLimits: [{ id: 'cartridges', fileLimitBytes: 5242880 }, { id: 'property-scans', fileLimitBytes: 50000000 }],
});
let snapshot: ReturnType<typeof healthy>;

describe('scheduled storage policy', () => {
  beforeEach(() => {
    vi.clearAllMocks(); snapshot = healthy();
    rpc.mockImplementation((name: string) => Promise.resolve(name === 'project_storage_budget_status'
      ? { data: snapshot, error: null } : { data: { reservationId: 'fixture', maxBytes: 5242880 }, error: null }));
    info.mockResolvedValue({ data: null, error: { statusCode: '404' } });
    upload.mockResolvedValue({ data: { path: 'session.tah' }, error: null });
  });
  afterEach(() => vi.useRealTimers());

  it('reports healthy capacity without writing or deleting anything', async () => {
    const result = await inspectProjectStorage(client);
    expect(result).toMatchObject({ status: 'healthy', backgroundUploadsAllowed: true, reasons: [] });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('project_storage_budget_status');
    expect(from).not.toHaveBeenCalled();
  });
  it('counts pending and retired bytes against the background ceiling', async () => {
    Object.assign(snapshot, { liveBytes: 600000000, observedBytes: 600000000, reservedBytes: 95000000, retiredBytes: 1000000, availableBytes: 104000000 });
    const result = await inspectProjectStorage(client);
    expect(result.backgroundUploadsAllowed).toBe(false);
    expect(result.reasons).toContain('background_file_budget_reached');
    expect(result.metrics?.chargedBytes).toBe(696000000);
  });
  it('pauses generated files at the database warning threshold', async () => {
    snapshot.databaseBytes = projectStoragePolicy.databaseWarningBytes;
    expect(await inspectProjectStorage(client)).toMatchObject({ status: 'warning', backgroundUploadsAllowed: false, reasons: ['database_near_limit'] });
  });
  it.each(['paused', 'drift', 'unknown sizes'])('blocks background writes for %s', async (kind) => {
    if (kind === 'paused') snapshot.paused = true;
    else if (kind === 'drift') snapshot.observedBytes += 1;
    else snapshot.unknownSizeObjects = 1;
    expect(await inspectProjectStorage(client)).toMatchObject({ status: 'blocked', backgroundUploadsAllowed: false });
  });
  it.each(['property-scans', 'cartridges', '__proto__'])('detects an incompatible native limit for %s', async (id) => {
    snapshot.bucketLimits = [{ id: 'cartridges', fileLimitBytes: 5242880 }, { id, fileLimitBytes: 78643200 }];
    expect((await inspectProjectStorage(client)).reasons).toContain('bucket_limit_mismatch');
  });
  it.each(['RPC failure', 'old schema', 'invalid budget'])('fails closed for %s', async (kind) => {
    if (kind === 'RPC failure') rpc.mockRejectedValue(new Error('private provider detail'));
    else if (kind === 'old schema') snapshot = { limitBytes: 800000000 } as typeof snapshot;
    else snapshot.limitBytes = 1000000000;
    const result = await inspectProjectStorage(client);
    expect(result).toMatchObject({ status: 'unavailable', backgroundUploadsAllowed: false, metrics: null });
    expect(JSON.stringify(result)).not.toContain('private');
  });
  it('bounds inspection time so other scheduled work can proceed', async () => {
    vi.useFakeTimers(); rpc.mockReturnValue(new Promise(() => {}));
    const inspection = inspectProjectStorage(client);
    await vi.advanceTimersByTimeAsync(projectStoragePolicy.inspectionTimeoutMs);
    expect(await inspection).toMatchObject({ status: 'unavailable', backgroundUploadsAllowed: false });
  });
  it('does not read or forge file contents when optional publishing is paused', async () => {
    snapshot.paused = true;
    const load = vi.fn();
    expect((await publishBackgroundCartridge(client, 'session.tah', load)).state).toBe('paused');
    expect(load).not.toHaveBeenCalled(); expect(from).not.toHaveBeenCalled();
  });
  it('keeps the backed-up Wikipedia corpus local without cloud calls', async () => {
    const load = vi.fn();
    for (const name of ['wiki_en_0123.tah', 'wikipedia-catalog.json', 'sessions/wiki_en_0123.tah']) {
      expect((await publishBackgroundCartridge(client, name, load)).state).toBe('skipped');
    }
    expect(rpc).not.toHaveBeenCalled(); expect(load).not.toHaveBeenCalled();
  });
  it('skips an already published immutable path without regenerating it', async () => {
    info.mockResolvedValue({ data: { name: 'session.tah' }, error: null });
    const load = vi.fn();
    expect((await publishBackgroundCartridge(client, 'session.tah', load)).state).toBe('existing');
    expect(load).not.toHaveBeenCalled(); expect(upload).not.toHaveBeenCalled();
  });
  it('requires verified absence rather than treating a cloud outage as a missing file', async () => {
    info.mockResolvedValue({ data: null, error: { statusCode: '503' } });
    const load = vi.fn();
    expect((await publishBackgroundCartridge(client, 'session.tah', load)).state).toBe('paused');
    expect(load).not.toHaveBeenCalled();
  });
  it('does not reserve or upload a cartridge larger than the native publishing limit', async () => {
    const result = await publishBackgroundCartridge(client, 'session.tah', () => new Uint8Array(5242881));
    expect(result.state).toBe('skipped');
    expect(rpc).toHaveBeenCalledOnce(); expect(upload).not.toHaveBeenCalled();
  });
  it('uses admission for a new publication and retains charges after uncertainty', async () => {
    upload.mockResolvedValue({ data: null, error: { message: 'provider timeout' } });
    const result = await publishBackgroundCartridge(client, 'session.tah', () => new Uint8Array([1]));
    expect(result.state).toBe('paused');
    expect(upload).toHaveBeenCalledWith('session.tah', expect.any(Uint8Array), { upsert: false, contentType: 'application/octet-stream' });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(['project_storage_budget_status', 'reserve_project_storage']);
  });
});
