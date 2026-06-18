'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Flame, Home, MapPin, RotateCcw, Target, Trophy } from 'lucide-react';
import Map, { Marker, ViewStateChangeEvent } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  LOCATION_GUESS_DECK,
  LocationGuessListing,
  LocationGuessResult,
  evaluateLocationGuess,
  getLocationGuessStreamListing,
  getLocationGuessTotal
} from '@/lib/location-guess/game';

type PlayedRound = {
  listing: LocationGuessListing;
  result: LocationGuessResult;
};

const HIGH_SCORE_KEY = 'sunset_location_guess_high_score';
const BEST_STREAK_KEY = 'sunset_location_guess_best_streak';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MONTAGUE_CENTER: [number, number] = [-97.72, 33.66]; // Approx center of Montague County

export default function LocationGuessGame() {
  const [listingStream, setListingStream] = useState<LocationGuessListing[]>(LOCATION_GUESS_DECK);
  const [streamSource, setStreamSource] = useState('curated-fallback');
  const [streamLoading, setStreamLoading] = useState(true);
  const [roundIndex, setRoundIndex] = useState(0);
  
  const [guessCoordinates, setGuessCoordinates] = useState<[number, number] | null>(null);
  const [currentResult, setCurrentResult] = useState<LocationGuessResult | null>(null);
  
  const [playedRounds, setPlayedRounds] = useState<PlayedRound[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const [viewState, setViewState] = useState({
    longitude: MONTAGUE_CENTER[0],
    latitude: MONTAGUE_CENTER[1],
    zoom: 8.5
  });

  const currentListing = getLocationGuessStreamListing(roundIndex, listingStream);

  const totalScore = useMemo(() => getLocationGuessTotal(playedRounds.map((round) => round.result)), [playedRounds]);
  const visibleScore = currentResult ? totalScore + currentResult.roundScore : totalScore;
  const wentOver = currentResult ? currentResult.label === 'lost' : false; // For this game, let's say 'lost' resets streak
  const visibleStreak = currentResult && !wentOver ? currentStreak + 1 : currentResult && wentOver ? 0 : currentStreak;
  const visibleBestStreak = Math.max(bestStreak, visibleStreak);
  const recentRounds = playedRounds.slice(-5).reverse();

  useEffect(() => {
    const saved = window.localStorage.getItem(HIGH_SCORE_KEY);
    const savedStreak = window.localStorage.getItem(BEST_STREAK_KEY);
    setHighScore(saved ? Number(saved) || 0 : 0);
    setBestStreak(savedStreak ? Number(savedStreak) || 0 : 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/location-guess/listings?limit=60', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return;
        const nextListings = Array.isArray(payload?.data?.listings) ? payload.data.listings : [];
        if (nextListings.length > 0) {
          setListingStream(nextListings);
          setStreamSource(payload.data.source || 'property-grid');
          setRoundIndex(0);
        }
      })
      .catch((error) => {
        console.warn('[LOCATION_GUESS_STREAM_FALLBACK]', error);
      })
      .finally(() => {
        if (!cancelled) setStreamLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleMapClick = (e: any) => {
    if (currentResult) return;
    setGuessCoordinates([e.lngLat.lng, e.lngLat.lat]);
  };

  const submitGuess = () => {
    if (!currentListing || currentResult || !guessCoordinates) return;
    const result = evaluateLocationGuess(currentListing.actualCoordinates, guessCoordinates);
    setCurrentResult(result);
  };

  const nextRound = () => {
    if (!currentListing || !currentResult) return;
    const nextScore = totalScore + currentResult.roundScore;
    const isBust = currentResult.label === 'lost';
    const nextStreak = isBust ? 0 : currentStreak + 1;

    if (nextScore > highScore) {
      setHighScore(nextScore);
      window.localStorage.setItem(HIGH_SCORE_KEY, String(nextScore));
    }
    if (nextStreak > bestStreak) {
      setBestStreak(nextStreak);
      window.localStorage.setItem(BEST_STREAK_KEY, String(nextStreak));
    }

    setPlayedRounds((rounds) => [...rounds, { listing: currentListing, result: currentResult }]);
    setCurrentStreak(nextStreak);
    setRoundIndex((index) => index + 1);
    
    // Reset state for next round
    setGuessCoordinates(null);
    setCurrentResult(null);
    setViewState({ longitude: MONTAGUE_CENTER[0], latitude: MONTAGUE_CENTER[1], zoom: 8.5 });
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const restart = () => {
    setRoundIndex(0);
    setGuessCoordinates(null);
    setCurrentResult(null);
    setPlayedRounds([]);
    setCurrentStreak(0);
    setViewState({ longitude: MONTAGUE_CENTER[0], latitude: MONTAGUE_CENTER[1], zoom: 8.5 });
  };

  return (
    <main className="min-h-screen bg-[#071013] pb-48 text-slate-100">
      <section className="mx-auto grid min-h-[calc(100vh-112px)] max-w-[1600px] gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr),minmax(360px,0.4fr)]">
        <div className="flex flex-col gap-5">
          {/* Property Image Hero */}
          <div className="relative aspect-[16/6] min-h-[260px] overflow-hidden border border-white/10 bg-black lg:aspect-[16/7]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentListing.image}
              alt={currentListing.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 rounded bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-cyan-100 backdrop-blur">
                    <Home className="h-4 w-4" />
                    Listing {roundIndex + 1}
                  </p>
                  <p className="mt-3 inline-flex rounded bg-black/45 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 backdrop-blur">
                    {streamLoading ? 'Loading Feed' : streamSourceLabel(streamSource, listingStream.length)}
                  </p>
                  <h1 className="mt-4 text-3xl font-black text-white md:text-4xl">{currentListing.title}</h1>
                </div>
                <div className="flex gap-3">
                  <div className="rounded bg-black/55 px-4 py-3 text-right backdrop-blur">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Score</p>
                    <p className="text-2xl font-black text-white">{visibleScore.toLocaleString()}</p>
                  </div>
                  <div className="rounded bg-black/55 px-4 py-3 text-right backdrop-blur">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Streak</p>
                    <p className="text-2xl font-black text-amber-100">{visibleStreak}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Area */}
          <div className="relative flex-1 overflow-hidden border border-white/10 bg-black min-h-[400px]">
            <Map
              {...viewState}
              onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
              mapboxAccessToken={MAPBOX_TOKEN}
              mapStyle="mapbox://styles/mapbox/dark-v11"
              onClick={handleMapClick}
              cursor={currentResult ? 'default' : 'crosshair'}
            >
              {guessCoordinates && (
                <Marker longitude={guessCoordinates[0]} latitude={guessCoordinates[1]} anchor="bottom">
                  <div className="relative -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.6)]">
                    <MapPin className="h-4 w-4" />
                  </div>
                </Marker>
              )}
              {currentResult && (
                <Marker longitude={currentResult.actualCoordinates[0]} latitude={currentResult.actualCoordinates[1]} anchor="bottom">
                  <div className="relative -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.6)]">
                    <Target className="h-4 w-4" />
                  </div>
                </Marker>
              )}
              
              {/* Optional: Draw a line between guess and actual if result exists */}
              {/* Requires extra mapbox source/layer config, skipping for simplicity unless needed */}
            </Map>

            {!currentResult && (
              <div className="pointer-events-none absolute left-0 top-0 flex w-full justify-center p-4">
                <div className="rounded-full bg-black/60 px-4 py-2 text-sm font-bold text-white backdrop-blur">
                  Click on the map to guess the location
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Geo Guess</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Pinpoint the property. Stay within 30 miles to keep the streak.</p>
              </div>
              <Trophy className="h-7 w-7 text-amber-200" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <SummaryStat label="Current Streak" value={String(visibleStreak)} />
              <SummaryStat label="Best Streak" value={String(visibleBestStreak)} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Stat label="Beds" value={currentListing.beds ? String(currentListing.beds) : 'N/A'} />
              <Stat label="Baths" value={currentListing.baths ? String(currentListing.baths) : 'N/A'} />
              <Stat label="Sq Ft" value={currentListing.squareFeet ? currentListing.squareFeet.toLocaleString() : 'N/A'} />
              <Stat label="Acres" value={currentListing.acreage ? String(currentListing.acreage) : 'N/A'} />
              <Stat label="Built" value={currentListing.yearBuilt ? String(currentListing.yearBuilt) : 'N/A'} />
              <Stat label="Type" value={currentListing.propertyType} />
            </div>
            <div className="mt-4 border border-cyan-200/15 bg-cyan-200/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">Market Signal</p>
              <p className="mt-2 text-sm leading-6 text-cyan-50">{currentListing.signal}</p>
            </div>
          </div>

          <div className="border border-white/10 bg-white/[0.04] p-5">
            <button
              type="button"
              onClick={submitGuess}
              disabled={Boolean(currentResult) || !guessCoordinates}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded bg-cyan-300 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-45"
            >
              <MapPin className="h-4 w-4" />
              Lock Coordinates
            </button>
          </div>

          {currentResult && (
            <div className={`border p-5 ${currentResult.label === 'lost' ? 'border-red-300/30 bg-red-500/10' : 'border-emerald-300/25 bg-emerald-500/10'}`}>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-300">
                {resultCopy(currentResult.label)}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <SummaryStat label="Distance" value={`${currentResult.distanceMiles} mi`} />
                <SummaryStat label="Round Score" value={`+${currentResult.roundScore}`} />
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-200">
                <Flame className="h-4 w-4 text-amber-200" />
                {currentResult.label === 'lost' ? 'Streak reset (over 30 mi).' : `Streak climbs to ${visibleStreak}.`}
              </p>
              <button
                type="button"
                onClick={nextRound}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-50"
              >
                Next Listing
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {recentRounds.length > 0 && (
            <div className="border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Recent Stream</p>
                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 transition hover:border-cyan-200 hover:text-white"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {recentRounds.map((round, index) => (
                  <div key={`${round.listing.id}-${index}`} className="grid grid-cols-[1fr,auto] gap-3 border border-white/10 bg-black/20 p-3">
                    <div>
                      <p className="text-sm font-black text-white">{round.listing.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {round.result.distanceMiles} miles off
                      </p>
                    </div>
                    <div className={`self-center rounded px-2 py-1 text-xs font-black ${round.result.label === 'lost' ? 'bg-red-400/15 text-red-100' : 'bg-emerald-300/15 text-emerald-100'}`}>
                      {round.result.label === 'lost' ? 'Lost' : `+${round.result.roundScore}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function streamSourceLabel(source: string, count: number) {
  const label = source === 'property-grid' ? 'Property Grid' : 'Curated Fallback';
  return `${label} / ${count} cards`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function resultCopy(label: LocationGuessResult['label']) {
  switch (label) {
    case 'bullseye': return 'Bullseye! (Under 1 mile)';
    case 'close': return 'Close! (Under 5 miles)';
    case 'neighborhood': return 'Right Neighborhood (Under 15 miles)';
    case 'county': return 'Right County (Under 30 miles)';
    default: return 'Lost in the Woods (Over 30 miles)';
  }
}
