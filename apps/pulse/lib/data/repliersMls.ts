/**
 * Repliers.io IDX Service
 * High-fidelity property data acquisition via Repliers.io API.
 */

import { gatekeeper } from '@/lib/core/gatekeeper';
import { sanitizeMlsForPublicUse } from '@/lib/data/mlsCompliance';
import type { MlsProviderName } from './mlsTypes';

const FALLBACK_PROPERTY_IMAGES = [
  '/images/properties/land1.jpg',
  '/images/properties/barndo1.jpg',
  '/images/properties/rhome1.jpg',
  '/images/properties/ranch1.jpg',
  '/images/properties/244ridge1.jpg',
];

export interface RepliersProperty {
  mlsNumber: string;
  status: string;
  listPrice: string;
  listDate: string;
  address: {
    streetNumber: string;
    streetName: string;
    streetSuffix: string;
    city: string;
    state?: string;
    zip?: string;
    neighborhood?: string;
  };
  details: {
    numBedrooms: string;
    numBathrooms: string;
    sqft?: string;
    propertyType?: string;
    description?: string;
  };
  images: string[];
  map?: {
    latitude: string;
    longitude: string;
  };
  updatedOn: string;
}

class RepliersMLSService {
  public readonly provider: MlsProviderName = 'repliers';
  private static instance: RepliersMLSService;
  private apiKey: string | undefined;
  private baseUrl: string = 'https://api.repliers.io/listings';

  private constructor() {
    this.apiKey = process.env.REPLIERS_API_KEY;
  }

  public static getInstance(): RepliersMLSService {
    if (!RepliersMLSService.instance) {
      RepliersMLSService.instance = new RepliersMLSService();
    }
    return RepliersMLSService.instance;
  }

  private async fetchRepliers(endpoint: string = '', params: any = {}) {
    const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    
    if (isMock) {
      console.warn('[REPLIERS_MOCK] Mock mode active. Loading local sample data.');
      try {
        const mockData = require('../mocks/repliers/listings.json');
        return mockData;
      } catch (e) {
        console.error('Failed to load Repliers mock data:', e);
        return null;
      }
    }

    if (!this.apiKey) {
      console.warn('[REPLIERS] API key missing. Returning no live MLS listings.');
      return null;
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.keys(params).forEach(key => {
        if (params[key]) url.searchParams.append(key, params[key]);
    });

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'REPLIERS-API-KEY': this.apiKey,
          'accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!res.ok) throw new Error(`Repliers API Error: ${res.statusText}`);
      return await res.json();
    } catch (e) {
      console.error('Repliers Fetch Failure:', e);
      return null;
    }
  }

  /**
   * The Pulse: Asynchronous Ingestion Stream
   */
  public async *getListingStream(params: any = {}) {
    let page = 1;
    const pageSize = 50;
    let hasMore = true;

    console.log('📡 [REPLIERS_PULSE] Initiating Asynchronous Ingestion Stream...');

    while (hasMore) {
      const repliersParams: any = {
        'page': page,
        'pageSize': pageSize,
        ...params
      };

      if (repliersParams.status === 'Active') {
        repliersParams.status = 'A';
      } else if (repliersParams.status === 'Unavailable' || repliersParams.status === 'Pending') {
        repliersParams.status = 'U';
      }

      const data = await this.fetchRepliers('', repliersParams);
      const listings = data?.listings;
      
      if (!listings || !Array.isArray(listings) || listings.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of listings) {
        if (gatekeeper.shouldProcessListing(item.mlsNumber, item.updatedOn)) {
          yield this.mapRepliersToProperty(item);
        }
      }

      page++;
      if (page > 10) hasMore = false; // Safety break
    }
    
    console.log('🏁 [REPLIERS_PULSE] Ingestion Stream completed.');
  }

  private mapRepliersToProperty(item: RepliersProperty) {
    const propertyType = item.details.propertyType?.toLowerCase() || '';
    const isRental = propertyType.includes('lease') || propertyType.includes('rental');
    const listPrice = parseFloat(item.listPrice) || 0;

    return sanitizeMlsForPublicUse({
      _id: item.mlsNumber,
      name: `${item.address.streetNumber} ${item.address.streetName} ${item.address.streetSuffix}`,
      type: item.details.propertyType || 'Residential',
      description: item.details.description || 'MLS Listed Property',
      location: {
        street: `${item.address.streetNumber} ${item.address.streetName} ${item.address.streetSuffix}`,
        city: item.address.city,
        state: item.address.state || 'TX',
        zipcode: item.address.zip || ''
      },
      location_geo: {
        type: 'Point',
        coordinates: [
          parseFloat(item.map?.longitude || '0'), 
          parseFloat(item.map?.latitude || '0')
        ]
      },
      beds: parseInt(item.details.numBedrooms) || 0,
      baths: parseInt(item.details.numBathrooms) || 0,
      square_feet: parseInt(item.details.sqft || '0') || 0,
      amenities: [],
      list_price: listPrice,
      price_type: isRental ? 'lease' : 'sale',
      price: !isRental ? listPrice : 0,
      rates: {
        monthly: isRental ? listPrice : 0
      },
      images: normalizeRepliersImages(item.images, item.mlsNumber),
      source: 'MLS',
      mls_id: item.mlsNumber,
      listing_status: item.status === 'A' ? 'Active' : ((item as any).standardStatus === 'Closed' ? 'Closed' : item.status),
      last_updated: item.updatedOn,
      metadata: {
        provider: 'repliers',
        resource: (item as any).resource,
        standardStatus: (item as any).standardStatus,
        listDate: item.listDate,
        modificationTimestamp: item.updatedOn,
        photoCount: (item as any).photoCount,
      }
    });
  }

  public async getListings(params: any = {}) {
    const repliersParams: any = {
      'pageSize': 20,
      ...params
    };

    if (repliersParams.status === 'Active') {
      repliersParams.status = 'A';
    } else if (repliersParams.status === 'Unavailable' || repliersParams.status === 'Pending') {
      repliersParams.status = 'U';
    }

    const data = await this.fetchRepliers('', repliersParams);
    const listings = data?.listings;
    if (!listings || !Array.isArray(listings)) return [];

    return listings
      .filter((item: any) => gatekeeper.shouldProcessListing(item.mlsNumber, item.updatedOn))
      .map((item: any) => this.mapRepliersToProperty(item));
  }

  public async getListingById(id: string) {
    const data = await this.fetchRepliers(`/${id}`);
    if (data && !Array.isArray(data)) {
      return this.mapRepliersToProperty(data);
    }
    return null;
  }
}

export const repliersMlsService = RepliersMLSService.getInstance();

function normalizeRepliersImages(images: unknown, stableKey: string) {
  if (!Array.isArray(images)) return [fallbackImageFor(stableKey)];

  const usableImages = images
    .map((image) => typeof image === 'string' ? image.trim() : '')
    .filter(Boolean)
    .map((image) => {
      if (/^https?:\/\//i.test(image)) return image;
      if (image.startsWith('/images/')) return image;
      if (image.startsWith('images/')) return `/${image}`;
      return '';
    })
    .filter(Boolean);

  return usableImages.length > 0 ? usableImages : [fallbackImageFor(stableKey)];
}

function fallbackImageFor(stableKey: string) {
  const key = String(stableKey || '');
  const hash = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FALLBACK_PROPERTY_IMAGES[hash % FALLBACK_PROPERTY_IMAGES.length];
}
