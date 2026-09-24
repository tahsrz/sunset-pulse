import { z } from 'zod';

const workspaceId = z.string().uuid();
const coordinate = z.number().finite().min(-100_000).max(100_000);
const windowTarget = z.object({ workspaceId }).strict();

export const canvasWindowSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string().uuid(), kind: z.literal('checkpoint_inbox'),
    target: windowTarget,
  }).strict(),
  z.object({
    id: z.string().uuid(), kind: z.literal('run_graph'),
    target: windowTarget.extend({ runId: z.string().uuid() }).strict(),
  }).strict(),
  z.object({
    id: z.string().uuid(), kind: z.literal('artifact_viewer'),
    target: windowTarget.extend({ artifactId: z.string().uuid(), version: z.number().int().positive().max(2_147_483_647) }).strict(),
  }).strict(),
  z.object({
    id: z.string().uuid(), kind: z.literal('system_monitor'),
    target: windowTarget.extend({ panel: z.enum(['scheduler', 'connectors', 'quotas']) }).strict(),
  }).strict(),
]);

const positionedWindowSchema = z.object({
  window: canvasWindowSchema,
  x: coordinate,
  y: coordinate,
  width: z.number().finite().min(240).max(4096),
  height: z.number().finite().min(160).max(4096),
  zIndex: z.number().int().min(0).max(1000),
}).strict();

export const canvasLayoutSchema = z.object({
  schemaVersion: z.literal(1),
  workspaceId,
  viewport: z.object({ x: coordinate, y: coordinate, zoom: z.number().finite().min(0.25).max(2) }).strict(),
  windows: z.array(positionedWindowSchema).max(32),
}).strict().superRefine((layout, ctx) => {
  const ids = layout.windows.map(({ window }) => window.id);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['windows'], message: 'Window IDs must be unique.' });
  }
  layout.windows.forEach(({ window }, index) => {
    if (window.target.workspaceId !== layout.workspaceId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['windows', index, 'window', 'target', 'workspaceId'], message: 'Window target must belong to this workspace.' });
    }
  });
  if (JSON.stringify(layout).length > 65_536) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Canvas layout exceeds the size limit.' });
  }
});

export type CanvasLayout = z.infer<typeof canvasLayoutSchema>;

export const saveCanvasLayoutInputSchema = z.object({
  expectedRevision: z.number().int().positive().nullable(),
  layout: canvasLayoutSchema,
}).strict();
