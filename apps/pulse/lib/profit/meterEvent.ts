import { z } from 'zod';
import { readBillingProductConfig } from '@/lib/profit/billingProductConfig';

export const meterEventSchema = z.object({
  outcomeId: z.string().uuid(), tenantSite: z.string().min(1), customerId: z.string().min(1), outcomeType: z.string().min(1), amountUsd: z.number().finite().nonnegative(), occurredAt: z.string().datetime(), idempotencyKey: z.string().min(16),
}).strict();

export function buildMeterEvent(input: z.input<typeof meterEventSchema>, env: NodeJS.ProcessEnv = process.env) {
  const event = meterEventSchema.parse(input);
  if (!readBillingProductConfig(env).enabled) throw new Error('Meter submission is disabled until legal and pricing gates pass.');
  return { eventName: 'sunset_pulse_billable_outcome', payload: { ...event, currency: 'USD' as const }, submitted: false };
}
