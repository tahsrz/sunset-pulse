import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Query Builder for Properties
 * Translates SunsetPulse search parameters into Supabase SELECT filters.
 */
export const applyPropertyFilters = (query: any, searchParams: Record<string, string>) => {
  let filteredQuery = query;

  // 0. Filter Demo Listings
  if (process.env.NEXT_PUBLIC_MOCK_MODE !== 'true') {
    filteredQuery = filteredQuery.not('is_demo', 'is', true);
  }

  // 1. Text Search (Name, City)
  if (searchParams.location) {
    // Supabase or() for text search
    filteredQuery = filteredQuery.or(`name.ilike.%${searchParams.location}%,city.ilike.%${searchParams.location}%,state.ilike.%${searchParams.location}%`);
  }

  // 2. Property Type
  if (searchParams.propertyType && searchParams.propertyType !== 'All') {
    filteredQuery = filteredQuery.eq('type', searchParams.propertyType);
  }

  // 3. Beds/Baths
  if (searchParams.beds && searchParams.beds !== 'Any') {
    filteredQuery = filteredQuery.gte('beds', parseInt(searchParams.beds));
  }
  if (searchParams.baths && searchParams.baths !== 'Any') {
    filteredQuery = filteredQuery.gte('baths', parseInt(searchParams.baths));
  }

  // 4. Price Range
  if (searchParams.minPrice) {
    filteredQuery = filteredQuery.gte('price', parseInt(searchParams.minPrice));
  }
  if (searchParams.maxPrice) {
    filteredQuery = filteredQuery.lte('price', parseInt(searchParams.maxPrice));
  }

  // 5. Sorting
  filteredQuery = filteredQuery.order('last_updated', { ascending: false });

  return filteredQuery;
};
