import { z } from 'zod';
import { realtorDateSchema } from './contracts';
import { sellerReviewSummarySchema } from './sellerReviewContract';
import { isValidTimeZone } from '@/lib/autonomous-workflows/schedulerPolicy';

const period = {
  timeZone: z.string().min(1).max(80).refine(isValidTimeZone),
  weekStartDate: realtorDateSchema, weekEndDate: realtorDateSchema,
};
const validPeriod = (value: { weekStartDate: string; weekEndDate: string }) => value.weekStartDate <= value.weekEndDate;
export const sellerDailyAvailableSchema = sellerReviewSummarySchema.extend({
  ...period,
  generatedAt: z.string().datetime({ offset: true }).optional(), provenance: z.string().optional(),
  firstContactTiming: sellerReviewSummarySchema.shape.firstContactTiming.unwrap().extend({ provenance: z.string().optional() }),
  campaigns: sellerReviewSummarySchema.shape.campaigns.unwrap(),
  unscheduledRequests: z.array(z.object({ id: z.string().uuid(), name: z.string(), created_at: z.string().datetime({ offset: true }),
    revision: z.number().int().positive().safe(), timing: z.string().nullable() })).max(5),
  overdueActions: z.array(z.object({ occurrence_id: z.string().uuid(), item_id: z.string().uuid().optional(),
    effective_time: z.string().nullable().optional(), lead_id: z.string().uuid(), name: z.string(),
    effective_date: realtorDateSchema, title_snapshot: z.string() })).max(5),
  consultations: z.array(z.object({ event_id: z.string().uuid(), lead_id: z.string().uuid(), name: z.string(),
    occurred_at: z.string().datetime({ offset: true }) })).max(5),
  unscheduledHasMore: z.boolean(), overdueHasMore: z.boolean(), consultationsHasMore: z.boolean(),
}).refine(validPeriod, 'The seller summary period is invalid.');
const notConfigured = z.object({ status: z.literal('not_configured'), ...period,
  generatedAt: z.string().datetime({ offset: true }).optional() }).refine(validPeriod);
export const sellerDailyValueSchema = z.union([sellerDailyAvailableSchema, notConfigured]);
export const sellerDailyResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('available'), value: sellerDailyAvailableSchema }),
  z.object({ status: z.literal('not_configured'), value: notConfigured }),
  z.object({ status: z.literal('unavailable') }),
]);
export type SellerDailyData = z.infer<typeof sellerDailyAvailableSchema>;
