'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) {
      return res.json().then(err => { throw err; });
    }
    return res.json();
  });

export const useJamieInsights = () => {
  const { data, error, isLoading } = useSWR('/api/jamie/dreams', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000, // 10s deduplication
  });

  return { 
    jamieInsights: Array.isArray(data) ? data : [], 
    loading: isLoading,
    error 
  };
};
