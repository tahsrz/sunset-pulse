import { z } from 'zod';
import { buildInternalCostEntry, persistInternalCost, type InternalCostEntry } from '@/lib/profit/internalCostLedger';

const providerEventSchema = z.object({
  tenantSite: z.string().trim().min(1), funnelId: z.string().uuid().nullable().default(null), leadId: z.string().uuid().nullable().default(null),
  provider: z.string().trim().min(1), providerEventId: z.string().trim().min(1), costType: z.enum(['model', 'search_tool', 'email_sms', 'signing', 'crawling', 'infrastructure']),
  amountUsd: z.number().finite().nonnegative().nullable().default(null), occurredAt: z.string().datetime(), evidence: z.record(z.unknown()).default({}),
}).strict();

export type ProviderCostEvent = z.input<typeof providerEventSchema>;

export function providerCostToLedgerEntry(input: ProviderCostEvent): InternalCostEntry {
  const event = providerEventSchema.parse(input);
  return buildInternalCostEntry({
    tenantSite: event.tenantSite, funnelId: event.funnelId, leadId: event.leadId,
    costType: event.costType, amountUsd: event.amountUsd, occurredAt: event.occurredAt,
    source: `${event.provider}:${event.providerEventId}`,
    evidence: { ...event.evidence, provider: event.provider, providerEventId: event.providerEventId },
    idempotencyKey: `provider-cost:${event.provider}:${event.providerEventId}`,
  });
}

export async function persistProviderCost(input: ProviderCostEvent) {
  return persistInternalCost(providerCostToLedgerEntry(input));
}

export function buildCrawlerCostEvent(input: Omit<ProviderCostEvent, 'costType'>): ProviderCostEvent {
  return { ...input, costType: 'crawling' };
}

export function buildInfrastructureCostEvent(input: Omit<ProviderCostEvent, 'costType'>): ProviderCostEvent {
  return { ...input, costType: 'infrastructure' };
}

export function summarizeOutcomeMargin(input: { revenueUsd: number; costsUsd: Array<number | null> }) {
  const knownCosts = input.costsUsd.filter((value): value is number => value !== null);
  const costsKnown = knownCosts.length === input.costsUsd.length;
  const totalCostUsd = costsKnown ? knownCosts.reduce((sum, value) => sum + value, 0) : null;
  return {
    revenueUsd: input.revenueUsd,
    totalCostUsd,
    grossMarginUsd: totalCostUsd === null ? null : input.revenueUsd - totalCostUsd,
    grossMarginPercent: totalCostUsd === null || input.revenueUsd <= 0 ? null : ((input.revenueUsd - totalCostUsd) / input.revenueUsd) * 100,
    costsKnown,
  };
}
