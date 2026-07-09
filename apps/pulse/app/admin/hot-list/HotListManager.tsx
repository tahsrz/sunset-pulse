'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaEye, FaHome, FaImage, FaListUl, FaSave, FaSync, FaTimesCircle } from 'react-icons/fa';
import SafePropertyImage from '@/components/SafePropertyImage';

type PreviewListing = {
  id: string;
  _id: string;
  mls_id?: string;
  name: string;
  location?: {
    street?: string;
    city?: string;
    state?: string;
    zipcode?: string;
  };
  list_price?: number | null;
  price?: number | null;
  images?: string[];
  listing_status?: string;
  source?: string;
};

type PreviewResult = {
  listings: PreviewListing[];
  targets: Array<{ kind: 'mlsId' | 'address'; value: string }>;
  unresolved: Array<{ kind: 'mlsId' | 'address'; value: string }>;
  skipped: Array<{
    target?: { kind: 'mlsId' | 'address'; value: string };
    listingId?: string;
    reason: string;
  }>;
  generatedAt: string;
};

type SavedHotList = {
  rawMlsIds: string;
  rawAddresses: string;
  limit: number;
  updatedAt?: string;
};

export function HotListManager() {
  const [rawMlsIds, setRawMlsIds] = useState('');
  const [rawAddresses, setRawAddresses] = useState('');
  const [limit, setLimit] = useState(10);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [saved, setSaved] = useState<SavedHotList | null>(null);

  useEffect(() => {
    loadSavedHotList();
  }, []);

  const loadSavedHotList = async () => {
    setBooting(true);
    setError('');
    try {
      const response = await fetch('/api/admin/properties/hot-list', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to load saved hot list.');
      }

      if (payload.data.saved) {
        setSaved(payload.data.saved);
        setRawMlsIds(payload.data.saved.rawMlsIds || '');
        setRawAddresses(payload.data.saved.rawAddresses || '');
        setLimit(payload.data.saved.limit || 10);
        setResult(payload.data.result || null);
      }
    } catch (loadError: any) {
      setError(loadError?.message || 'Failed to load saved hot list.');
    } finally {
      setBooting(false);
    }
  };

  const previewHotList = async () => {
    setLoading(true);
    setError('');
    setStatus('');
    try {
      const response = await fetch('/api/admin/properties/hot-list/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawMlsIds, rawAddresses, limit }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Hot-list preview failed.');
      }
      setResult(payload.data.result);
      setStatus('Preview resolved. Save this list to make it the homepage source of truth.');
    } catch (previewError: any) {
      setResult(null);
      setError(previewError?.message || 'Hot-list preview failed.');
    } finally {
      setLoading(false);
    }
  };

  const saveHotList = async () => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const response = await fetch('/api/admin/properties/hot-list', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawMlsIds, rawAddresses, limit }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Hot-list save failed.');
      }
      setSaved(payload.data.saved);
      setResult(payload.data.result);
      setStatus('Saved. Homepage hot list now resolves from this operator list.');
    } catch (saveError: any) {
      setError(saveError?.message || 'Hot-list save failed.');
    } finally {
      setSaving(false);
    }
  };

  const acceptedCount = result?.listings.length || 0;
  const rejectedCount = (result?.unresolved.length || 0) + (result?.skipped.length || 0);
  const rejectionRows: Array<{
    target?: { kind: 'mlsId' | 'address'; value: string };
    listingId?: string;
    reason: string;
  }> = result
    ? [
        ...result.unresolved.map((target) => ({ target, reason: 'not_found' })),
        ...result.skipped,
      ]
    : [];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 rounded-[2rem] border border-cyan-200/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-100">
                <FaHome />
                Tour Studio Inventory
              </div>
              <h1 className="text-4xl font-black uppercase italic tracking-tight text-white">Hot List Manager</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Paste the 8-10 homes you want to test. The preview only accepts canonical MLS listings with secure remote images, so image-less dummy inventory cannot reach the homepage.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={previewHotList}
                disabled={loading || saving || booting}
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaEye />
                {loading ? 'Resolving...' : 'Preview'}
              </button>
              <button
                onClick={saveHotList}
                disabled={loading || saving || booting}
                className="inline-flex items-center justify-center gap-3 rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-emerald-100 transition hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaSave />
                {saving ? 'Saving...' : 'Save Source'}
              </button>
            </div>
          </div>
          {saved?.updatedAt && (
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Saved source updated {new Date(saved.updatedAt).toLocaleString()}
            </p>
          )}
        </header>

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
              <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                MLS IDs
              </label>
              <textarea
                value={rawMlsIds}
                onChange={(event) => setRawMlsIds(event.target.value)}
                rows={8}
                placeholder={'NTREIS-1234567\nNTREIS-7654321'}
                className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950 p-4 font-mono text-xs leading-6 text-cyan-100 outline-none transition placeholder:text-slate-700 focus:border-cyan-300/50"
              />
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Comma, newline, semicolon, and pipe separated.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
              <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                Addresses
              </label>
              <textarea
                value={rawAddresses}
                onChange={(event) => setRawAddresses(event.target.value)}
                rows={10}
                placeholder={'100 Sunset Lane, Frisco, TX|200 Lake Road, Dallas, TX'}
                className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950 p-4 font-mono text-xs leading-6 text-cyan-100 outline-none transition placeholder:text-slate-700 focus:border-cyan-300/50"
              />
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Use newline, semicolon, or pipe. Commas inside addresses are preserved.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
              <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                Result Limit
              </label>
              <input
                type="number"
                min={1}
                max={24}
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 p-4 font-mono text-sm text-cyan-100 outline-none transition focus:border-cyan-300/50"
              />
            </div>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm font-bold text-red-100">
                {error}
              </div>
            )}
            {status && (
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-100">
                {status}
              </div>
            )}
            {booting && (
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-4 text-sm font-bold text-cyan-100">
                <span className="inline-flex items-center gap-2"><FaSync className="animate-spin" /> Loading saved hot list...</span>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard icon={<FaListUl />} label="Targets" value={result?.targets.length || 0} />
              <MetricCard icon={<FaCheckCircle />} label="Accepted" value={acceptedCount} tone="green" />
              <MetricCard icon={<FaExclamationTriangle />} label="Rejected" value={rejectedCount} tone="amber" />
            </div>

            <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
              <h2 className="mb-5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-cyan-100">
                <FaImage />
                Accepted MLS Listings
              </h2>
              {result && result.listings.length > 0 ? (
                <div className="grid gap-4">
                  {result.listings.map((listing) => (
                    <article key={listing.id} className="flex gap-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                      <SafePropertyImage
                        src={listing.images?.[0]}
                        alt={`${listing.name} listing photo`}
                        width={128}
                        height={96}
                        className="h-24 w-32 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
                            {listing.source}
                          </span>
                          <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
                            {listing.listing_status}
                          </span>
                        </div>
                        <h3 className="mt-3 truncate text-lg font-black uppercase text-white">{listing.name}</h3>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                          {[listing.location?.street, listing.location?.city, listing.location?.state, listing.location?.zipcode].filter(Boolean).join(', ')}
                        </p>
                        <p className="mt-2 font-mono text-xs text-cyan-200">
                          {listing.mls_id || listing.id} · {formatPrice(listing.list_price ?? listing.price)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState text="Run a preview to see accepted listings." />
              )}
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
              <h2 className="mb-5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-amber-100">
                <FaTimesCircle />
                Rejections
              </h2>
              {result && rejectedCount > 0 ? (
                <div className="space-y-3">
                  {rejectionRows.map((item, index) => (
                    <div key={`${item.reason}-${index}`} className="rounded-2xl border border-amber-300/10 bg-amber-500/5 p-4">
                      <p className="font-mono text-xs text-amber-100">{item.target?.value || item.listingId || 'Unknown target'}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/80">{item.reason.replaceAll('_', ' ')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="No rejected listings yet." />
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone = 'cyan',
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: 'cyan' | 'green' | 'amber';
}) {
  const toneClass = tone === 'green' ? 'text-emerald-200' : tone === 'amber' ? 'text-amber-200' : 'text-cyan-200';
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
      <div className={`mb-3 flex items-center gap-2 text-xs ${toneClass}`}>{icon}</div>
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
      {text}
    </div>
  );
}

function formatPrice(value: number | null | undefined) {
  if (!value) return 'Price unavailable';
  return `$${value.toLocaleString()}`;
}
