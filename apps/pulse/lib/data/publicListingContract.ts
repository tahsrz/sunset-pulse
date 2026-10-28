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
}).strict();

export type PublicListing = z.infer<typeof publicListingSchema>;
