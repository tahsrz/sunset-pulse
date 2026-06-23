import type { Lead, Property } from '@/lib/types';

type LeadLike = Partial<Lead> & {
  id?: string;
  stage?: string;
  property?: string | Partial<Property>;
};

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() || '';
}

function firstNumber(...values: unknown[]) {
  return values.find((value): value is number => typeof value === 'number' && Number.isFinite(value));
}

export function buildCallAssistLeadHref(lead: LeadLike, options: { streamUrl?: string } = {}) {
  const params = new URLSearchParams();
  const property = typeof lead.property === 'object' && lead.property ? lead.property : null;
  const location = property?.location;
  const cityState = location ? [location.city, location.state].filter(Boolean).join(', ') : '';
  const propertyLabel = firstString(
    property?.name,
    cityState,
    typeof lead.property === 'string' ? lead.property : ''
  );
  const propertyPrice = firstNumber(
    property?.price,
    property?.list_price,
    property?.rates?.monthly
  );

  const entries: Record<string, string> = {
    leadId: firstString(lead._id, lead.id),
    caller: firstString(lead.name),
    phone: firstString(lead.phone),
    property: propertyLabel,
    price: propertyPrice ? String(propertyPrice) : '',
    budget: lead.budget ? String(lead.budget) : '',
    timeline: firstString(lead.timeframe),
    stage: firstString(lead.status, lead.stage),
    streamUrl: firstString(options.streamUrl),
  };

  Object.entries(entries).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const query = params.toString();
  return query ? `/call-assist?${query}` : '/call-assist';
}
