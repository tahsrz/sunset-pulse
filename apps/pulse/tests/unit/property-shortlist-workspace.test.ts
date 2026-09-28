import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.fn();
const rpcMock = vi.fn();
const accessMock = vi.fn();
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: fromMock, rpc: rpcMock } }));
vi.mock('@/lib/platform/access/workspaceAccess.server', () => ({ requireWorkspaceAccess: accessMock }));

const actorId = crypto.randomUUID();
const workspaceId = crypto.randomUUID();

function queryResult(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    upsert: vi.fn(() => query),
    single: vi.fn(async () => ({ data, error })),
    limit: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise.resolve(resolve({ data, error })),
  };
  return query;
}

const property = {
  id: crypto.randomUUID(), owner_id: actorId, revision: 2, status: 'active', area_key: 'keller-westlake',
  address: '1 Main Street', city: 'Keller', state: 'TX', postal_code: '76262', mls_id: null,
  county: 'Tarrant', parcel_number: null, property_kind: 'residential', unresolved_questions: [],
};

describe('workspace-aware property shortlist reads', () => {
  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
    accessMock.mockReset().mockResolvedValue({ workspaceId, actorId, role: 'member', workspace: { kind: 'team', name: 'Team', status: 'active', revision: 1 } });
  });

  it('loads only explicitly mapped shortlist entries', async () => {
    fromMock
      .mockReturnValueOnce(queryResult([{ resource_id: property.id }, { resource_id: property.id }]))
      .mockReturnValueOnce(queryResult([property]));

    const { listShortlistEntriesForWorkspace } = await import('@/lib/property-sprints/shortlist.server');
    await expect(listShortlistEntriesForWorkspace(actorId, workspaceId)).resolves.toMatchObject([{ id: property.id, city: 'Keller' }]);
    expect(accessMock).toHaveBeenCalledWith(actorId, workspaceId, 'workspace:read');
    expect(fromMock).toHaveBeenNthCalledWith(1, 'platform_scope_links');
    expect(fromMock).toHaveBeenNthCalledWith(2, 'property_shortlist_entries');
  });

  it('returns an empty shortlist without falling back to owner-only rows', async () => {
    fromMock.mockReturnValueOnce(queryResult([]));

    const { listShortlistEntriesForWorkspace } = await import('@/lib/property-sprints/shortlist.server');
    await expect(listShortlistEntriesForWorkspace(actorId, workspaceId)).resolves.toEqual([]);
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it('propagates workspace authorization failures before reading scope links', async () => {
    accessMock.mockRejectedValueOnce(new Error('Workspace not found.'));

    const { listShortlistEntriesForWorkspace } = await import('@/lib/property-sprints/shortlist.server');
    await expect(listShortlistEntriesForWorkspace(actorId, workspaceId)).rejects.toThrow('Workspace not found.');
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('creates a new property and immediately persists its explicit workspace link', async () => {
    const created = { ...property, id: crypto.randomUUID(), revision: 1 };
    fromMock
      .mockReturnValueOnce(queryResult([]))
      .mockReturnValueOnce(queryResult([]));
    rpcMock.mockResolvedValueOnce({ data: [created], error: null });

    const { saveShortlistEntryForWorkspace } = await import('@/lib/property-sprints/shortlist.server');
    await expect(saveShortlistEntryForWorkspace(actorId, workspaceId, {
      address: created.address, city: created.city, state: created.state, postalCode: created.postal_code,
      mlsId: created.mls_id, county: created.county, parcelNumber: created.parcel_number,
      propertyKind: created.property_kind, unresolvedQuestions: [],
    }, null)).resolves.toMatchObject({ id: created.id, ownerId: actorId });
    expect(fromMock).toHaveBeenNthCalledWith(1, 'platform_scope_links');
    expect(rpcMock).toHaveBeenCalledWith('platform_save_property_shortlist_entry', expect.objectContaining({
      p_actor_id: actorId, p_workspace_id: workspaceId, p_property_id: null, p_expected_revision: null,
    }));
  });
});
