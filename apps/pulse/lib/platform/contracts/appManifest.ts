import { z } from 'zod';
import { runDefinitionSchema } from './run';

const key = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
const labels = { title: z.string().min(1).max(160).optional(), description: z.string().max(1000).optional() };
// Explicit, flat JSON Schema subset. No refs, code hooks, remote schemas,
// templates, dynamic imports, arbitrary expressions or recursive evaluation.
export const manifestFieldSchema = z.discriminatedUnion('type', [
  z.object({ ...labels, type: z.literal('string'), minLength: z.number().int().min(0).max(4000).optional(),
    maxLength: z.number().int().min(1).max(4000), enum: z.array(z.string().max(4000)).min(1).max(30).optional() }).strict(),
  z.object({ ...labels, type: z.literal('number'), minimum: z.number().finite().optional(), maximum: z.number().finite().optional() }).strict(),
  z.object({ ...labels, type: z.literal('boolean') }).strict(),
]).superRefine((field, ctx) => {
  if (field.type === 'string' && ((field.minLength ?? 0) > field.maxLength || field.enum?.some((v) => v.length < (field.minLength ?? 0) || v.length > field.maxLength))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid string bounds or choices.' });
  }
  if (field.type === 'number' && field.minimum !== undefined && field.maximum !== undefined && field.minimum > field.maximum) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid number bounds.' });
  }
});
export const manifestObjectSchema = z.object({
  type: z.literal('object'), properties: z.record(key, manifestFieldSchema),
  required: z.array(key).max(64), additionalProperties: z.literal(false),
}).strict().superRefine((schema, ctx) => {
  if (Object.keys(schema.properties).length > 64 || new Set(schema.required).size !== schema.required.length ||
    schema.required.some((name) => !Object.hasOwn(schema.properties, name)) || Object.hasOwn(schema.properties, '__proto__') || Object.hasOwn(schema.properties, 'constructor')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid object fields.' });
  }
});
export const appManifestSchema = z.object({
  schemaVersion: z.literal(1), key, version: z.number().int().min(1).max(999999999), title: z.string().trim().min(1).max(160),
  inputSchema: manifestObjectSchema, workflows: z.array(runDefinitionSchema).min(1).max(16),
  // Capability execution is intentionally unsupported in this slice. Reject,
  // rather than retain a manifest implying tools that the runtime cannot run.
  capabilities: z.array(z.never()).max(0), artifactSchemas: z.record(key, manifestObjectSchema), settingsSchema: manifestObjectSchema,
}).strict().superRefine((manifest, ctx) => {
  if (new Set(manifest.workflows.map((workflow) => workflow.key)).size !== manifest.workflows.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Workflow keys must be unique.' });
  }
  if (Object.keys(manifest.artifactSchemas).length > 16 || JSON.stringify(manifest).length > 131072) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Manifest is too large.' });
  }
});
export type AppManifest = z.infer<typeof appManifestSchema>;
export function parseManifestValues(schema: z.infer<typeof manifestObjectSchema>, input: unknown) {
  const fields: Record<string, z.ZodTypeAny> = Object.create(null);
  for (const [name, field] of Object.entries(schema.properties)) {
    let value: z.ZodTypeAny;
    if (field.type === 'string') {
      value = z.string().min(field.minLength ?? 0).max(field.maxLength)
        .refine((v) => !field.enum || field.enum.includes(v), 'Unsupported choice.');
    } else if (field.type === 'number') {
      value = z.number().finite().refine((v) => (field.minimum === undefined || v >= field.minimum) && (field.maximum === undefined || v <= field.maximum), 'Out of bounds.');
    } else value = z.boolean();
    fields[name] = schema.required.includes(name) ? value : value.optional();
  }
  return z.object(fields).strict().parse(input);
}
export const appInstallInputSchema = z.object({
  manifest: appManifestSchema, settings: z.record(z.unknown()),
  status: z.enum(['installed', 'disabled']), expectedRevision: z.number().int().positive().nullable(),
}).strict().superRefine((value, ctx) => {
  try { parseManifestValues(value.manifest.settingsSchema, value.settings); }
  catch { ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['settings'], message: 'Settings do not match the manifest.' }); }
});
