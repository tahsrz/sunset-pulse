'use client';

import Map, { Marker, NavigationControl, Popup } from 'react-map-gl';
import { useState } from 'react';

type Place = { id: string; name: string; latitude: number; longitude: number };
export default function NeighborhoodMap({ center, places }: { center: { latitude: number; longitude: number; zoom: number }; places: Place[] }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!token) return <p className="rounded-xl bg-white/5 p-4 text-sm text-slate-300">The map is unavailable right now. The place list and Explorer link remain available.</p>;
  return (
    <div className="h-[320px] overflow-hidden rounded-2xl border border-white/10 sm:h-[400px]" role="region" aria-label="Interactive map of verified nearby places">
      <Map initialViewState={center} mapStyle="mapbox://styles/mapbox/streets-v12" mapboxAccessToken={token} attributionControl scrollZoom={false}>
        <NavigationControl position="top-right" showCompass={false} />
        {places.map((place) => <Marker key={place.id} latitude={place.latitude} longitude={place.longitude} anchor="bottom"><button type="button" onClick={() => setSelectedId(place.id)} aria-label={`Show ${place.name} on the map`} className="rounded-full border-2 border-white bg-[#074c4b] px-3 py-2 text-xs font-bold text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200">{place.name}</button></Marker>)}
        {places.filter((place) => place.id === selectedId).map((place) => <Popup key={place.id} latitude={place.latitude} longitude={place.longitude} anchor="top" closeButton onClose={() => setSelectedId(null)} closeOnClick={false}><strong>{place.name}</strong></Popup>)}
      </Map>
    </div>
  );
}
