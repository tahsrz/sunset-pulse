import { useState, useEffect } from 'react';
import { getPropertySatelliteUrl } from '@/lib/core/geospatial/geotagUtils';

/**
 * Hook to manage property satellite imagery fetching.
 */
export const usePropertyImagery = (property: any) => {
  const [satelliteUrl, setSatelliteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchImagery = async () => {
      setLoading(true);
      try {
        const url = await getPropertySatelliteUrl(property);
        if (isMounted) {
          setSatelliteUrl(url);
        }
      } catch (error) {
        console.error('[USE_PROPERTY_IMAGERY] Failed to fetch imagery:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (property) {
      fetchImagery();
    }

    return () => {
      isMounted = false;
    };
  }, [property]);

  return { satelliteUrl, loading };
};
