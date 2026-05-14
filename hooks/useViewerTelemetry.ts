import { useState, useCallback } from 'react';
import * as THREE from 'three';

interface Telemetry {
  lat: number;
  lng: number;
  alt: number;
}

/**
 * Hook to manage viewer telemetry mapping from 3D space to geographic coordinates.
 */
export const useViewerTelemetry = (property: any) => {
  const [telemetry, setTelemetry] = useState<Telemetry>({ lat: 0, lng: 0, alt: 0 });

  const updateTelemetry = useCallback((pos: THREE.Vector3) => {
    if (!property) return;

    // Approximate mapping for visualization purposes
    const baseLat = property.location_geo?.coordinates?.[1] || 32.7767;
    const baseLng = property.location_geo?.coordinates?.[0] || -96.7970;
    
    // 0.0001 degrees is roughly 11 meters
    setTelemetry({
      lat: baseLat + (pos.z * 0.0001),
      lng: baseLng + (pos.x * 0.0001),
      alt: pos.y * 3.28084 // Meters to Feet
    });
  }, [property]);

  return { telemetry, updateTelemetry };
};
