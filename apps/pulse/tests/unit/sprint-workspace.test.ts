import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.fn();
const accessMock = vi.fn();
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: fromMock } }));
vi.mock('@/lib/platform/access/workspaceAccess.server', () => ({ requireWorkspaceAccess: accessMock }));

const actorId = crypto.randomUUID();
const workspaceId = crypto.randomUUID();
const sprintId = crypto.randomUUID();
const itemId = crypto.randomUUID();
const backlogId = crypto.randomUUID();

function queryResult(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise.resolve(resolve({ data, error })),
  };
  return query;
}

describe('workspace-aware sprint reads', () => {
  beforeEach(() => {
    fromMock.mockReset();
    accessMock.mockReset().mockResolvedValue({ workspaceId, actorId, role: 'member', workspace: { kind: 'team', name: 'Team', status: 'active', revision: 1 } });
  });

  it('loads mapped sprints and their dependent records', async () => {
    fromMock
      .mockReturnValueOnce(queryResult([{ resource_id: sprintId, resource_type: 'sprint' }]))
      .mockReturnValueOnce(queryResult([{ id: sprintId }]))
      .mockReturnValueOnce(queryResult([{ id: itemId, sprint_id: sprintId, backlog_item_id: backlogId }]))
      .mockReturnValueOnce(queryResult([{ id: crypto.randomUUID(), sprint_item_id: itemId }]))
      .mockReturnValueOnce(queryResult([{ id: backlogId }]));

    const { listSprintsForWorkspace } = await import('@/lib/property-sprints/sprintWorkspace.server');
    await expect(listSprintsForWorkspace(actorId, workspaceId)).resolves.toMatchObject({
      sprints: [{ id: sprintId }], items: [{ id: itemId }], backlog: [{ id: backlogId }],
    });
    expect(accessMock).toHaveBeenCalledWith(actorId, workspaceId, 'workspace:read');
    expect(fromMock).toHaveBeenNthCalledWith(1, 'platform_scope_links');
    expect(fromMock).toHaveBeenNthCalledWith(2, 'sprints');
  });

  it('does not fall back to owner-scoped sprint rows when no mapping exists', async () => {
    fromMock.mockReturnValueOnce(queryResult([]));

    const { listSprintsForWorkspace } = await import('@/lib/property-sprints/sprintWorkspace.server');
    await expect(listSprintsForWorkspace(actorId, workspaceId)).resolves.toEqual({ sprints: [], items: [], assignments: [], backlog: [], schedules: [] });
    expect(fromMock).toHaveBeenCalledTimes(1);
  });
});
