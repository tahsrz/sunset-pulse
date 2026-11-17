import { z } from 'zod';

const publicLocationSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zipcode: z.string(),
}).strict();

const publicGeoSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
}).strict();

const factText = z.string().trim().min(1).max(120).optional();

export const publicListingFactsSchema = z.object({
  property_subtype: factText,
  subdivision: factText,
  builder: factText,
  levels: factText,
  lot_dimensions: factText,
  year_built: z.number().int().min(1600).max(2200).optional(),
  lot_size_sqft: z.number().int().positive().max(1_000_000_000).optional(),
  lot_size_acres: z.number().positive().max(1_000_000).optional(),
}).strict();

export type PublicListingFacts = z.infer<typeof publicListingFactsSchema>;

/** Compatibility-shaped public record with no private owner or metadata fields. */
export const publicListingSchema = z.object({
  id: z.string(),
  _id: z.string(),
  mls_id: z.string().optional(),
  name: z.string(),
  type: z.string(),
  description: z.string(),
  location: publicLocationSchema,
  location_geo: publicGeoSchema.optional(),
  beds: z.number().nullable().optional(),
  baths: z.number().nullable().optional(),
  square_feet: z.number().nullable().optional(),
  amenities: z.array(z.string()),
  price: z.number().nullable().optional(),
  list_price: z.number().nullable().optional(),
  price_type: z.enum(['sale', 'lease', 'unknown']),
  rates: z.object({
    nightly: z.number().nullable().optional(),
    weekly: z.number().nullable().optional(),
    monthly: z.number().nullable().optional(),
  }).strict(),
  images: z.array(z.string()),
  image_url: z.string().nullable().optional(),
  source: z.enum(['Internal', 'MLS']),
  listing_status: z.string(),
  last_updated: z.string().optional(),
  is_demo: z.literal(false),
  is_featured: z.boolean(),
  display_public: z.literal(true),
  facts: publicListingFactsSchema.optional(),
}).strict();

export type PublicListing = z.infer<typeof publicListingSchema>;
