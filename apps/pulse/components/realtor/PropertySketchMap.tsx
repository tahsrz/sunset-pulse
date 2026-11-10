'use client';

import { useRef, useState } from 'react';
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl';
import type { PropertyProfilePoint } from '@/lib/realtor-workspace/propertyProfileContract';

export type SketchPin = { id: string; label: string; point: PropertyProfilePoint };
const sunset = { latitude: 33.4504, longitude: -97.7709 };
const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function PropertySketchMap({ pins, onPlace, onCancel }: {
  pins: SketchPin[];
  onPlace?: (point: PropertyProfilePoint) => void;
  onCancel?: () => void;
}) {
  const map = useRef<MapRef>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const center = pins[0]?.point ?? sunset;
  const place = (latitude: number, longitude: number) => onPlace?.({
    latitude: Number(latitude.toFixed(6)),
    longitude: Number((((longitude + 180) % 360 + 360) % 360 - 180).toFixed(6)),
  });

  if (!token || failed) return <p role="status">The aerial map is unavailable. The property details are still available below.</p>;

  return (
    <div className="space-y-3">
      <div className="relative h-72 overflow-hidden rounded-xl" role="region" aria-label="Aerial property sketch">
        <Map
          ref={map}
          initialViewState={{ ...center, zoom: pins.length ? 17 : 13 }}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          mapboxAccessToken={token}
          scrollZoom={false}
          cursor={onPlace ? 'crosshair' : undefined}
          onClick={onPlace ? event => place(event.lngLat.lat, event.lngLat.lng) : undefined}
          onError={event => {
            if (!map.current?.isStyleLoaded()) {
              setFailed(true);
              console.warn('Unable to load the property sketch map.', event.error?.name);
            }
          }}
          onLoad={() => {
            if (pins.length > 1) {
              const latitudes = pins.map(pin => pin.point.latitude);
              const longitudes = pins.map(pin => pin.point.longitude);
              map.current?.fitBounds([
                [Math.min(...longitudes), Math.min(...latitudes)],
                [Math.max(...longitudes), Math.max(...latitudes)],
              ], { padding: 42, maxZoom: 18, duration: 0 });
            }
            setReady(true);
          }}
        >
          <NavigationControl showCompass={false} />
          {pins.map((pin, index) => (
            <Marker key={pin.id} latitude={pin.point.latitude} longitude={pin.point.longitude} anchor="center">
              <span title={pin.label} aria-hidden="true" className="grid size-8 place-items-center rounded-full border-2 border-white bg-sky-950 font-bold text-white shadow-lg">
                {index + 1}
              </span>
            </Marker>
          ))}
        </Map>
        {onPlace && ready ? <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-sky-950 text-sm font-bold text-white shadow">+</span> : null}
      </div>
      {onPlace && ready ? (
        <div className="flex flex-wrap gap-x-4">
          <button type="button" className="min-h-11 underline" onClick={() => {
            const point = map.current?.getCenter();
            if (point) place(point.lat, point.lng);
          }}>Place Pin at Map Center</button>
          <button type="button" className="min-h-11 underline" onClick={onCancel}>Cancel Pin Placement</button>
        </div>
      ) : null}
      {pins.length ? <ol className="list-decimal space-y-1 pl-6 text-sm">{pins.map(pin => <li key={pin.id}>{pin.label}</li>)}</ol> : null}
    </div>
  );
}
