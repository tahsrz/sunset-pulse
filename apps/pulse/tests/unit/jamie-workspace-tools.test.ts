import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ listRuns: vi.fn(), prepareAppLaunch: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/platform/workflows/runStore.server', () => ({ listRuns: mocks.listRuns }));
vi.mock('@/lib/platform/apps/appLaunch.server', () => ({ prepareAppLaunch: mocks.prepareAppLaunch }));

import { prepareWorkspaceLaunchProposalForJamie, readWorkspaceRunsForJamie } from '@/lib/ai/jamieWorkspaceTools';

const actorId = '11111111-1111-4111-8111-111111111111';
const workspaceId = '22222222-2222-4222-8222-222222222222';
const installId = '33333333-3333-4333-8333-333333333333';
const runId = '44444444-4444-4444-8444-444444444444';

describe('Jamie workspace read and proposal tools', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.listRuns.mockResolvedValue({
      items: [
        { id: runId, definition: { key: 'buyer-readiness', version: 1 }, status: 'waiting', revision: 3, created_at: '2026-09-23T12:00:00Z' },
        { id: installId, definition: { key: 'seller-intake', version: 2 }, status: 'completed', revision: 4, created_at: '2026-09-22T12:00:00Z' },
      ],
      nextCursor: null,
    });
    mocks.prepareAppLaunch.mockResolvedValue({
      installId, installRevision: 7, workspaceId, workflow: { key: 'buyer-readiness', version: 1 },
      resourceRefs: [],
    });
  });

  it('reads only a bounded recent run summary from the selected workspace', async () => {
    const result = await readWorkspaceRunsForJamie(actorId, workspaceId, { status: 'waiting', limit: 5 });
    expect(mocks.listRuns).toHaveBeenCalledWith(actorId, workspaceId, new URLSearchParams({ limit: '5' }));
    expect(result).toMatchObject({ kind: 'workspace_run_summary', count: 1, items: [{ id: runId, status: 'waiting' }] });
    expect(JSON.stringify(result)).not.toContain('seller-intake');
    await expect(readWorkspaceRunsForJamie(actorId, workspaceId, { limit: 21 })).rejects.toThrow();
  });

  it('validates a launch proposal without starting or persisting the run', async () => {
    const proposal = await prepareWorkspaceLaunchProposalForJamie(actorId, workspaceId, {
      installId, expectedInstallRevision: 7, workflowKey: 'buyer-readiness', inputs: {}, resourceRefs: [],
    });
    expect(proposal).toMatchObject({
      kind: 'app_launch_proposal', workspaceId, workflowKey: 'buyer-readiness',
      installRevision: 7, confirmation: expect.stringContaining('has not started'),
    });
    expect(proposal.request.requestKey).toMatch(/^[0-9a-f-]{36}$/i);
    expect(mocks.prepareAppLaunch).toHaveBeenCalledWith(actorId, workspaceId, expect.objectContaining({
      installId, workflowKey: 'buyer-readiness', requestKey: proposal.request.requestKey,
    }));
  });
});
