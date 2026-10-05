import { z } from 'zod';

const usd = z.number().int().safe().nonnegative();
const signedUsd = z.number().int().safe();
const isoDateTime = z.string().datetime({ offset: true });

const propertyFactsSchema = z.object({
  bedrooms: z.number().int().min(0).max(30).nullable(),
  bathrooms: z.number().min(0).max(40).nullable(),
  livingAreaSqFt: z.number().int().positive().safe().nullable(),
  lotAreaSqFt: z.number().int().positive().safe().nullable(),
  yearBuilt: z.number().int().min(1600).max(2200).nullable(),
}).strict();

const sourceEvidenceSchema = z.object({
  sourceType: z.enum(['mls', 'public-record', 'seller-provided', 'other']),
  recordReference: z.string().trim().min(3).max(120),
  retrievedAt: isoDateTime,
  usagePermission: z.enum(['internal-review-authorized', 'restricted', 'unknown']),
  permissionEvidenceRef: z.string().trim().min(8).max(160),
}).strict();

const adjustmentSchema = z.object({
  category: z.enum(['living-area', 'lot-size', 'bedroom', 'bathroom', 'condition', 'age', 'location', 'other']),
  amountUsd: signedUsd,
  rationale: z.string().trim().min(12).max(400),
}).strict();

const comparableSchema = z.object({
  comparableId: z.string().uuid(),
  soldAt: z.string().date(),
  salePriceUsd: usd.refine((value) => value > 0),
  facts: propertyFactsSchema,
  source: sourceEvidenceSchema,
  adjustments: z.array(adjustmentSchema).max(16),
  adjustedPriceUsd: usd.refine((value) => value > 0),
}).strict().superRefine((comparable, context) => {
  const adjusted = comparable.salePriceUsd + comparable.adjustments.reduce((total, item) => total + item.amountUsd, 0);
  if (!Number.isSafeInteger(adjusted) || adjusted <= 0 || adjusted !== comparable.adjustedPriceUsd) {
    context.addIssue({
      code: 'custom',
      path: ['adjustedPriceUsd'],
      message: 'Adjusted price must equal sale price plus the documented dollar adjustments.',
    });
  }
});

const subjectSchema = z.object({
  regionLabel: z.string().trim().min(2).max(120),
  facts: propertyFactsSchema,
}).strict();

const suggestedRangeSchema = z.object({ low: usd, target: usd, high: usd }).strict();

export const privateCmaReviewInputSchema = z.object({
  status: z.enum(['draft', 'reviewed']),
  subject: subjectSchema,
  comparables: z.array(comparableSchema).min(1).max(12),
  suggestedRangeUsd: suggestedRangeSchema,
  methodologyNote: z.string().trim().min(20).max(800).nullable(),
}).strict();

/**
 * Private, human-authored evidence contract only. This schema does not fetch,
 * select, score, calculate market value, or publish comparable data.
 */
export const privateCmaReviewSchema = z.object({
  schemaVersion: z.literal(1),
  reviewId: z.string().uuid(),
  revision: z.number().int().positive().safe(),
  supersedesReviewId: z.string().uuid().nullable(),
  leadId: z.string().uuid(),
  status: z.enum(['draft', 'reviewed']),
  useRestriction: z.literal('private-review-only'),
  preparedAt: isoDateTime,
  expiresAt: isoDateTime,
  subject: subjectSchema,
  comparables: z.array(comparableSchema).min(1).max(12),
  suggestedRangeUsd: suggestedRangeSchema,
  review: z.object({
    reviewerUserId: z.string().uuid().nullable(),
    reviewedAt: isoDateTime.nullable(),
    sellerPermissionEvidenceRef: z.string().trim().min(8).max(160).nullable(),
    methodologyNote: z.string().trim().min(20).max(800).nullable(),
  }).strict(),
}).strict().superRefine((review, context) => {
  if ((review.revision === 1) !== (review.supersedesReviewId === null)) {
    context.addIssue({ code: 'custom', path: ['supersedesReviewId'], message: 'Revision one starts a chain; later revisions must name the immutable prior review.' });
  }
  if (review.supersedesReviewId === review.reviewId) {
    context.addIssue({ code: 'custom', path: ['supersedesReviewId'], message: 'A review cannot supersede itself.' });
  }
  if (!(review.suggestedRangeUsd.low > 0
    && review.suggestedRangeUsd.low <= review.suggestedRangeUsd.target
    && review.suggestedRangeUsd.target <= review.suggestedRangeUsd.high)) {
    context.addIssue({
      code: 'custom',
      path: ['suggestedRangeUsd'],
      message: 'Pricing range must be positive and ordered low, target, high.',
    });
  }
  if (Date.parse(review.expiresAt) <= Date.parse(review.preparedAt)) {
    context.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Review expiry must follow preparation.' });
  }
  if (review.review.reviewedAt) {
    const reviewedAt = Date.parse(review.review.reviewedAt);
    if (reviewedAt < Date.parse(review.preparedAt) || reviewedAt >= Date.parse(review.expiresAt)) {
      context.addIssue({ code: 'custom', path: ['review', 'reviewedAt'], message: 'Review time must fall between preparation and expiry.' });
    }
  }
  const comparableIds = new Set<string>();
  review.comparables.forEach((comparable, index) => {
    if (comparableIds.has(comparable.comparableId)) {
      context.addIssue({ code: 'custom', path: ['comparables', index, 'comparableId'], message: 'Comparable IDs must be unique within a revision.' });
    }
    comparableIds.add(comparable.comparableId);
    if (comparable.soldAt > comparable.source.retrievedAt.slice(0, 10)) {
      context.addIssue({ code: 'custom', path: ['comparables', index, 'soldAt'], message: 'A comparable cannot sell after its source was retrieved.' });
    }
  });
  if (review.status === 'reviewed') {
    if (!review.review.reviewerUserId || !review.review.reviewedAt) {
      context.addIssue({ code: 'custom', path: ['review'], message: 'Reviewed records require an authenticated reviewer and review time.' });
    }
    if (!review.review.sellerPermissionEvidenceRef) {
      context.addIssue({ code: 'custom', path: ['review', 'sellerPermissionEvidenceRef'], message: 'Reviewed records require seller-permission evidence.' });
    }
    if (!review.review.methodologyNote) {
      context.addIssue({ code: 'custom', path: ['review', 'methodologyNote'], message: 'Reviewed records require a human methodology note.' });
    }
    review.comparables.forEach((comparable, index) => {
      if (comparable.source.usagePermission !== 'internal-review-authorized') {
        context.addIssue({
          code: 'custom',
          path: ['comparables', index, 'source', 'usagePermission'],
          message: 'Reviewed records require documented permission for private review use.',
        });
      }
    });
  }
});

export type PrivateCmaReview = z.infer<typeof privateCmaReviewSchema>;
