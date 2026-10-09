import { z } from 'zod';

const count = z.number().int().nonnegative().safe();
export const sellerReviewSummarySchema = z.object({
  status: z.literal('available'),
  counts: z.object({
    newRequests: count, customerReplies: count, confirmedConsultations: count, recordedClosings: count,
  }),
  firstContactTiming: z.object({ medianSeconds: count.nullable(), sampleSize: count }).optional(),
  campaigns: z.array(z.object({ campaignKey: z.string(), requests: count, replyingLeads: count,
    confirmedConsultations: count, recordedClosings: count })).optional(),
});
export type SellerReviewSummary = z.infer<typeof sellerReviewSummarySchema>;
