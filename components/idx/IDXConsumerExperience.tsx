'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const FALLBACK_DELAY_MS = 4500;

interface IDXConsumerExperienceProps {
  matrixUrl: string;
}

export default function IDXConsumerExperience({ matrixUrl }: IDXConsumerExperienceProps) {
  const searchParams = useSearchParams();
  const [listingReference, setListingReference] = useState('');
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [sentPrompt, setSentPrompt] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  
  // Initialize from URL params if present
  const [dynamicUrl, setDynamicUrl] = useState(() => {
    const url = new URL(matrixUrl);
    if (searchParams) {
      searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
  });

  const buildMatrixUrl = (params: any) => {
    const url = new URL(matrixUrl);
    // Common Matrix/IDX parameter guesses - these often vary by setup
    if (params.city) url.searchParams.set('City', params.city);
    if (params.zipcode) url.searchParams.set('Zip', params.zipcode);
    if (params.price_min) url.searchParams.set('MinPrice', params.price_min.toString());
    if (params.price_max) url.searchParams.set('MaxPrice', params.price_max.toString());
    if (params.beds_min) url.searchParams.set('Beds', params.beds_min.toString());
    if (params.full_baths_min) url.searchParams.set('Baths', params.full_baths_min.toString());
    
    return url.toString();
  };

  useEffect(() => {
    const handleJamieToolCall = (event: any) => {
      const { tool, parameters } = event.detail;
      if (tool === 'search_properties') {
        console.log('🚀 [JAMIE_TOOL] Search Properties Triggered:', parameters);
        const newUrl = buildMatrixUrl(parameters);
        setDynamicUrl(newUrl);
        setFrameLoaded(false); // Reset loading state for new URL
      }
    };

    window.addEventListener('sunsetpulse:jamie-tool-call', handleJamieToolCall);
    return () => window.removeEventListener('sunsetpulse:jamie-tool-call', handleJamieToolCall);
  }, [matrixUrl]);

  useEffect(() => {
    if (frameLoaded) return;

    const timer = window.setTimeout(() => setShowFallback(true), FALLBACK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [frameLoaded]);

  const baseJamiePrompt = useMemo(() => {
    const reference = listingReference.trim();
    if (!reference) return '';

    return [
      `I found this listing in the NTREIS Matrix IDX search: ${reference}.`,
      'Use the resolved MLS listing data attached to this question as your source of truth.',
      'Help me evaluate it using property-specific factors like price, taxes, HOA, condition, commute fit, financing, flood risk, and resale flexibility.',
      'Do not rank neighborhoods or use demographics, crime, or protected-class proxies.',
    ].join(' ');
  }, [listingReference]);

  const sendToJamie = async () => {
    if (!baseJamiePrompt || isResolving) return;

    setIsResolving(true);
    setResolveError('');

    let listingData = null;

    try {
      const response = await fetch('/api/idx/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: listingReference.trim() }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Could not resolve that MLS listing.');
      }

      listingData = payload?.data?.listing || null;
    } catch (error: any) {
      setResolveError(error?.message || 'Could not resolve that MLS listing.');
      setIsResolving(false);
      return;
    }

    window.dispatchEvent(
      new CustomEvent('sunsetpulse:jamie-prompt', {
        detail: {
          prompt: baseJamiePrompt,
          propertyData: listingData,
        },
      }),
    );

    try {
      await navigator.clipboard?.writeText(baseJamiePrompt);
    } catch {
      // Clipboard is a convenience only; Jamie still receives the prompt event.
    }

    setIsResolving(false);
    setSentPrompt(true);
    window.setTimeout(() => setSentPrompt(false), 2600);
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-4 px-3 py-3 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="h-[calc(100dvh-220px)] min-h-[680px] overflow-hidden rounded-lg border border-teal-100/20 bg-white shadow-2xl shadow-cyan-950/40">
        <iframe
          src={dynamicUrl}
          title="NTREIS Matrix IDX listing search"
          className="h-full w-full"
          frameBorder="0"
          marginWidth={0}
          marginHeight={0}
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => {
            setFrameLoaded(true);
            setShowFallback(false);
          }}
        />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-lg border border-teal-100/20 bg-white/[0.06] p-4 shadow-xl shadow-cyan-950/25 backdrop-blur">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-200">
            After You Search
          </p>
          <h2 className="mt-2 text-lg font-black uppercase tracking-tight text-white">
            Ask Jamie About A Home
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Paste an MLS number from Matrix and Jamie will run a separate lookup through
            the approved MLS provider before helping you compare the home.
          </p>

          <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            Address or MLS number
          </label>
          <input
            value={listingReference}
            onChange={(event) => {
              setListingReference(event.target.value);
              setResolveError('');
            }}
            placeholder="123 Main St or MLS #"
            className="mt-2 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-teal-200/60 focus:ring-4 focus:ring-teal-200/10"
          />
          <button
            type="button"
            onClick={sendToJamie}
            disabled={!baseJamiePrompt || isResolving}
            className="mt-3 w-full rounded-md border border-teal-200/25 bg-teal-200/15 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-teal-100 transition hover:bg-teal-200/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isResolving ? 'Resolving MLS Data' : sentPrompt ? 'Ready In Jamie' : 'Resolve And Ask Jamie'}
          </button>
          {resolveError && (
            <p className="mt-3 rounded-md border border-amber-100/20 bg-amber-100/10 px-3 py-2 text-xs leading-5 text-amber-50">
              {resolveError}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-rose-100/20 bg-rose-100/[0.06] p-4 text-sm leading-6 text-rose-50/90">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-100">
            Search Guidance
          </p>
          <p className="mt-2">
            Focus on the home, the numbers, and your own practical fit. Sunset Pulse keeps
            guidance tied to property details, infrastructure, costs, and tradeoffs.
          </p>
        </div>

        {showFallback && (
          <div className="rounded-lg border border-amber-100/25 bg-amber-100/[0.08] p-4 text-sm leading-6 text-amber-50">
            <p className="font-bold">Matrix is taking a moment to load.</p>
            <a
              href={matrixUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-md border border-amber-100/25 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-50 transition hover:bg-white/15"
            >
              Open Matrix Search
            </a>
          </div>
        )}
      </aside>
    </section>
  );
}
