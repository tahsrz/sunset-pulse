import { z } from 'zod';

const publicDocumentUrl = z.string().trim().max(2000).url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}, 'Use an HTTPS document URL without credentials.');

/** Deliberate public fields; never project arbitrary listing metadata. */
export const landDetailsSchema = z.object({
  marketed_acres: z.number().positive().max(1_000_000).optional(),
  surveyed_acres: z.number().positive().max(1_000_000).optional(),
  zoning: z.string().trim().min(1).max(500).optional(),
  development_status: z.string().trim().min(1).max(1500).optional(),
  constraints: z.string().trim().min(1).max(1500).optional(),
  documents: z.array(z.object({
    label: z.string().trim().min(1).max(160),
    url: publicDocumentUrl,
  }).strict()).max(8).default([]),
}).strict();

export type LandDetails = z.infer<typeof landDetailsSchema>;

export const landDocumentLinesSchema = z.string().max(18_000).default('').transform((value, context) => {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parsed = landDetailsSchema.shape.documents.safeParse(lines.map((line) => {
    const separator = line.indexOf('|');
    return { label: separator < 0 ? '' : line.slice(0, separator).trim(), url: line.slice(separator + 1).trim() };
  }));
  if (!parsed.success) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Use up to 8 source documents, each as Label | https://example.com/document.pdf.' });
    return z.NEVER;
  }
  return parsed.data;
});
