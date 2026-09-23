import { describe, expect, it } from 'vitest';
import { encodeCursor, parsePage, parseScopedPage } from '@/lib/platform/contracts/pagination';
const workspaceId = '11111111-1111-4111-8111-111111111111';
const cursor = { workspaceId, collection: 'runs' as const, createdAt: '2026-09-18T12:00:00.123456+00:00', id: workspaceId };
describe('bounded workspace keyset cursors', () => {
  it('roundtrips timestamps without dropping microseconds', () => {
    expect(parsePage(new URLSearchParams({ cursor: encodeCursor(cursor), limit: '5' }), workspaceId, 'runs')).toEqual({ limit: 5, cursor });
  });
  it.each(['0','101','-1','NaN','1.5'])('rejects invalid page limit %s', (limit) => {
    expect(() => parsePage(new URLSearchParams({ limit }), workspaceId, 'runs')).toThrow();
  });
  it('rejects a cursor reused across workspaces or collections', () => {
    const params = new URLSearchParams({ cursor: encodeCursor(cursor) });
    expect(() => parsePage(params, crypto.randomUUID(), 'runs')).toThrow();
    expect(() => parsePage(params, workspaceId, 'checkpoints')).toThrow();
  });
  it('bounds health cursors independently from checkpoint pages', () => {
    const healthCursor = { workspaceId, collection: 'connector_health' as const, createdAt: cursor.createdAt, id: workspaceId };
    expect(parsePage(new URLSearchParams({ cursor: encodeCursor(healthCursor), limit: '20' }), workspaceId, 'connector_health')).toEqual({ limit: 20, cursor: healthCursor });
  });
  it('fences health audit cursors to the workspace and collection', () => {
    const auditCursor = { workspaceId, collection: 'connector_health_audit' as const, createdAt: cursor.createdAt, id: workspaceId };
    expect(parseScopedPage(new URLSearchParams({ healthAuditCursor: encodeCursor(auditCursor), healthAuditLimit: '10' }), workspaceId, 'connector_health_audit', 'healthAuditLimit', 'healthAuditCursor')).toEqual({ limit: 10, cursor: auditCursor });
  });
  it.each(['%', 'e30', 'x'.repeat(513)])('rejects malformed cursors', (value) => {
    expect(() => parsePage(new URLSearchParams({ cursor: value }), workspaceId, 'runs')).toThrow();
  });
});
