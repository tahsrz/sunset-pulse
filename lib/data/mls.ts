/**
 * MLS / IDX Bridge Service
 * Handles communication with external MLS data providers.
 * Prepared for SimplyRETS, Bridge API, or Spark.
 */

import { fetchProperty } from '@/utils/requests';

export interface MLSProperty {
  id: string;
  source: 'Internal' | 'MLS';
  mls_id?: string;
  list_price: number;
  status: string;
  // ... standardized MLS fields
}

class MLSService {
  private static instance: MLSService;
  private apiKey: string | undefined;
  private baseUrl: string = 'https://api.repliers.io';

  private constructor() {
    this.apiKey = process.env.MLS_API_KEY;
  }

  public static getInstance(): MLSService {
    if (!MLSService.instance) {
      MLSService.instance = new MLSService();
    }
    return MLSService.instance;
  }

  private async fetchRepliers(endpoint: string, params: any = {}) {
    if (!this.apiKey) {
      console.warn('MLS_API_KEY missing. Falling back to internal data only.');
      return null;
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

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

  private mapRepliersToProperty(item: any) {
    return {
      _id: item.mlsNumber, // Use MLS number as internal ID for external listings
      name: `${item.address.streetNumber} ${item.address.streetName} ${item.address.streetSuffix}`,
      type: item.details.propertyType || 'Residential',
      description: item.details.description || 'MLS Listed Property',
      location: {
        street: `${item.address.streetNumber} ${item.address.streetName}`,
        city: item.address.city,
        state: item.address.state || 'TX',
        zipcode: item.address.zip
      },
      location_geo: {
        type: 'Point',
        coordinates: [parseFloat(item.map.longitude), parseFloat(item.map.latitude)]
      },
      beds: parseInt(item.details.numBedrooms) || 0,
      baths: parseInt(item.details.numBathrooms) || 0,
      square_feet: parseInt(item.details.sqft) || 0,
      amenities: [],
      rates: {
        monthly: parseFloat(item.listPrice) || 0
      },
      images: item.images || [],
      source: 'MLS',
      mls_id: item.mlsNumber,
      listing_status: item.status === 'A' ? 'Active' : item.status
    };
  }

  /**
   * Fetches properties from the unified listing pool.
   * Merges MongoDB results with live Repliers.io stream.
   */
  public async getListings(params: any = {}) {
    const internalUrl = `${process.env.NEXT_PUBLIC_API_DOMAIN || 'http://localhost:3000'}/api/properties`;
    
    // Extract tactical filters
    const repliersParams: any = {
      resultsPerPage: 25,
      ...params
    };

    // Fetch both in parallel
    const [internalRes, repliersData] = await Promise.all([
      fetch(internalUrl, { cache: 'no-store' }).then(r => r.ok ? r.json() : { properties: [] }).catch(() => ({ properties: [] })),
      this.fetchRepliers('/listings', repliersParams)
    ]);

    const internalListings = internalRes.properties || [];
    const mlsListings = repliersData?.listings?.map(this.mapRepliersToProperty) || [];

    // Filter internal listings if city is provided
    let filteredInternal = internalListings;
    if (params.city) {
      filteredInternal = internalListings.filter((p: any) => 
        p.location.city.toLowerCase().includes(params.city.toLowerCase())
      );
    }

    return [...filteredInternal, ...mlsListings];
  }

  /**
   * Resolves a single listing by ID, checking internal first, then Repliers.io.
   */
  public async getListingById(id: string) {
    // 1. Try local MongoDB first (standard MongoDB BSON ID check)
    if (id.length === 24) { 
      const internal = await fetchProperty(id);
      if (internal) return internal;
    }

    // 2. Fallback to Repliers.io (Assuming id is an MLS number)
    const repliersItem = await this.fetchRepliers(`/listings/${id}`);
    if (repliersItem) {
      return this.mapRepliersToProperty(repliersItem);
    }

    return null;
  }
}

export const mlsService = MLSService.getInstance();