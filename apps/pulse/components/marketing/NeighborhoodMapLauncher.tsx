'use client';

import React, { Component, lazy, Suspense, useState } from 'react';
import { MapPinned } from 'lucide-react';

const NeighborhoodMap = lazy(() => import('./NeighborhoodMap'));
type Place = { id: string; name: string; description: string; category: string; latitude: number; longitude: number; evidenceIds: string[] };
type Center = { latitude: number; longitude: number; zoom: number };
type Source = { id: string; publisher: string; title: string; sourceUrl: string };

class MapErrorBoundary extends Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p role="alert" className="rounded-xl bg-white/5 p-4 text-sm text-slate-300">The map could not be opened. Use the place list below or open the area in Explorer.</p> : this.props.children; }
}

export default function NeighborhoodMapLauncher({ center, places, evidence }: { center: Center; places: Place[]; evidence: Source[] }) {
  const [open, setOpen] = useState(false);
  const explorerHref = `/explorer?${new URLSearchParams({ lat: String(center.latitude), lng: String(center.longitude) })}`;
  return (
    <section className="mt-8 rounded-3xl border border-teal-100/15 bg-white/[0.035] p-5 sm:p-7" aria-labelledby="neighborhood-places-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-200">Verified nearby places</p><h2 id="neighborhood-places-title" className="mt-2 text-2xl font-bold">Area Map and Places</h2></div>
        <div className="flex flex-wrap gap-3">
          <a href={explorerHref} className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 text-sm font-bold text-teal-100 underline-offset-4 hover:underline">Open in Explorer</a>
          <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-300 px-4 text-sm font-black text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><MapPinned size={16} />{open ? 'Close Area Map' : 'Open Area Map'}</button>
        </div>
      </div>
      {open ? <div className="mt-5"><MapErrorBoundary><Suspense fallback={<div role="status" className="flex h-72 items-center justify-center rounded-2xl bg-white/5 text-sm text-slate-300">Opening the map…</div>}><NeighborhoodMap center={center} places={places} /></Suspense></MapErrorBoundary></div> : null}
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {places.map((place) => <li key={place.id} className="rounded-xl border border-white/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-teal-200">{place.category}</p><h3 className="mt-2 font-bold text-white">{place.name}</h3><p className="mt-1 text-sm leading-6 text-slate-300">{place.description}</p><ul className="mt-3 flex flex-wrap gap-3">{place.evidenceIds.map((id) => { const source = evidence.find((item) => item.id === id); return source ? <li key={id}><a href={source.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-teal-200 underline underline-offset-4">{source.publisher}: {source.title}</a></li> : null; })}</ul></li>)}
      </ul>
    </section>
  );
}
