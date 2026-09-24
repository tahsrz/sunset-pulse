import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/supabase',()=>({supabaseAdmin:mocks}));
import { listMappedPlannerResourceIds, requireOwnerCompatiblePlanning, resolveOwnerCompatiblePlanningScope } from '@/lib/platform/access/sprintPlanningScope.server';
import { runSprintPlannerWorkflow } from '@/lib/autonomous-workflows/sprintPlannerWorkflow.server';
describe('legacy owner planning boundary',()=>{
  beforeEach(()=>vi.resetAllMocks());
  it('fences access with the stored job and lease',async()=>{
    mocks.rpc.mockResolvedValue({error:null});
    await requireOwnerCompatiblePlanning('job','lease');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_require_owner_planning',{p_job_id:'job',p_lease_token:'lease'});
  });
  it('does not read owner backlog after a scope denial',async()=>{
    mocks.rpc.mockResolvedValue({error:{code:'42501'}});
    await expect(runSprintPlannerWorkflow({id:'job',lease_token:'lease'} as any)).rejects.toThrow('owner-compatible');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('resolves the owner and workspace from the leased scheduler job before planner reads', async () => {
    const owner = '11111111-1111-4111-8111-111111111111';
    const workspace = '22222222-2222-4222-8222-222222222222';
    mocks.rpc.mockResolvedValue({ error: null });
    const jobQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'job', user_id: owner, schedule_id: 'schedule', planning_mode: 'manual_backlog' }, error: null }) };
    const linkQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { workspace_id: workspace, status: 'mapped' }, error: null }) };
    mocks.from.mockReturnValueOnce(jobQuery).mockReturnValueOnce(linkQuery);

    await expect(resolveOwnerCompatiblePlanningScope('job', 'lease')).resolves.toEqual({
      jobId: 'job', ownerId: owner, workspaceId: workspace, planningMode: 'manual_backlog',
    });
    expect(mocks.from).toHaveBeenCalledWith('workflow_jobs');
    expect(mocks.from).toHaveBeenCalledWith('platform_scope_links');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_require_owner_planning', { p_job_id: 'job', p_lease_token: 'lease' });
  });

  it('returns only mapped resources owned by the leased planner identity', async () => {
    mocks.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => void) => resolve({ data: [
        { resource_id: 'one', owner_id: '11111111-1111-4111-8111-111111111111' },
        { resource_id: 'foreign', owner_id: '33333333-3333-4333-8333-333333333333' },
        { resource_id: 'two', owner_id: null },
      ], error: null }),
    });
    await expect(listMappedPlannerResourceIds({ jobId: 'job', ownerId: '11111111-1111-4111-8111-111111111111', workspaceId: '22222222-2222-4222-8222-222222222222', planningMode: 'manual_backlog' }, 'sprint_backlog_item')).resolves.toEqual(['one', 'two']);
  });

  it('keeps scoped proposal persistence on the workspace RPC boundary', async () => {
    mocks.rpc.mockResolvedValue({ error: null });
    const jobQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'job', user_id: '11111111-1111-4111-8111-111111111111', schedule_id: 'schedule', planning_mode: 'manual_backlog' }, error: null }) };
    const linkQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { workspace_id: '22222222-2222-4222-8222-222222222222', status: 'mapped' }, error: null }) };
    mocks.from.mockReturnValueOnce(jobQuery).mockReturnValueOnce(linkQuery);
    await resolveOwnerCompatiblePlanningScope('job', 'lease');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_require_owner_planning', { p_job_id: 'job', p_lease_token: 'lease' });
  });
});
