import { z } from 'zod';

const cursorSchema = z.object({
  workspaceId: z.string().uuid(), collection: z.enum(['runs', 'checkpoints', 'connector_health', 'connector_health_history', 'connector_health_audit']),
  createdAt: z.string().datetime({ offset: true }), id: z.string().uuid(),
}).strict();
export type PlatformCursor = z.infer<typeof cursorSchema>;
export function encodeCursor(cursor: PlatformCursor) {
  return Buffer.from(JSON.stringify(cursorSchema.parse(cursor))).toString('base64url');
}
export function parsePage(input: URLSearchParams, workspaceId: string, collection: PlatformCursor['collection']) {
  return parseScopedPage(input, workspaceId, collection, 'limit', 'cursor');
}
export function parseScopedPage(input: URLSearchParams, workspaceId: string, collection: PlatformCursor['collection'], limitKey: string, cursorKey: string) {
  const limit = z.coerce.number().int().min(1).max(100).parse(input.get(limitKey) ?? 50);
  const raw = input.get(cursorKey);
  if (!raw) return { limit, cursor: null };
  z.string().max(512).regex(/^[A-Za-z0-9_-]+$/).parse(raw);
  let decoded: unknown;
  try { decoded = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')); } catch { decoded = null; }
  const cursor = cursorSchema.refine((value) => value.workspaceId === workspaceId && value.collection === collection).parse(decoded);
  return { limit, cursor };
}
