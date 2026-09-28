import { z } from 'zod';

const key = z.string().regex(/^[a-z][a-z0-9_.:-]{0,127}$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);

export const connectorDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  connectionId: key,
  protocol: z.enum(['mcp', 'openapi']),
  title: z.string().trim().min(1).max(160),
  endpoint: z.string().url().refine((value) => value.startsWith('https://'), 'Connector endpoints must use HTTPS.'),
  authRef: key.nullable(),
  reviewedAt: z.string().datetime({ offset: true }),
}).strict();

export const connectorSchemaSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  connectionId: key,
  tool: key,
  operation: key,
  direction: z.enum(['input', 'output']),
  schemaHash: hash,
  schema: z.object({ type: z.literal('object'), properties: z.record(key, z.record(z.string(), z.unknown())), required: z.array(key), additionalProperties: z.literal(false) }).strict(),
}).strict().superRefine((snapshot, ctx) => {
  const encoded = JSON.stringify(snapshot.schema);
  if (encoded.includes('"$ref"') || encoded.includes('"$defs"') || encoded.includes('"code"') || encoded.includes('"command"')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['schema'], message: 'Executable and dynamic schema fields are not supported.' });
  }
});

export type ConnectorDefinition = z.infer<typeof connectorDefinitionSchema>;
export type ConnectorSchemaSnapshot = z.infer<typeof connectorSchemaSnapshotSchema>;
