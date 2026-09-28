import { z } from 'zod';

const hash = z.string().regex(/^[a-f0-9]{64}$/);

export const connectorHealthStatusSchema = z.enum(['healthy', 'unavailable', 'schema_drift', 'stale']);

const connectorHealthDetailKeys = ['source', 'reason', 'probe', 'operation', 'responseHash', 'snapshotHash'] as const;

export const connectorHealthDetailSchema = z.record(z.string().regex(/^[a-z][a-zA-Z0-9_]{0,63}$/), z.union([
  z.string().max(500), z.number().finite(), z.boolean(), z.null(),
])).superRefine((value, ctx) => {
  if (Object.keys(value).length > 12) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Connector health detail is too large.' });
  for (const key of Object.keys(value)) if (!(connectorHealthDetailKeys as readonly string[]).includes(key)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: 'Unsupported connector health detail.' });
  }
});

export const connectorHealthEventSchema = z.object({
  schemaVersion: z.literal(1),
  connectorId: z.string().uuid(),
  connectionId: z.string().regex(/^[a-z][a-z0-9_.:-]{0,127}$/),
  title: z.string().trim().min(1).max(160),
  status: connectorHealthStatusSchema,
  checkedAt: z.string().datetime({ offset: true }),
  snapshotHash: hash.nullable(),
  detail: connectorHealthDetailSchema,
}).strict();

export type ConnectorHealthEvent = z.infer<typeof connectorHealthEventSchema>;
