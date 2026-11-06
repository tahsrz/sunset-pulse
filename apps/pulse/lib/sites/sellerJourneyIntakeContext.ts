import 'server-only';

import { sellerJourneySubmissionSchema, type sellerJourneyOwnerSummarySchema } from '@/lib/marketing/guidedJourneySchema';
import type { z } from 'zod';

export type OwnerJourneyIntake = z.infer<typeof sellerJourneyOwnerSummarySchema>;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

/** Only call with a row returned by the owner-scoped seller lead reader. */
export function readSellerJourneyIntake(lead: { source?: unknown; metadata?: unknown }): OwnerJourneyIntake | null {
  if (lead.source !== 'seller_plan') return null;
  const plan = asRecord(asRecord(lead.metadata)?.sellerPlan);
  if (plan?.offerVersion !== '3' || plan.offerKey !== 'keller-westlake-seller-plan') return null;
  const result = sellerJourneySubmissionSchema.safeParse(plan.journey);
  if (!result.success) return null;

  const { address, homeFacts, sellingWindow, sellingPreference } = result.data;
  return { address, homeFacts, sellingWindow, sellingPreference };
}

/** Preserve existing metadata readers while withholding private intake outside the case. */
export function withoutSellerJourney<T>(metadata: T): T {
  const root = asRecord(metadata);
  const plan = asRecord(root?.sellerPlan);
  if (!plan || !Object.prototype.hasOwnProperty.call(plan, 'journey')) return metadata;
  const sellerPlan = { ...plan };
  delete sellerPlan.journey;
  return { ...root, sellerPlan } as T;
}
