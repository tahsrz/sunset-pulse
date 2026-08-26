import { z } from 'zod';

const inputSchema = z.object({ spendingLimitUsd: z.number().finite().positive(), estimatedInvoiceUsd: z.number().finite().nonnegative(), paused: z.boolean().default(false) }).strict();

export function evaluateBillingControls(input: z.input<typeof inputSchema>) {
  const value = inputSchema.parse(input);
  const utilizationPercent = value.estimatedInvoiceUsd / value.spendingLimitUsd * 100;
  const alerts = [50, 80, 100].filter((threshold) => utilizationPercent >= threshold);
  return { utilizationPercent, alerts, pauseRequired: value.paused || utilizationPercent >= 100, shadowOnly: true };
}
