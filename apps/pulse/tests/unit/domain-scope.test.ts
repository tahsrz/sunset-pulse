import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.fn();
const accessMock = vi.fn();
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: fromMock } }));
vi.mock('@/lib/platform/access/workspaceAccess.server', () => ({ requireWorkspaceAccess: accessMock }));

const actorId = crypto.randomUUID();
const propertyId = crypto.randomUUID();
const workspaceId = crypto.randomUUID();

function queryResult(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error })),
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise.resolve(resolve({ data, error })),
  };
  return query;
}

describe('domain workspace scope resolvers', () => {
  beforeEach(() => { fromMock.mockReset(); accessMock.mockReset().mockResolvedValue({ workspaceId }); });

  it('resolves a property through its owner’s single personal workspace', async () => {
    const propertyQuery = queryResult({ owner_id: actorId, revision: 4 });
    const workspaceQuery = queryResult([{ id: workspaceId, created_by: actorId, kind: 'personal', status: 'active' }]);
    fromMock.mockReturnValueOnce(propertyQuery).mockReturnValueOnce(queryResult(null)).mockReturnValueOnce(workspaceQuery);

    const { resolvePropertyShortlistScope } = await import('@/lib/platform/access/domainScope.server');
    await expect(resolvePropertyShortlistScope(actorId, propertyId)).resolves.toEqual({
      resourceType: 'property_shortlist', resourceId: propertyId, ownerId: actorId, workspaceId, resourceRevision: 4,
    });
  });

  it('does not fall back to an owner-only scope when the actor is foreign', async () => {
    const propertyQuery = queryResult({ owner_id: crypto.randomUUID(), revision: 1 });
    fromMock.mockReturnValueOnce(propertyQuery).mockReturnValueOnce(queryResult(null));

    const { resolvePropertyShortlistScope } = await import('@/lib/platform/access/domainScope.server');
    await expect(resolvePropertyShortlistScope(actorId, propertyId)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(fromMock).toHaveBeenCalledTimes(2);
  });

  it('reports ambiguous personal workspace mappings instead of choosing one', async () => {
    const propertyQuery = queryResult({ owner_id: actorId, revision: 1 });
    const workspaceQuery = queryResult([
      { id: workspaceId, created_by: actorId, kind: 'personal', status: 'active' },
      { id: crypto.randomUUID(), created_by: actorId, kind: 'personal', status: 'active' },
    ]);
    fromMock.mockReturnValueOnce(propertyQuery).mockReturnValueOnce(queryResult(null)).mockReturnValueOnce(workspaceQuery);

    const { resolvePropertyShortlistScope } = await import('@/lib/platform/access/domainScope.server');
    await expect(resolvePropertyShortlistScope(actorId, propertyId)).rejects.toMatchObject({ code: 'AMBIGUOUS' });
  });

  it('resolves a team member only through an explicit mapped resource link', async () => {
    fromMock
      .mockReturnValueOnce(queryResult({ resource_id: propertyId, owner_id: crypto.randomUUID(), workspace_id: workspaceId, status: 'mapped', source_revision: 7 }));

    const { resolveWorkspaceMappedResourceScope } = await import('@/lib/platform/access/domainScope.server');
    await expect(resolveWorkspaceMappedResourceScope(actorId, workspaceId, 'property_shortlist', propertyId)).resolves.toMatchObject({
      resourceType: 'property_shortlist', resourceId: propertyId, workspaceId, resourceRevision: 7,
    });
  });

  it('keeps unsupported Vibe and scan adapters explicit', async () => {
    const { resolveScanScope, resolveVibeRevisionScope } = await import('@/lib/platform/access/domainScope.server');
    await expect(resolveScanScope(actorId, 'scan-1')).rejects.toMatchObject({ code: 'UNSUPPORTED' });
    await expect(resolveVibeRevisionScope(actorId, 'revision-1')).rejects.toMatchObject({ code: 'UNSUPPORTED' });
  });
  it('prefers an existing team mapping to the owner personal fallback', async () => {
    fromMock.mockReturnValueOnce(queryResult({ owner_id: actorId, revision: 3 }))
      .mockReturnValueOnce(queryResult({ owner_id: actorId, workspace_id: workspaceId, status: 'mapped' }));
    const { resolvePropertyShortlistScope } = await import('@/lib/platform/access/domainScope.server');
    await expect(resolvePropertyShortlistScope(actorId, propertyId)).resolves.toMatchObject({ workspaceId });
    expect(accessMock).toHaveBeenCalledWith(actorId, workspaceId, 'workspace:read');
    expect(fromMock).toHaveBeenCalledTimes(2);
  });
  it('rejects a revoked member without reinterpreting their resource as personal', async () => {
    fromMock.mockReturnValueOnce(queryResult({ owner_id: actorId, revision: 3 }))
      .mockReturnValueOnce(queryResult({ owner_id: actorId, workspace_id: workspaceId, status: 'mapped' }));
    accessMock.mockRejectedValueOnce(new Error('Workspace not found.'));
    const { resolvePropertyShortlistScope } = await import('@/lib/platform/access/domainScope.server');
    await expect(resolvePropertyShortlistScope(actorId, propertyId)).rejects.toThrow('Workspace not found.');
    expect(fromMock).toHaveBeenCalledTimes(2);
  });
  it('rejects mapping owner drift', async () => {
    fromMock.mockReturnValueOnce(queryResult({ owner_id: actorId, revision: 3 }))
      .mockReturnValueOnce(queryResult({ owner_id: crypto.randomUUID(), workspace_id: workspaceId, status: 'mapped' }));
    const { resolvePropertyShortlistScope } = await import('@/lib/platform/access/domainScope.server');
    await expect(resolvePropertyShortlistScope(actorId, propertyId)).rejects.toMatchObject({ code: 'UNMAPPED' });
  });
});
