'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  PanelRightOpen,
  Radio,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useMatrixBridgeState } from '@/hooks/useMatrixBridgeState';
import {
  getMatrixOrigin,
  PROPERTY_SUBTYPE_OPTIONS,
  type MatrixPayload
} from '@/lib/matrix/matrixMapper';

type BridgeStatus = 'idle' | 'loaded' | 'sent' | 'ack' | 'error';

interface MatrixBridgeConsoleProps {
  matrixUrl: string;
  pulseOrigin: string;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

function formatCurrency(value: number | '') {
  return value === '' ? 'Any' : currencyFormatter.format(value);
}

function getPayloadSize(payload: MatrixPayload) {
  return Object.values(payload).filter((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== '';
  }).length;
}

const MatrixBridgeConsole: React.FC<MatrixBridgeConsoleProps> = ({ matrixUrl, pulseOrigin }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<BridgeStatus>('idle');
  const [lastSyncAt, setLastSyncAt] = useState('');
  const [lastAck, setLastAck] = useState('');
  const [showControls, setShowControls] = useState(false);
  const [showPayload, setShowPayload] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);
  const [handoff, setHandoff] = useState({
    buyerNames: '',
    sellerNames: '',
    propertyAddress: '',
    city: '',
    county: ''
  });
  const router = useRouter();

  const targetOrigin = useMemo(() => getMatrixOrigin(matrixUrl), [matrixUrl]);
  const {
    filters,
    legacyPayload,
    updateFilter,
    togglePropertySubType,
    resetFilters
  } = useMatrixBridgeState();

  const postCriteria = useCallback((reason: 'manual' | 'load' = 'manual') => {
    const frame = iframeRef.current?.contentWindow;
    if (!frame || !targetOrigin) {
      setStatus('error');
        setLastAck('The Matrix frame is not ready yet.');
      return;
    }

    frame.postMessage(
      {
        type: 'PULSE_SYNC_CRITERIA',
        version: 1,
        reason,
        sentAt: new Date().toISOString(),
        data: legacyPayload
      },
      targetOrigin
    );

    setStatus('sent');
    setLastSyncAt(new Date().toLocaleTimeString());
    setLastAck('Criteria sent. Waiting for Matrix listener acknowledgment.');
  }, [legacyPayload, targetOrigin]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== targetOrigin) return;

      if (event.data?.type === 'PULSE_SYNC_ACK') {
        setStatus('ack');
        setLastAck(`${event.data.applied || 0} applied, ${event.data.missing?.length || 0} missing`);
      }

      if (event.data?.type === 'PULSE_SYNC_ERROR') {
        setStatus('error');
        setLastAck(event.data.message || 'Matrix bridge error');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [targetOrigin]);

  const copyPayload = async () => {
    await navigator.clipboard.writeText(JSON.stringify(legacyPayload, null, 2));
    toast.success('Matrix payload copied.');
  };

  const sendToContractSetup = () => {
    const params = new URLSearchParams();
    if (handoff.buyerNames) params.set('buyers', handoff.buyerNames);
    if (handoff.sellerNames) params.set('sellers', handoff.sellerNames);
    if (handoff.propertyAddress) params.set('address', handoff.propertyAddress);
    if (handoff.city) params.set('city', handoff.city);
    if (handoff.county) params.set('county', handoff.county);
    if (!handoff.city && filters.location) params.set('city', filters.location);
    router.push(`/contracts/promulgated/setup?${params.toString()}`);
  };

  const statusLabel = {
    idle: 'Loading Matrix',
    loaded: 'Frame loaded',
    sent: 'Payload sent',
    ack: 'Matrix acknowledged',
    error: 'Bridge warning'
  }[status];

  return (
    <section className="px-3 py-3 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-[1800px] overflow-hidden rounded-lg border border-teal-100/20 bg-[#06141d] shadow-2xl shadow-cyan-950/40">
        <div className="flex flex-col gap-3 border-b border-white/10 bg-[#0c2130]/95 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
            <span className="inline-flex items-center gap-2 rounded-md border border-teal-200/25 bg-teal-200/10 px-3 py-2 text-teal-100">
              <ShieldCheck size={13} />
              {statusLabel}
            </span>
            <span className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-slate-300">
              {getPayloadSize(legacyPayload)} mapped fields
            </span>
            {lastSyncAt && (
              <span className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-slate-300">
                {lastSyncAt}
              </span>
            )}
            {lastAck && (
              <span className="inline-flex items-center gap-2 rounded-md border border-emerald-200/25 bg-emerald-200/10 px-3 py-2 text-emerald-100">
                <CheckCircle2 size={13} />
                {lastAck}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowControls(true)}
              className="inline-flex items-center gap-2 rounded-md bg-teal-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-teal-200"
            >
              <PanelRightOpen size={13} />
                Search Controls
            </button>
            <button
              type="button"
              onClick={() => setShowHandoff((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-md border border-emerald-200/25 bg-emerald-200/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-200/20"
            >
              Send to Contracts
            </button>
            <button
              type="button"
              onClick={() => postCriteria('manual')}
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/10"
            >
              <Radio size={13} />
              Sync
            </button>
            <a
              href={matrixUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-teal-200/25 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-teal-100 transition hover:bg-white/15"
            >
              <ExternalLink size={13} />
              Open Matrix
            </a>
          </div>
        </div>
        {showHandoff && (
          <div className="border-b border-white/10 bg-[#0a1d2a] px-4 py-3">
            <div className="grid gap-2 md:grid-cols-5">
              <input
                value={handoff.buyerNames}
                onChange={(event) => setHandoff((prev) => ({ ...prev, buyerNames: event.target.value }))}
                placeholder="Buyer name(s)"
                className="rounded-md border border-white/15 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-950"
              />
              <input
                value={handoff.sellerNames}
                onChange={(event) => setHandoff((prev) => ({ ...prev, sellerNames: event.target.value }))}
                placeholder="Seller name(s)"
                className="rounded-md border border-white/15 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-950"
              />
              <input
                value={handoff.propertyAddress}
                onChange={(event) => setHandoff((prev) => ({ ...prev, propertyAddress: event.target.value }))}
                placeholder="Property address"
                className="rounded-md border border-white/15 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-950"
              />
              <input
                value={handoff.city}
                onChange={(event) => setHandoff((prev) => ({ ...prev, city: event.target.value }))}
                placeholder="City"
                className="rounded-md border border-white/15 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-950"
              />
              <input
                value={handoff.county}
                onChange={(event) => setHandoff((prev) => ({ ...prev, county: event.target.value }))}
                placeholder="County"
                className="rounded-md border border-white/15 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-950"
              />
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={sendToContractSetup}
                className="rounded-md bg-emerald-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950"
              >
                Open Contract Setup
              </button>
            </div>
          </div>
        )}

        <div className="relative h-[calc(100dvh-220px)] min-h-[760px] bg-white">
          <iframe
            ref={iframeRef}
            src={matrixUrl}
            title="NTREIS Matrix IDX listing search"
            className="h-full w-full"
            frameBorder="0"
            marginWidth={0}
            marginHeight={0}
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => {
              setStatus('loaded');
            }}
          />

          {showControls && (
            <div className="absolute inset-y-0 right-0 z-20 flex w-full justify-end bg-black/35 backdrop-blur-sm">
              <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0c2130] p-4 text-white shadow-2xl shadow-black/40">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-300/15 text-teal-100">
                      <SlidersHorizontal size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-200">
                        Pulse Criteria
                      </p>
                      <h2 className="text-xl font-black uppercase tracking-tight">IDX Search Controls</h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowControls(false)}
                    className="rounded-md border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
                    title="Close controls"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Location</span>
                    <input
                      value={filters.location}
                      onChange={(event) => updateFilter('location', event.target.value)}
                      placeholder="City, county, ZIP, subdivision"
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/95 px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-teal-300"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Min Price</span>
                      <input
                        type="number"
                        value={filters.priceMin}
                        onChange={(event) => updateFilter('priceMin', event.target.value ? Number(event.target.value) : '')}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/95 px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-teal-300"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Max Price</span>
                      <input
                        type="number"
                        value={filters.priceMax}
                        onChange={(event) => updateFilter('priceMax', event.target.value ? Number(event.target.value) : '')}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/95 px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-teal-300"
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                      <span>{formatCurrency(filters.priceMin)}</span>
                      <span>{formatCurrency(filters.priceMax)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="range"
                        min={0}
                        max={2000000}
                        step={25000}
                        value={filters.priceMin === '' ? 0 : filters.priceMin}
                        onChange={(event) => updateFilter('priceMin', Number(event.target.value) || '')}
                        className="w-full accent-teal-300"
                      />
                      <input
                        type="range"
                        min={0}
                        max={3000000}
                        step={25000}
                        value={filters.priceMax === '' ? 0 : filters.priceMax}
                        onChange={(event) => updateFilter('priceMax', Number(event.target.value) || '')}
                        className="w-full accent-amber-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Beds</span>
                      <select
                        value={filters.bedsMin}
                        onChange={(event) => updateFilter('bedsMin', event.target.value ? Number(event.target.value) : '')}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/95 px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-teal-300"
                      >
                        <option value="">Any</option>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value} value={value}>{value}+</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Baths</span>
                      <select
                        value={filters.bathsMin}
                        onChange={(event) => updateFilter('bathsMin', event.target.value ? Number(event.target.value) : '')}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/95 px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-teal-300"
                      >
                        <option value="">Any</option>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value} value={value}>{value}+</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Property Type</p>
                    <div className="flex flex-wrap gap-2">
                      {PROPERTY_SUBTYPE_OPTIONS.map((option) => {
                        const active = filters.propertySubTypes.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => togglePropertySubType(option)}
                            className={`rounded-md border px-3 py-2 text-xs font-bold transition ${
                              active
                                ? 'border-teal-200/50 bg-teal-300/20 text-teal-50'
                                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pool</span>
                      <select
                        value={filters.pool}
                        onChange={(event) => updateFilter('pool', event.target.value as 'Yes' | 'No' | '')}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/95 px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-teal-300"
                      >
                        <option value="">Any</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Min Acres</span>
                      <input
                        type="number"
                        value={filters.acreageMin}
                        onChange={(event) => updateFilter('acreageMin', event.target.value ? Number(event.target.value) : '')}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/95 px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-teal-300"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Max Acres</span>
                      <input
                        type="number"
                        value={filters.acreageMax}
                        onChange={(event) => updateFilter('acreageMax', event.target.value ? Number(event.target.value) : '')}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/95 px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-teal-300"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Keywords</span>
                    <input
                      value={filters.keywords}
                      onChange={(event) => updateFilter('keywords', event.target.value)}
                      placeholder="garage, waterfront, workshop"
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/95 px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-teal-300"
                    />
                  </label>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => postCriteria('manual')}
                    className="flex items-center justify-center gap-2 rounded-lg bg-teal-400 px-3 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-teal-300"
                  >
                    <Radio size={15} />
                    Sync
                  </button>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-100 transition hover:bg-white/10"
                  >
                    <RotateCcw size={15} />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={copyPayload}
                    className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-100 transition hover:bg-white/10"
                  >
                    <Copy size={15} />
                    Copy
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPayload((current) => !current)}
                  className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/10"
                >
                  {showPayload ? 'Hide Field Map' : 'Inspect Field Map'}
                </button>

                {showPayload && (
                  <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/40 p-4 text-xs leading-5 text-teal-100">
                    {JSON.stringify(legacyPayload, null, 2)}
                  </pre>
                )}

                <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-400">
                  <div><span className="font-mono text-teal-200">Allowed parent:</span> {pulseOrigin}</div>
                  <div><span className="font-mono text-teal-200">Target:</span> {targetOrigin || 'unresolved'}</div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default MatrixBridgeConsole;
