'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { PropertyProfile } from '@/lib/realtor-workspace/propertyProfileContract';
import type { SketchPin } from './PropertySketchMap';

export const LazyPropertySketchMap = dynamic(() => import('./PropertySketchMap'), {
  ssr: false,
  loading: () => <p role="status">Opening the aerial map…</p>,
});

export function propertySketchPins(profile: PropertyProfile): SketchPin[] {
  const pins: SketchPin[] = [];
  if (profile.driveway) pins.push({ id: 'driveway', label: 'Driveway', point: profile.driveway });
  for (const building of profile.buildings) {
    if (building.pin) pins.push({ id: building.id, label: building.name.trim() || 'Unnamed building', point: building.pin });
  }
  return pins;
}

export function PropertyProfileView({ profile, preview = false }: { profile: PropertyProfile; preview?: boolean }) {
  const [mapOpen, setMapOpen] = useState(false);
  const pins = propertySketchPins(profile);
  const Heading = preview ? 'h3' : 'h1';
  const SectionHeading = preview ? 'h4' : 'h2';

  return (
    <article className="space-y-7 rounded-2xl border border-stone-300 bg-white p-5 text-stone-900 sm:p-8">
      <header className="space-y-2">
        <Heading className="break-words font-sans text-3xl font-medium italic sm:text-4xl">{profile.title}</Heading>
        {profile.area ? <p>{profile.area}</p> : null}
        {profile.acres !== null ? <p>{profile.acres.toLocaleString('en-US')} {profile.acres === 1 ? 'acre' : 'acres'}</p> : null}
        {profile.summary ? <p className="whitespace-pre-wrap break-words pt-2 leading-relaxed">{profile.summary}</p> : null}
      </header>
      {pins.length ? (
        <section className="space-y-2">
          <SectionHeading className="font-sans text-xl font-medium italic">Property Sketch</SectionHeading>
          <p className="text-sm text-stone-700">Approximate pin locations for the driveway or buildings.</p>
          <button type="button" className="min-h-11 font-medium underline" aria-expanded={mapOpen} onClick={() => setMapOpen(open => !open)}>
            {mapOpen ? 'Hide Aerial Map' : 'Open Aerial Map'}
          </button>
          {mapOpen ? <LazyPropertySketchMap pins={pins} /> : null}
        </section>
      ) : null}
      {profile.buildings.length ? (
        <section>
          <SectionHeading className="font-sans text-xl font-medium italic">Buildings</SectionHeading>
          <ul className="mt-3 divide-y divide-stone-200 border-y border-stone-200">
            {profile.buildings.map(building => (
              <li key={building.id} className="space-y-1 break-words py-3">
                <p className="font-semibold">{building.name}</p>
                {building.use ? <p className="whitespace-pre-wrap">{building.use}</p> : null}
                <div className="flex flex-wrap gap-x-4 text-sm text-stone-700">
                  {building.bedrooms !== null ? <span>{building.bedrooms} {building.bedrooms === 1 ? 'bedroom' : 'bedrooms'}</span> : null}
                  {building.bathrooms !== null ? <span>{building.bathrooms} {building.bathrooms === 1 ? 'bathroom' : 'bathrooms'}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
