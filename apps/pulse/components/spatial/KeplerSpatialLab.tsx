'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { combineReducers, applyMiddleware, compose, createStore, type Store } from 'redux';
import { Provider } from 'react-redux';
import KeplerGl from '@kepler.gl/components';
import keplerGlReducer, { enhanceReduxMiddleware } from '@kepler.gl/reducers';
import { addDataToMap } from '@kepler.gl/actions';
import { processRowObject } from '@kepler.gl/processors';
import { Activity, AlertTriangle, Database, Map as MapIcon } from 'lucide-react';

type KeplerListingRow = {
  address: string;
  area: string;
  bathrooms: number;
  bedrooms: number;
  brokerage: string;
  city: string;
  daysOnMarket: number;
  estimate: number;
  estimateConfidence: number;
  id: string;
  imageQuality: number;
  latitude: number;
  longitude: number;
  lotAcres: number;
  lotSquareFeet: number;
  neighborhood: string;
  originalPrice: number;
  photoCount: number;
  price: number;
  priceChange: number | null;
  priceVsEstimate: number | null;
  propertyType: string;
  qualityBand: string;
  sqft: number;
  state: string;
  status: string;
  style: string;
  yearBuilt: number;
};

type ListingDatasetResponse = {
  dataset?: {
    id: string;
    label: string;
    rowCount: number;
    rows: KeplerListingRow[];
  };
};

const MAP_ID = 'sunset-kepler-map';
const DATA_ID = 'sunset_listing_signals';

const KEPLER_CONFIG = {
  version: 'v1' as const,
  config: {
    visState: {
      filters: [
        {
          dataId: [DATA_ID],
          id: 'days-on-market-filter',
          name: ['daysOnMarket'],
          type: 'range',
          value: [0, 180],
          view: 'side'
        }
      ],
      interactionConfig: {
        tooltip: {
          fieldsToShow: {
            [DATA_ID]: [
              { name: 'address', format: null },
              { name: 'price', format: null },
              { name: 'daysOnMarket', format: null },
              { name: 'status', format: null },
              { name: 'qualityBand', format: null }
            ]
          },
          enabled: true
        }
      },
      layers: [
        {
          id: 'listing-price-points',
          type: 'point',
          config: {
            dataId: DATA_ID,
            label: 'Listings by price',
            color: [14, 165, 233],
            columns: {
              lat: 'latitude',
              lng: 'longitude',
              altitude: null
            },
            isVisible: true,
            visConfig: {
              filled: true,
              opacity: 0.78,
              outline: false,
              radius: 14,
              radiusRange: [6, 34],
              strokeColor: [255, 255, 255],
              thickness: 1
            }
          },
          visualChannels: {
            colorField: { name: 'price', type: 'integer' },
            colorScale: 'quantile',
            sizeField: { name: 'daysOnMarket', type: 'integer' },
            sizeScale: 'sqrt'
          }
        },
        {
          id: 'image-quality-points',
          type: 'point',
          config: {
            dataId: DATA_ID,
            label: 'Image quality pulse',
            color: [244, 114, 182],
            columns: {
              lat: 'latitude',
              lng: 'longitude',
              altitude: null
            },
            isVisible: false,
            visConfig: {
              filled: true,
              opacity: 0.52,
              radius: 10,
              radiusRange: [4, 24]
            }
          },
          visualChannels: {
            colorField: { name: 'imageQuality', type: 'real' },
            colorScale: 'quantile',
            sizeField: { name: 'photoCount', type: 'integer' },
            sizeScale: 'sqrt'
          }
        }
      ],
      layerBlending: 'normal'
    },
    mapState: {
      bearing: 0,
      dragRotate: true,
      latitude: 33.453823,
      longitude: -97.0403,
      pitch: 0,
      zoom: 4.2,
      isSplit: false
    },
    mapStyle: {
      styleType: 'dark'
    }
  }
};

export default function KeplerSpatialLab() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const store = useMemo(() => createKeplerStore(), []);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 720 });
  const [rows, setRows] = useState<KeplerListingRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDimensions({
        width: Math.max(320, Math.round(rect.width)),
        height: Math.max(420, Math.round(rect.height))
      });
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      try {
        const response = await fetch('/api/kepler/listings?limit=140', { cache: 'no-store' });
        if (!response.ok) throw new Error('Kepler listing feed failed.');

        const body = await response.json() as ListingDatasetResponse;
        const nextRows = body.dataset?.rows || [];
        if (cancelled) return;

        setRows(nextRows);
        store.dispatch(addDataToMap({
          datasets: {
            info: {
              id: DATA_ID,
              label: body.dataset?.label || 'Sunset Pulse listing signals'
            },
            data: processRowObject(nextRows)
          },
          options: {
            centerMap: true,
            keepExistingConfig: false,
            readOnly: false
          },
          config: KEPLER_CONFIG as never
        }) as never);
        setStatus('ready');
      } catch (error) {
        console.error('[KEPLER_SPATIAL_LAB] Failed to load listings:', error);
        if (!cancelled) setStatus('error');
      }
    }

    loadListings();

    return () => {
      cancelled = true;
    };
  }, [store]);

  const metrics = useMemo(() => {
    const prices = rows.map((row) => row.price).filter(Boolean);
    const averagePrice = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0;
    const states = new Set(rows.map((row) => row.state).filter(Boolean));
    const active = rows.filter((row) => /active/i.test(row.status)).length;

    return {
      active,
      averagePrice,
      rows: rows.length,
      states: states.size
    };
  }, [rows]);

  if (!mapboxToken) {
    return (
      <div className="min-h-screen bg-slate-950 px-5 py-24 text-slate-100">
        <div className="mx-auto max-w-3xl border border-amber-400/30 bg-amber-950/20 p-6">
          <div className="flex items-center gap-3 text-amber-200">
            <AlertTriangle size={20} />
            <h1 className="text-xl font-black">Kepler Spatial Lab needs a Mapbox token</h1>
          </div>
          <p className="mt-3 text-sm leading-6 text-amber-50/80">
            Set `NEXT_PUBLIC_MAPBOX_TOKEN` in the Pulse app environment, then restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="border-b border-white/10 bg-slate-950 px-5 pt-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">Spatial Lab</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">Kepler listing intelligence</h1>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <Link
              className="inline-flex items-center justify-center border border-cyan-300/40 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300 hover:text-slate-950"
              href="/spatial-lab/deck"
            >
              Open Deck Signal Map
            </Link>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric icon={<Database size={16} />} label="Rows" value={String(metrics.rows)} />
              <Metric icon={<Activity size={16} />} label="Active" value={String(metrics.active)} />
              <Metric icon={<MapIcon size={16} />} label="States" value={String(metrics.states)} />
              <Metric label="Avg Price" value={metrics.averagePrice ? `$${metrics.averagePrice.toLocaleString()}` : '$0'} />
            </div>
          </div>
        </div>
      </section>

      <section ref={containerRef} className="relative h-[calc(100vh-170px)] min-h-[560px] w-full overflow-hidden bg-slate-900">
        <Provider store={store}>
          <KeplerGl
            appName="Sunset Pulse"
            height={dimensions.height}
            id={MAP_ID}
            mapboxApiAccessToken={mapboxToken}
            mint={false}
            theme="dark"
            width={dimensions.width}
          />
        </Provider>

        {status !== 'ready' && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/80 text-sm font-bold text-slate-200">
            {status === 'loading' ? 'Loading spatial dataset...' : 'Spatial dataset unavailable.'}
          </div>
        )}
      </section>
    </main>
  );
}

function createKeplerStore(): Store {
  const reducer = combineReducers({
    keplerGl: keplerGlReducer
  });
  const middlewares = enhanceReduxMiddleware([]);
  const enhancer = compose(applyMiddleware(...middlewares));

  return createStore(reducer, {}, enhancer);
}

function Metric({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-[112px] border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="flex items-center gap-2 text-cyan-200">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
