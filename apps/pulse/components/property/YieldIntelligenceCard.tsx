'use client';

import { useEffect, useState } from 'react';
import { FaSeedling } from 'react-icons/fa';

type YieldRecord = {
  county: string;
  fips: string;
  cornYield: number;
  wheatYield: number;
  latestYear: number;
  productivityScore: number;
  intensity: 'HIGH' | 'MODERATE' | 'LOW';
  confidence: number;
  source: string;
};

type YieldIntelligenceCardProps = {
  county?: string | null;
};

const intensityStyles = {
  HIGH: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
  MODERATE: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
  LOW: 'border-slate-400/30 bg-slate-400/10 text-slate-100',
};

export default function YieldIntelligenceCard({ county }: YieldIntelligenceCardProps) {
  const [selectedCounty, setSelectedCounty] = useState(county || '');
  const [counties, setCounties] = useState<string[]>([]);
  const [record, setRecord] = useState<YieldRecord | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'loaded' | 'empty'>('idle');

  useEffect(() => {
    setSelectedCounty(county || '');
  }, [county]);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/intelligence/yield')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        const countyNames = Array.isArray(json?.data)
          ? json.data.map((item: YieldRecord) => item.county).filter(Boolean)
          : [];
        setCounties(countyNames);
      })
      .catch(() => {
        if (!cancelled) setCounties([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCounty) {
      setRecord(null);
      setState('empty');
      return;
    }

    let cancelled = false;
    setState('loading');

    fetch(`/api/intelligence/yield?county=${encodeURIComponent(selectedCounty)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        setRecord(json?.data || null);
        setState(json?.data ? 'loaded' : 'empty');
      })
      .catch(() => {
        if (!cancelled) setState('empty');
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCounty]);

  if (state === 'idle' || state === 'loading') {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-500/10 bg-slate-900 p-8">
        <YieldCountyHeader
          counties={counties}
          selectedCounty={selectedCounty}
          onCountyChange={setSelectedCounty}
        />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="h-20 animate-pulse rounded-xl bg-slate-800/50" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-800/50" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-800/50" />
        </div>
      </div>
    );
  }

  return (
    <section className="relative mt-8 overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900 p-8 shadow-2xl shadow-emerald-950/20">
      <FaSeedling className="absolute right-6 top-6 text-7xl text-emerald-300/10" />

      <div className="relative z-10 border-l-4 border-emerald-400 pl-4">
        <YieldCountyHeader
          counties={counties}
          selectedCounty={selectedCounty}
          onCountyChange={setSelectedCounty}
          intensity={record?.intensity}
        />
        {record ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            {record.county} County has a normalized agricultural productivity score of {record.productivityScore}/100 based on recent corn and wheat yield signals.
          </p>
        ) : (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Which county is this property in? Select a county to load agricultural yield context.
          </p>
        )}
      </div>

      {record && (
        <>
          <div className="relative z-10 mt-6 grid gap-4 md:grid-cols-4">
            <Metric label="Productivity" value={`${record.productivityScore}/100`} />
            <Metric label="Corn yield" value={`${record.cornYield} bu/ac`} />
            <Metric label="Wheat yield" value={`${record.wheatYield} bu/ac`} />
            <Metric label="Confidence" value={`${record.confidence}%`} />
          </div>

          <p className="relative z-10 mt-5 text-[10px] font-medium leading-5 text-slate-500">
            Source: {record.source}. FIPS {record.fips}. Latest yield year {record.latestYear}. Use as directional land and county context, not an appraisal.
          </p>
        </>
      )}
    </section>
  );
}

function YieldCountyHeader({
  counties,
  selectedCounty,
  onCountyChange,
  intensity,
}: {
  counties: string[];
  selectedCounty: string;
  onCountyChange: (county: string) => void;
  intensity?: YieldRecord['intensity'];
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-xl font-black tracking-tight text-white">Land yield intelligence</h3>
        {intensity && (
          <span className={`rounded border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${intensityStyles[intensity]}`}>
            {intensity}
          </span>
        )}
      </div>

      <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 md:min-w-56">
        County
        <select
          value={selectedCounty}
          onChange={(event) => onCountyChange(event.target.value)}
          className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none transition focus:border-emerald-300"
        >
          <option value="">Select county</option>
          {counties.map((countyName) => (
            <option key={countyName} value={countyName}>
              {countyName}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-950/80 p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black italic text-white">{value}</p>
    </div>
  );
}
