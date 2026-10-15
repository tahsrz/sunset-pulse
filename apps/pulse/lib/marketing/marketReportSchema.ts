import { z } from 'zod';

const isoDate = z.string().date();

const marketReportSourceSchema = z.object({
  publisher: z.string().trim().min(2).max(120),
  title: z.string().trim().min(3).max(180),
  sourceUrl: z.string().url().max(500).refine((value) => new URL(value).protocol === 'https:'),
  retrievedAt: isoDate,
  effectiveDate: isoDate,
  licenseStatus: z.enum(['authorized', 'public-permitted', 'restricted', 'unknown']),
  permissionEvidence: z.string().trim().min(8).max(500),
}).strict();

const marketMetricSchema = z.object({
  key: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label: z.string().trim().min(3).max(100),
  value: z.number().finite().nonnegative(),
  unit: z.enum(['usd', 'homes', 'percent', 'days', 'square-feet', 'ratio']),
  method: z.enum(['median', 'average', 'count', 'rate']),
  definition: z.string().trim().min(12).max(500),
  sampleCount: z.number().int().positive().safe(),
}).strict();

export const marketReportSchema = z.object({
  schemaVersion: z.literal(1),
  reportId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  title: z.string().trim().min(8).max(160),
  summary: z.string().trim().min(20).max(400),
  areaKey: z.literal('keller-westlake'),
  geographicScope: z.object({
    type: z.enum(['city', 'zip', 'neighborhood', 'custom']),
    label: z.string().trim().min(2).max(120),
    filters: z.array(z.string().trim().min(2).max(100)).max(12),
  }).strict(),
  period: z.object({ from: isoDate, through: isoDate }).strict(),
  status: z.enum(['draft', 'published']),
  revision: z.number().int().positive(),
  reviewedAt: isoDate.nullable(),
  expiresAt: isoDate,
  sampleCount: z.number().int().positive().safe(),
  source: marketReportSourceSchema,
  metrics: z.array(marketMetricSchema).min(1).max(24),
}).strict().superRefine((report, context) => {
  if (report.period.from > report.period.through) {
    context.addIssue({ code: 'custom', path: ['period'], message: 'Report period must start before it ends.' });
  }
  if (report.reviewedAt !== null && report.expiresAt < report.reviewedAt) {
    context.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Report cannot expire before review.' });
  }
  if (report.metrics.some((metric) => metric.sampleCount > report.sampleCount)) {
    context.addIssue({ code: 'custom', path: ['metrics'], message: 'A metric sample cannot exceed the report sample.' });
  }
  if (report.status === 'published') {
    if (!report.reviewedAt) context.addIssue({ code: 'custom', path: ['reviewedAt'], message: 'Published reports require a review date.' });
    if (!['authorized', 'public-permitted'].includes(report.source.licenseStatus)) {
      context.addIssue({ code: 'custom', path: ['source', 'licenseStatus'], message: 'Published reports require documented publication permission.' });
    }
  }
});

export const marketReportCollectionSchema = z.object({
  schemaVersion: z.literal(1),
  reports: z.array(marketReportSchema).max(100),
}).strict().superRefine((collection, context) => {
  const ids = new Set<string>();
  collection.reports.forEach((report, index) => {
    if (ids.has(report.reportId)) context.addIssue({ code: 'custom', path: ['reports', index, 'reportId'], message: 'Report IDs must be unique.' });
    ids.add(report.reportId);
  });
});

export type MarketReport = z.infer<typeof marketReportSchema>;
