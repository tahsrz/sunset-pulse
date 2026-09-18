import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({ requireSignedInUser: mocks.auth, isAuthResponse: (value: unknown) => value instanceof Response }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock('@/lib/platform/access/workspaceAccess.server', async (original) => ({
  ...await original<typeof import('@/lib/platform/access/workspaceAccess.server')>(), requireWorkspaceAccess: mocks.access,
}));
import { POST as start, GET as runs, PATCH as cancel } from '@/app/api/workspaces/[workspaceId]/runs/route';
import { POST as respond, GET as checkpoints } from '@/app/api/workspaces/[workspaceId]/checkpoints/route';
import { WorkspaceAccessError } from '@/lib/platform/access/workspaceAccess.server';
import { POST as recover } from '@/app/api/workspaces/[workspaceId]/runs/recover/route';
import { POST as supersede } from '@/app/api/workspaces/[workspaceId]/runs/supersede/route';
import { POST as install } from '@/app/api/workspaces/[workspaceId]/apps/route';
import manifest from '@/lib/platform/apps/manifests/real-estate-readiness.v1.json';

const actor = '11111111-1111-4111-8111-111111111111';
const workspace = '22222222-2222-4222-8222-222222222222';
const checkpoint = '33333333-3333-4333-8333-333333333333';
const context = () => ({ params: Promise.resolve({ workspaceId: workspace }) });
const request = (body: unknown, method = 'POST', origin = 'http://localhost') => new NextRequest('http://localhost/api/workspaces/' + workspace + '/runs', {
  method, headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body),
});
const graph = { schemaVersion: 1, key: 'fixture', version: 1, entry: 'done', nodes: [{ id: 'done', kind: 'complete' }] };
const answer = { checkpointId: checkpoint, submissionKey: actor, expectedRevision: 1, value: 'Keller' };

describe('workspace JSON run and checkpoint routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: actor }, allowed: true, mode: 'user' });
    mocks.access.mockResolvedValue({ workspaceId: workspace });
    mocks.rpc.mockResolvedValue({ data: [{ id: checkpoint }], error: null });
  });
  it('starts a validated run under the signed-in actor with a private response', async () => {
    const result = await start(request({ requestKey: actor, definition: graph }), context());
    expect(result.status).toBe(200);
    expect(result.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_start_run', { p_actor_id: actor, p_workspace_id: workspace, p_request_key: actor, p_definition: graph });
  });
  it('rejects unauthenticated callers before any workspace access', async () => {
    mocks.auth.mockResolvedValue(new Response(null, { status: 401 }));
    expect((await respond(request(answer), context())).status).toBe(401);
    expect(mocks.access).not.toHaveBeenCalled();
  });
  it('denies a foreign workspace before a mutation', async () => {
    mocks.access.mockRejectedValue(new WorkspaceAccessError('NOT_FOUND', 'Workspace not found.'));
    expect((await respond(request(answer), context())).status).toBe(404);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('rejects cross-origin browser writes', async () => {
    expect((await respond(request(answer, 'POST', 'https://foreign.example'), context())).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('accepts the real loopback Host after NextURL normalizes the request URL', async () => {
    const req=new NextRequest(`http://localhost/api/workspaces/${workspace}/runs`,{
      method:'POST',headers:{Host:'127.0.0.1:3176',Origin:'http://127.0.0.1:3176','Content-Type':'application/json'},
      body:JSON.stringify({requestKey:actor,definition:graph}),
    });
    expect((await start(req,context())).status).toBe(200);
  });
  it('does not trust a forwarded host to authorize cross-origin writes', async () => {
    const req=request(answer,'POST','https://foreign.example');
    req.headers.set('host','localhost');req.headers.set('x-forwarded-host','foreign.example');
    expect((await respond(req,context())).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('bounds the streamed body before parsing', async () => {
    expect((await respond(request({ value: 'x'.repeat(131073) }), context())).status).toBe(413);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('does not accept client actor/role overrides', async () => {
    expect((await respond(request({ ...answer, actorId: workspace, role: 'owner' }), context())).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([['40001', 409], ['42501', 403], ['55000', 503], ['P0002', 404], ['XX000', 500]])('maps %s to a safe response', async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code, message: 'secret internal detail' } });
    const result = await respond(request(answer), context());
    expect(result.status).toBe(status);
    expect(await result.text()).not.toContain('secret');
  });
  it('uses the same response endpoint for a boolean gate decision', async () => {
    const result = await respond(request({ ...answer, value: true }), context());
    expect(result.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('platform_respond_checkpoint', expect.objectContaining({ p_actor_id: actor, p_value: true, p_expected_revision: 1 }));
  });
  it('cancels with the expected revision', async () => {
    expect((await cancel(request({ runId: checkpoint, expectedRevision: 3 }, 'PATCH'), context())).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('platform_cancel_run', expect.objectContaining({ p_run_id: checkpoint, p_expected_revision: 3 }));
  });
  it.each([runs, checkpoints])('bounds and scopes each private read', async (handler) => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
    mocks.from.mockReturnValue(query);
    const result = await handler(new NextRequest('http://localhost/api/workspaces/' + workspace + '/runs'), context());
    expect(result.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith('workspace_id', workspace);
    expect(query.limit).toHaveBeenCalled();
  });
  it('recovers a blocked run using the signed-in actor and a checked revision', async () => {
    expect((await recover(request({runId: checkpoint, expectedRevision: 2}), context())).status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith(actor,workspace,'workspace:manage_apps');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_recover_run',expect.objectContaining({p_actor_id:actor,p_expected_revision:2}));
  });
  it('supersedes without overwriting an answer through the checkpoint endpoint', async () => {
    expect((await supersede(request({runId:checkpoint,expectedRevision:2,requestKey:actor,definition:graph,reason:'Changed inputs'}),context())).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('platform_supersede_run',expect.objectContaining({p_run_id:checkpoint,p_reason:'Changed inputs'}));
  });
  it('saves a validated inert install through the app-management boundary', async () => {
    expect((await install(request({manifest,settings:{area:'keller-westlake'},status:'installed',expectedRevision:null}),context())).status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith(actor,workspace,'workspace:manage_apps');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_save_app_install',expect.objectContaining({p_actor_id:actor,p_manifest:manifest,p_expected_revision:null}));
  });
  it('rejects unsupported manifest capability execution before persistence', async () => {
    expect((await install(request({manifest:{...manifest,capabilities:[{tool:'send'}]},settings:{area:'keller-westlake'},status:'installed',expectedRevision:null}),context())).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('returns bounded pages with a deterministic tie-break cursor', async () => {
    const rows=[{id:actor,created_at:'2026-09-18T12:00:00+00:00'},{id:checkpoint,created_at:'2026-09-18T12:00:00+00:00'}];
    const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),or:vi.fn().mockReturnThis(),limit:vi.fn().mockResolvedValue({data:rows,error:null})};
    mocks.from.mockReturnValue(query);
    const result=await runs(new NextRequest(`http://localhost/api/workspaces/${workspace}/runs?limit=1`),context());
    const page=(await result.json()).result;
    expect(page.items).toEqual([rows[0]]);expect(page.nextCursor).toBeTypeOf('string');
    expect(query.limit).toHaveBeenCalledWith(2);expect(query.order).toHaveBeenCalledWith('id',{ascending:false});
    await runs(new NextRequest(`http://localhost/api/workspaces/${workspace}/runs?limit=1&cursor=${page.nextCursor}`),context());
    expect(query.or).toHaveBeenCalledWith(expect.stringContaining(`id.lt.${actor}`));
  });
  it('rejects an unbounded page request before DB access', async () => {
    expect((await runs(new NextRequest(`http://localhost/api/workspaces/${workspace}/runs?limit=1000`),context())).status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
