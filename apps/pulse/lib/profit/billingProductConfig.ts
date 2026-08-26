import { z } from 'zod';

export const billingProductConfigSchema = z.object({
  activeSiteMinimumUsd: z.number().finite().nonnegative(), includedCreditUsd: z.number().finite().nonnegative(), outcomePrices: z.object({ qualifiedHandoff: z.number().finite().nonnegative(), propertySpecificHandoff: z.number().finite().nonnegative(), buyerConsultationBooked: z.number().finite().nonnegative(), propertyTourBooked: z.number().finite().nonnegative(), sellerConsultationBooked: z.number().finite().nonnegative() }).strict(), spendingLimitUsd: z.number().finite().positive(), legalApproved: z.boolean(), shadowDecision: z.enum(['launch', 'revise_prices', 'revise_definitions', 'continue_shadow', 'stop']),
}).strict();

export function readBillingProductConfig(env: NodeJS.ProcessEnv = process.env) {
  const config = billingProductConfigSchema.parse({
    activeSiteMinimumUsd: Number(env.BILLING_ACTIVE_SITE_MINIMUM_USD || 0), includedCreditUsd: Number(env.BILLING_INCLUDED_CREDIT_USD || 0),
    outcomePrices: { qualifiedHandoff: 8, propertySpecificHandoff: 12, buyerConsultationBooked: 20, propertyTourBooked: 35, sellerConsultationBooked: 45 },
    spendingLimitUsd: Number(env.BILLING_SPENDING_LIMIT_USD || 1), legalApproved: env.LUNA_LEGAL_APPROVED === 'true', shadowDecision: env.LUNA_SHADOW_DECISION || 'continue_shadow',
  });
  return { ...config, enabled: config.legalApproved && config.shadowDecision === 'launch' };
}
