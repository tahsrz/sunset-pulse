/**
 * Repliers.io IDX Service
 * High-fidelity property data acquisition via Repliers.io API.
 */

import { gatekeeper } from '@/lib/core/gatekeeper';
import { sanitizeMlsForPublicUse } from '@/lib/data/mlsCompliance';

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
      const repliersParams = {
        'page': page,
        'pageSize': pageSize,
        ...params
      };

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
      rates: {
        monthly: parseFloat(item.listPrice) || 0
      },
      images: item.images || [],
      source: 'MLS',
      mls_id: item.mlsNumber,
      listing_status: item.status === 'A' ? 'Active' : item.status,
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
