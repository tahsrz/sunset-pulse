/**
 * Bridge Interactive IDX Service
 * High-fidelity property data acquisition via Bridge API (NTREIS).
 */

import { gatekeeper } from '@/lib/core/gatekeeper';

export interface BridgeProperty {
  ListingId: string;
  ListPrice: number;
  UnparsedAddress: string;
  City: string;
  StateOrProvince: string;
  PostalCode: string;
  BedroomsTotal: number;
  BathroomsFull: number;
  LivingArea: number;
  PropertyType: string;
  PublicRemarks: string;
  Media?: { MediaURL: string }[];
  Latitude: number;
  Longitude: number;
  ModificationTimestamp: string;
}

class BridgeMLSService {
  private static instance: BridgeMLSService;
  private apiKey: string | undefined;
  private baseUrl: string = 'https://api.bridgeinteractive.com/v2/ntreis/listings';

  private constructor() {
    this.apiKey = process.env.BRIDGE_API_KEY;
  }

  public static getInstance(): BridgeMLSService {
    if (!BridgeMLSService.instance) {
      BridgeMLSService.instance = new BridgeMLSService();
    }
    return BridgeMLSService.instance;
  }

  private async fetchBridge(endpoint: string = '', params: any = {}) {
    if (!this.apiKey) {
      console.warn('BRIDGE_API_KEY missing. Falling back to internal data.');
      return null;
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('access_token', this.apiKey);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    try {
      const res = await fetch(url.toString(), {
        cache: 'no-store'
      });

      if (!res.ok) throw new Error(`Bridge API Error: ${res.statusText}`);
      const data = await res.json();
      return data.bundle || data;
    } catch (e) {
      console.error('Bridge Fetch Failure:', e);
      return null;
    }
  }

  /**
   * The Pulse: Asynchronous Ingestion Stream (SICP Pattern)
   * Fetches listings in chunks and yields only those that pass the TAH Gatekeeper.
   */
  public async *getListingStream(params: any = {}) {
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    console.log('📡 [BRIDGE_PULSE] Initiating Asynchronous Ingestion Stream...');

    while (hasMore) {
      const bridgeParams = {
        '$limit': limit,
        '$skip': offset,
        ...params
      };

      const bundle = await this.fetchBridge('', bridgeParams);
      
      if (!bundle || !Array.isArray(bundle) || bundle.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of bundle) {
        // Apply the TAH Listing Gate at the stream edge
        if (gatekeeper.shouldProcessListing(item.ListingId, item.ModificationTimestamp)) {
          yield this.mapBridgeToProperty(item);
        }
      }

      offset += limit;
      // Safety break for prototype / prevent infinite loops
      if (offset >= 500) hasMore = false; 
    }
    
    console.log('🏁 [BRIDGE_PULSE] Ingestion Stream completed.');
  }

  private mapBridgeToProperty(item: BridgeProperty) {
    return {
      _id: item.ListingId,
      name: item.UnparsedAddress,
      type: item.PropertyType || 'Residential',
      description: item.PublicRemarks || 'MLS Listed Property',
      location: {
        street: item.UnparsedAddress,
        city: item.City,
        state: item.StateOrProvince,
        zipcode: item.PostalCode
      },
      location_geo: {
        type: 'Point',
        coordinates: [item.Longitude, item.Latitude]
      },
      beds: item.BedroomsTotal || 0,
      baths: item.BathroomsFull || 0,
      square_feet: item.LivingArea || 0,
      amenities: [],
      rates: {
        monthly: item.ListPrice || 0
      },
      images: item.Media?.map(m => m.MediaURL) || [],
      source: 'MLS',
      mls_id: item.ListingId,
      listing_status: 'Active',
      last_updated: item.ModificationTimestamp
    };
  }

  /**
   * Fetches properties from NTREIS via Bridge Interactive.
   * Now integrated with Gatekeeper for traditional array-based fetches.
   */
  public async getListings(params: any = {}) {
    const bridgeParams: any = {
      '$limit': 20,
      ...params
    };

    const data = await this.fetchBridge('', bridgeParams);
    if (!data || !Array.isArray(data)) return [];

    return data
      .filter((item: any) => gatekeeper.shouldProcessListing(item.ListingId, item.ModificationTimestamp))
      .map((item: any) => this.mapBridgeToProperty(item));
  }

  /**
   * Resolves a single listing by ID.
   */
  public async getListingById(id: string) {
    const data = await this.fetchBridge(`/${id}`);
    if (data && !Array.isArray(data)) {
      return this.mapBridgeToProperty(data);
    }
    return null;
  }
}

export const bridgeMlsService = BridgeMLSService.getInstance();
