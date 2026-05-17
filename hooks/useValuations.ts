'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const useValuations = () => {
  const { data, error, isLoading } = useSWR('/api/valuation', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 15000, // 15s deduplication
  });

  return { 
    valuations: data?.data || [], 
    loading: isLoading,
    error 
  };
};
