export type MlsProviderName = 'repliers' | 'bridge' | 'hotsheet' | 'unknown';

export type NormalizedMlsListing = {
  _id?: string;
  owner?: string;
  name: string;
  type: string;
  description?: string;
  location: {
    street?: string;
    city: string;
    state: string;
    zipcode?: string;
  };
  location_geo?: {
    type: 'Point';
    coordinates: number[];
  };
  beds?: number;
  baths?: number;
  square_feet?: number;
  amenities?: string[];
  price?: number;
  list_price?: number;
  price_type?: 'sale' | 'lease' | 'unknown';
  rates?: {
    nightly?: number;
    weekly?: number;
    monthly?: number;
  };
  images?: string[];
  source: 'Internal' | 'MLS';
  mls_id: string;
  listing_status: string;
  last_updated?: string;
  is_demo?: boolean;
  is_featured?: boolean;
  metadata?: Record<string, any>;
  neighborhood_recon?: Record<string, any> | null;
};

export type MlsListingStreamParams = Record<string, any>;

export type MlsProviderAdapter = {
  provider: MlsProviderName;
  getListingStream(params?: MlsListingStreamParams): AsyncIterable<NormalizedMlsListing>;
  getListings(params?: MlsListingStreamParams): Promise<NormalizedMlsListing[]>;
  getListingById(id: string): Promise<NormalizedMlsListing | null>;
};
