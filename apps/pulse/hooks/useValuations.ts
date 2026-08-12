'use client';

import useSWR from 'swr';
import type { MapValuationResult } from '@/models/types';

const fetcher = (url: string): Promise<{ data?: MapValuationResult[] }> => fetch(url).then((res) => res.json());

export const useValuations = () => {
  const { data, error, isLoading } = useSWR<{ data?: MapValuationResult[] }>('/api/valuation', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 15000, // 15s deduplication
  });

  return { 
    valuations: data?.data || [],
    loading: isLoading,
    error 
  };
};
