import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/supabase',()=>({supabaseAdmin:mocks}));
import { requireOwnerCompatiblePlanning } from '@/lib/platform/access/sprintPlanningScope.server';
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
});
