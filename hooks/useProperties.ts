'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const useProperties = (query: string = '') => {
  const url = query ? `/api/properties?query=${encodeURIComponent(query)}` : '/api/properties';
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, 
  });

  // API returns { total, properties: [] } or just [] depending on the endpoint version
  const properties = data?.properties || (Array.isArray(data) ? data : []);

  return {
    properties,
    loading: isLoading,
    error,
    mutate
  };
};
