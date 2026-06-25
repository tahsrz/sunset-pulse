'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import DeckGL from '@deck.gl/react';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer } from '@deck.gl/layers';
import Map from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Activity, Flame, MapPinned, Rows3 } from 'lucide-react';

type DeckListingRow = {
  address: string;
  bathrooms: number;
  bedrooms: number;
  city: string;
  daysOnMarket: number;
  estimate: number;
  id: string;
  imageQuality: number;
  latitude: number;
  longitude: number;
  photoCount: number;
  price: number;
  priceVsEstimate: number | null;
  propertyType: string;
  qualityBand: string;
  state: string;
  status: string;
};

type ListingDatasetResponse = {
  dataset?: {
    rowCount: number;
    rows: DeckListingRow[];
  };
};

const INITIAL_VIEW_STATE = {
  longitude: -97.0403,
  latitude: 33.453823,
  zoom: 4.2,
  pitch: 42,
  bearing: -12
};

export default function DeckListingSignals() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
  const [rows, setRows] = useState<DeckListingRow[]>([]);
  const [hovered, setHovered] = useState<DeckListingRow | null>(null);
  const [mode, setMode] = useState<'price' | 'heat'>('price');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      try {
        const response = await fetch('/api/kepler/listings?limit=220', { cache: 'no-store' });
        if (!response.ok) throw new Error('Deck listing feed failed.');
        const body = await response.json() as ListingDatasetResponse;
        if (cancelled) return;
        setRows(body.dataset?.rows || []);
        setStatus('ready');
      } catch (error) {
        console.error('[DECK_LISTING_SIGNALS] Failed to load listings:', error);
        if (!cancelled) setStatus('error');
      }
    }

    loadRows();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(() => {
    const prices = rows.map((row) => row.price).filter(Boolean);
    const averagePrice = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0;
    const hotListings = rows.filter((row) => row.daysOnMarket <= 14).length;
    const highQuality = rows.filter((row) => row.imageQuality >= 4).length;

    return {
      averagePrice,
      highQuality,
      hotListings,
      rows: rows.length
    };
  }, [rows]);

  const layers = useMemo(() => {
    const scatter = new ScatterplotLayer<DeckListingRow>({
      id: 'listing-signal-points',
      data: rows,
      pickable: true,
      stroked: true,
      filled: true,
      radiusUnits: 'meters',
      getPosition: (row) => [row.longitude, row.latitude],
      getRadius: (row) => Math.max(9000, Math.min(42000, row.daysOnMarket * 550 + 8000)),
      getFillColor: (row) => colorForListing(row),
      getLineColor: [255, 255, 255, 190],
      getLineWidth: 2,
      opacity: mode === 'price' ? 0.86 : 0.32,
      updateTriggers: {
        getFillColor: [mode]
      },
      onHover: ({ object }) => setHovered(object || null)
    });

    const heatmap = new HeatmapLayer<DeckListingRow>({
      id: 'listing-price-heat',
      data: rows,
      getPosition: (row) => [row.longitude, row.latitude],
      getWeight: (row) => Math.max(1, row.price / 100000),
      radiusPixels: 72,
      intensity: 1.2,
      threshold: 0.04,
      visible: mode === 'heat'
    });

    return [heatmap, scatter];
  }, [mode, rows]);

  if (!mapboxToken) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-5 text-slate-100">
        <div className="max-w-xl border border-amber-400/30 bg-amber-950/20 p-6">
          <h1 className="text-xl font-black text-amber-100">Deck signal map needs a Mapbox token</h1>
          <p className="mt-3 text-sm leading-6 text-amber-50/80">
            Set `NEXT_PUBLIC_MAPBOX_TOKEN` in the Pulse app environment, then restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-slate-950 px-5 pt-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">Deck.gl</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Native listing signal map</h1>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <Link
              className="inline-flex items-center justify-center border border-cyan-300/40 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300 hover:text-slate-950"
              href="/spatial-lab"
            >
              Open Kepler Workbench
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Metric icon={<Rows3 size={16} />} label="Rows" value={String(metrics.rows)} />
              <Metric icon={<Flame size={16} />} label="Hot" value={String(metrics.hotListings)} />
              <Metric icon={<Activity size={16} />} label="High Quality" value={String(metrics.highQuality)} />
              <Metric icon={<MapPinned size={16} />} label="Avg Price" value={metrics.averagePrice ? `$${metrics.averagePrice.toLocaleString()}` : '$0'} />
            </div>
          </div>
        </div>
      </section>

      <section className="relative h-[calc(100vh-170px)] min-h-[560px] overflow-hidden">
        <DeckGL
          controller
          getCursor={({ isDragging, isHovering }) => isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'}
          initialViewState={INITIAL_VIEW_STATE as never}
          layers={layers}
        >
          <Map
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={mapboxToken}
          />
        </DeckGL>

        <div className="absolute left-5 top-5 z-10 flex gap-2">
          <ModeButton active={mode === 'price'} label="Price Points" onClick={() => setMode('price')} />
          <ModeButton active={mode === 'heat'} label="Heat" onClick={() => setMode('heat')} />
        </div>

        {hovered && (
          <aside className="absolute right-5 top-5 z-10 w-[320px] border border-white/10 bg-slate-950/92 p-4 shadow-2xl backdrop-blur">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">{hovered.status}</p>
            <h2 className="mt-2 text-lg font-black leading-6">{hovered.address || hovered.id}</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Info label="Price" value={`$${hovered.price.toLocaleString()}`} />
              <Info label="DOM" value={String(hovered.daysOnMarket)} />
              <Info label="Beds/Baths" value={`${hovered.bedrooms}/${hovered.bathrooms}`} />
              <Info label="Quality" value={hovered.qualityBand} />
            </div>
          </aside>
        )}

        {status !== 'ready' && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/80 text-sm font-bold text-slate-200">
            {status === 'loading' ? 'Loading deck layers...' : 'Deck signal dataset unavailable.'}
          </div>
        )}
      </section>
    </main>
  );
}

function colorForListing(row: DeckListingRow): [number, number, number, number] {
  if (row.daysOnMarket <= 14) return [34, 211, 238, 220];
  if ((row.priceVsEstimate || 0) < -25000) return [52, 211, 153, 215];
  if (row.imageQuality >= 4) return [244, 114, 182, 215];
  if (row.price >= 750000) return [250, 204, 21, 215];
  return [96, 165, 250, 205];
}

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
        active
          ? 'border-cyan-300 bg-cyan-300 text-slate-950'
          : 'border-white/10 bg-slate-950/88 text-slate-200 hover:border-cyan-300/60'
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-[124px] border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="flex items-center gap-2 text-cyan-200">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.04] p-2">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-100">{value}</p>
    </div>
  );
}
