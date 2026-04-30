import { useState, useEffect } from 'react';
import { IdentityBloomFilter } from '@/utils/security/IdentityBloomFilter';

/**
 * useIdentityFilter Hook
 * Provides instantaneous username availability checks without DB hits.
 */
export const useIdentityFilter = () => {
  const [filter, setFilter] = useState<IdentityBloomFilter | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFilter = async () => {
      try {
        const res = await fetch('/api/identity/sync');
        const json = await res.json();
        
        if (json.success) {
          const hydrated = IdentityBloomFilter.hydrate(
            json.data, 
            json.config.size, 
            json.config.hashCount
          );
          setFilter(hydrated);
        }
      } catch (err) {
        console.error("Failed to rehydrate Identity Filter:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilter();
  }, []);

  /**
   * Check Availability
   * true -> Definitely Available
   * false -> Might be taken (Verify with DB)
   */
  const checkAvailability = (username: string): boolean => {
    if (!filter) return false; // Fail closed (say it's taken if filter is missing)
    return !filter.isProbablyTaken(username);
  };

  return { checkAvailability, isLoading };
};
