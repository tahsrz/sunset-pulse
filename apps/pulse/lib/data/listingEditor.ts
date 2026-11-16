import { z } from 'zod';
import { isPublicListingPhoto, type Listing } from './listingContract';

export const listingMlsIdSchema = z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/i);

const optionalNumber = (number: z.ZodNumber) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  number.optional(),
);
const optionalText = (limit: number) => z.string().trim().max(limit).default('');
const checkbox = z.literal('on').optional().transform((value) => value === 'on');

export const listingEditorSchema = z.object({
  mls_id: listingMlsIdSchema,
  street: z.string().trim().min(1).max(180),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().regex(/^[a-z]{2}$/i).transform((value) => value.toUpperCase()),
  zip: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/),
  type: z.string().trim().min(1).max(80),
  property_subtype: optionalText(100),
  listing_status: z.string().trim().min(1).max(50),
  price_type: z.enum(['sale', 'lease', 'unknown']),
  price: z.coerce.number().positive().max(1_000_000_000_000),
  beds: optionalNumber(z.coerce.number().int().nonnegative().max(100)),
  baths: optionalNumber(z.coerce.number().nonnegative().max(100)),
  sqft: optionalNumber(z.coerce.number().int().positive().max(100_000_000)),
  lot_size_sqft: optionalNumber(z.coerce.number().int().positive().max(1_000_000_000)),
  year_built: optionalNumber(z.coerce.number().int().min(1600).max(2200)),
  levels: optionalText(40),
  attached_garage: z.enum(['', 'yes', 'no']).default(''),
  subdivision: optionalText(100),
  county: optionalText(100),
  listing_agent: optionalText(120),
  listing_office: optionalText(120),
  description: optionalText(5000),
  photo_urls: z.string().max(16000).default('').transform((value) => (
    [...new Set(value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))]
  )).refine((urls) => urls.every(isPublicListingPhoto), 'Use HTTPS image URLs or a Pulse listing photo path.'),
  display_public: checkbox,
  is_featured: checkbox,
});

const metadataFields = ['property_subtype', 'lot_size_sqft', 'year_built', 'levels', 'subdivision', 'county', 'listing_agent', 'listing_office'] as const;

export function listingEditorValues(listing: Listing) {
  const { mls_id, type, description, location, listing_status, price_type, list_price, price, beds, baths, square_feet, images, display_public, is_featured, metadata } = listing;
  return {
    mls_id, type, description, ...location, zip: location.zipcode, listing_status, price_type,
    price: list_price ?? price, beds, baths, sqft: square_feet,
    photo_urls: images.filter(isPublicListingPhoto).join('\n'),
    display_public, is_featured,
    ...Object.fromEntries(metadataFields.map((key) => {
      const value = metadata[key];
      return [key, typeof value === 'string' || typeof value === 'number' ? value : ''];
    })),
    attached_garage: typeof metadata.attached_garage === 'boolean' ? (metadata.attached_garage ? 'yes' : 'no') : '',
  };
}

export function buildEditedListing(fields: z.output<typeof listingEditorSchema>, images: string[], existing?: Listing) {
  const metadata = { ...existing?.metadata };
  for (const key of metadataFields) {
    const value = fields[key];
    if (value === undefined || value === '') delete metadata[key];
    else metadata[key] = value;
  }
  if (fields.attached_garage) metadata.attached_garage = fields.attached_garage === 'yes';
  else delete metadata.attached_garage;

  return {
    ...existing,
    mls_id: fields.mls_id,
    name: fields.street,
    type: fields.type,
    description: fields.description,
    location: { street: fields.street, city: fields.city, state: fields.state, zipcode: fields.zip },
    listing_status: fields.listing_status,
    price_type: fields.price_type,
    price: fields.price,
    list_price: fields.price,
    beds: fields.beds,
    baths: fields.baths,
    square_feet: fields.sqft,
    images,
    source: existing?.source ?? 'MLS',
    last_updated: new Date().toISOString(),
    display_public: fields.display_public,
    is_featured: fields.is_featured,
    metadata,
  };
}
