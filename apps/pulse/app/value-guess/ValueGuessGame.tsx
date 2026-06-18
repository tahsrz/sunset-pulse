'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BadgeDollarSign, Flame, Home, RotateCcw, Target, Trophy } from 'lucide-react';
import {
  VALUE_GUESS_DECK,
  ValueGuessListing,
  ValueGuessResult,
  evaluateValueGuess,
  getNextValueGuessStreak,
  getValueGuessStreamListing,
  getValueGuessTotal,
  parseGuessInput
} from '@/lib/value-guess/game';

type PlayedRound = {
  listing: ValueGuessListing;
  result: ValueGuessResult;
};

const HIGH_SCORE_KEY = 'sunset_value_guess_high_score';
const BEST_STREAK_KEY = 'sunset_value_guess_best_streak';

export default function ValueGuessGame() {
  const [listingStream, setListingStream] = useState<ValueGuessListing[]>(VALUE_GUESS_DECK);
  const [streamSource, setStreamSource] = useState('curated-fallback');
  const [streamLoading, setStreamLoading] = useState(true);
  const [roundIndex, setRoundIndex] = useState(0);
  const [guessInput, setGuessInput] = useState('');
  const [currentResult, setCurrentResult] = useState<ValueGuessResult | null>(null);
  const [playedRounds, setPlayedRounds] = useState<PlayedRound[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const currentListing = getValueGuessStreamListing(roundIndex, listingStream);
  const totalScore = useMemo(() => getValueGuessTotal(playedRounds.map((round) => round.result)), [playedRounds]);
  const busts = playedRounds.filter((round) => round.result.wentOver).length;
  const visibleScore = currentResult ? totalScore + currentResult.roundScore : totalScore;
  const visibleStreak = currentResult ? getNextValueGuessStreak(currentResult, currentStreak) : currentStreak;
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

    fetch('/api/value-guess/listings?limit=60', { cache: 'no-store' })
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
        console.warn('[VALUE_GUESS_STREAM_FALLBACK]', error);
      })
      .finally(() => {
        if (!cancelled) setStreamLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const submitGuess = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentListing || currentResult) return;

    const guess = parseGuessInput(guessInput);
    if (guess <= 0) return;
    setCurrentResult(evaluateValueGuess(currentListing.actualValue, guess));
  };

  const nextRound = () => {
    if (!currentListing || !currentResult) return;
    const nextScore = totalScore + currentResult.roundScore;
    const nextStreak = getNextValueGuessStreak(currentResult, currentStreak);

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
    setGuessInput('');
    setCurrentResult(null);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const restart = () => {
    setRoundIndex(0);
    setGuessInput('');
    setCurrentResult(null);
    setPlayedRounds([]);
    setCurrentStreak(0);
  };

  return (
    <main className="min-h-screen bg-[#071013] pb-48 text-slate-100">
      <section className="mx-auto grid min-h-[calc(100vh-112px)] max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1.3fr),minmax(360px,0.7fr)]">
        <div className="overflow-hidden border border-white/10 bg-black">
          <div className="relative aspect-[16/9] min-h-[360px] max-h-[620px]">
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
                  <h1 className="mt-4 text-3xl font-black text-white md:text-5xl">{currentListing.title}</h1>
                  <p className="mt-2 text-sm font-bold text-slate-200">
                    {currentListing.city}, {currentListing.county} County
                  </p>
                </div>
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

        <aside className="space-y-4">
          <div className="border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Value Guess</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Endless stream. Closest without going over keeps the streak alive.</p>
              </div>
              <Trophy className="h-7 w-7 text-amber-200" />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <SummaryStat label="Current" value={String(visibleStreak)} />
              <SummaryStat label="Best" value={String(visibleBestStreak)} />
              <SummaryStat label="Busts" value={String(busts + (currentResult?.wentOver ? 1 : 0))} />
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

          <form onSubmit={submitGuess} className="border border-white/10 bg-white/[0.04] p-5">
            <label htmlFor="value-guess" className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Your Value
            </label>
            <div className="mt-3 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <BadgeDollarSign className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  id="value-guess"
                  value={guessInput}
                  onChange={(event) => setGuessInput(formatGuessInput(event.target.value))}
                  inputMode="numeric"
                  disabled={Boolean(currentResult)}
                  className="min-h-12 w-full rounded border border-white/10 bg-black/35 pl-10 pr-3 text-lg font-black text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200 disabled:opacity-70"
                  placeholder="$425,000"
                />
              </div>
              <button
                type="submit"
                disabled={Boolean(currentResult) || parseGuessInput(guessInput) <= 0}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-cyan-300 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-45"
              >
                <Target className="h-4 w-4" />
                Lock
              </button>
            </div>
          </form>

          {currentResult && (
            <div className={`border p-5 ${currentResult.wentOver ? 'border-red-300/30 bg-red-500/10' : 'border-emerald-300/25 bg-emerald-500/10'}`}>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-300">
                {currentResult.wentOver ? 'Bust' : resultCopy(currentResult.label)}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <SummaryStat label="Actual" value={formatCurrency(currentResult.actualValue)} />
                <SummaryStat label="Gap" value={formatCurrency(currentResult.difference)} />
                <SummaryStat label="Round" value={currentResult.roundScore.toLocaleString()} />
                <SummaryStat label="Off By" value={`${Math.round(currentResult.percentOff * 1000) / 10}%`} />
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-200">
                <Flame className="h-4 w-4 text-amber-200" />
                {currentResult.wentOver ? 'Streak reset.' : `Streak climbs to ${visibleStreak}.`}
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
                  <div key={`${round.listing.id}-${round.result.guess}-${index}`} className="grid grid-cols-[1fr,auto] gap-3 border border-white/10 bg-black/20 p-3">
                    <div>
                      <p className="text-sm font-black text-white">{round.listing.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatCurrency(round.result.guess)} vs {formatCurrency(round.result.actualValue)}
                      </p>
                    </div>
                    <div className={`self-center rounded px-2 py-1 text-xs font-black ${round.result.wentOver ? 'bg-red-400/15 text-red-100' : 'bg-emerald-300/15 text-emerald-100'}`}>
                      {round.result.wentOver ? 'Bust' : `+${round.result.roundScore}`}
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

function formatGuessInput(value: string) {
  const parsed = parseGuessInput(value);
  return parsed ? formatCurrency(parsed) : '';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function resultCopy(label: ValueGuessResult['label']) {
  switch (label) {
    case 'perfect':
      return 'Perfect';
    case 'sharp':
      return 'Sharp Read';
    case 'safe':
      return 'Safe Bid';
    default:
      return 'Under, But Wide';
  }
}
