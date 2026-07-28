'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type UsePropertiesOptions = {
  enabled?: boolean;
};

export const useProperties = (searchParams: any = {}, options: UsePropertiesOptions = {}) => {
  const enabled = options.enabled ?? true;
  // 1. Build canonical query string for SWR key
  const queryString = new URLSearchParams(searchParams).toString();
  const url = `/api/properties/search${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR(enabled ? url : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 Minute client-side deduplication
  });

  // Pulse Intelligence Mapping
  const properties = data?.data || [];
  const signature = data?.metadata?.signature;
  const isFromCache = data?.metadata?.cached;

  return {
    properties,
    signature,
    isFromCache,
    loading: isLoading,
    error,
    mutate
  };
};
