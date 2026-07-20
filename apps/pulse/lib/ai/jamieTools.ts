import { tool } from 'ai';
import { z } from 'zod';
import { normalizePropertyPricing } from '@/lib/core/propertyRecon';
import { discoverListings } from '@/lib/data/listingDiscovery';

const positiveInteger = z.union([
  z.number().int().positive(),
  z.string().trim().regex(/^\d+$/),
]).transform((value) => Number(value));

export const jamiePropertySearchInputSchema = z.object({
  city: z.string().optional().describe("City to search in, such as Frisco or Plano."),
  zipcode: z.string().optional().describe("5-digit ZIP code."),
  neighborhood: z.string().optional().describe("Specific neighborhood name."),
  property_types: z.array(z.string()).optional().describe("Property types to include."),
  property_sub_types: z.array(z.string()).optional().describe("Property sub-types to include."),
  price_min: positiveInteger.optional().describe("Minimum price in USD."),
  price_max: positiveInteger.optional().describe("Maximum price in USD."),
  beds_min: positiveInteger.optional().describe("Minimum bedrooms."),
  beds_max: positiveInteger.optional().describe("Maximum bedrooms."),
  full_baths_min: positiveInteger.optional().describe("Minimum bathrooms."),
  sqft_min: positiveInteger.optional().describe("Minimum square footage."),
  pool: z.enum(['Yes', 'No', '']).optional().describe("Pool preference."),
  construction_status: z.array(z.string()).optional().describe("Construction statuses."),
});

export type JamiePropertySearchInput = z.infer<typeof jamiePropertySearchInputSchema>;

export type JamiePropertySearchResult = {
  total: number;
  criteria: Record<string, string>;
  properties: Array<{
    id: string;
    name: string;
    city?: string;
    state?: string;
    price?: number | null;
    beds?: number | null;
    baths?: number | null;
    source?: string;
    image?: string | null;
    href: string;
  }>;
};

function firstString(value: unknown) {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}

function compactCriteria(criteria: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(criteria).filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
}

function toPropertySearchParams(input: JamiePropertySearchInput) {
  const location = input.city || input.zipcode || input.neighborhood;
  const propertyType = firstString(input.property_types) || 'All';

  return compactCriteria({
    location,
    propertyType,
    minPrice: input.price_min ? String(input.price_min) : undefined,
    maxPrice: input.price_max ? String(input.price_max) : undefined,
    beds: input.beds_min ? String(input.beds_min) : undefined,
    baths: input.full_baths_min ? String(input.full_baths_min) : undefined,
    includeMLS: 'true',
  });
}

function summarizeProperty(property: any): JamiePropertySearchResult['properties'][number] {
  const normalized = normalizePropertyPricing(property);
  const id = String(normalized._id || normalized.id || normalized.mls_id || normalized.slug || normalized.name);
  const location = normalized.location || {};
  const price = normalized.price ?? normalized.list_price ?? normalized.rates?.monthly ?? null;

  return {
    id,
    name: normalized.name || normalized.address || normalized.fullAddress || 'Untitled property',
    city: location.city || normalized.city,
    state: location.state || normalized.state,
    price: typeof price === 'number' ? price : price ? Number(price) : null,
    beds: normalized.beds ?? normalized.bedrooms ?? null,
    baths: normalized.baths ?? normalized.bathrooms ?? null,
    source: normalized.source || 'Internal',
    image: Array.isArray(normalized.images) ? normalized.images[0] || null : normalized.image || null,
    href: `/properties/${encodeURIComponent(id)}`,
  };
}

export async function searchPropertiesForJamie(input: JamiePropertySearchInput): Promise<JamiePropertySearchResult> {
  const parsed = jamiePropertySearchInputSchema.parse(input);
  const params = toPropertySearchParams(parsed);
  const discovery = await discoverListings({
    location: params.location,
    propertyTypes: parsed.property_types,
    priceMin: parsed.price_min,
    priceMax: parsed.price_max,
    bedsMin: parsed.beds_min,
    bedsMax: parsed.beds_max,
    bathsMin: parsed.full_baths_min,
    sqftMin: parsed.sqft_min,
    pageSize: 6,
  });

  const properties = discovery.listings
    .map(summarizeProperty)
    .filter((property, index, all) => all.findIndex((candidate) => candidate.id === property.id) === index)
    .slice(0, 6);

  return {
    total: discovery.pagination.total,
    criteria: params,
    properties,
  };
}

export const jamieAiSdkTools = {
  search_properties: tool({
    description: 'Search Sunset Pulse for properties matching natural-language criteria.',
    inputSchema: jamiePropertySearchInputSchema,
    execute: searchPropertiesForJamie,
  }),
};

export async function executeJamieToolCall(toolCall: any) {
  if (toolCall?.function?.name !== 'search_properties') return null;

  const rawArguments = toolCall.function.arguments;
  const parsedArguments = typeof rawArguments === 'string' ? JSON.parse(rawArguments || '{}') : rawArguments || {};
  const output = await searchPropertiesForJamie(parsedArguments);

  return {
    id: toolCall.id,
    name: 'search_properties',
    input: parsedArguments,
    output,
  };
}

export async function executeJamieToolCalls(toolCalls: any[] = []) {
  const results = await Promise.all(toolCalls.map((toolCall) => executeJamieToolCall(toolCall)));
  return results.filter(Boolean);
}

export function formatPropertySearchResult(result: JamiePropertySearchResult) {
  if (!result.properties.length) {
    return "I searched the live property grid, but I did not find matching active listings yet.";
  }

  const lines = result.properties.map((property, index) => {
    const location = [property.city, property.state].filter(Boolean).join(', ');
    const price = property.price ? `$${property.price.toLocaleString()}` : 'price not listed';
    const details = [
      location,
      price,
      property.beds ? `${property.beds} bed` : null,
      property.baths ? `${property.baths} bath` : null,
      property.source,
    ].filter(Boolean).join(' | ');

    return `${index + 1}. ${property.name}${details ? ` - ${details}` : ''}`;
  });

  return `I found ${result.properties.length} matching propert${result.properties.length === 1 ? 'y' : 'ies'}:\n\n${lines.join('\n')}`;
}
