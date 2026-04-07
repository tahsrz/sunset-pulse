'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const useJamieInsights = () => {
  const { data, error, isLoading } = useSWR('/api/jamie/dreams', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000, // 10s deduplication
  });

  return { 
    jamieInsights: data || [], 
    loading: isLoading,
    error 
  };
};
