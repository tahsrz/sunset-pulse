'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, CircleDollarSign, RefreshCcw, Sparkles, Spade, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PokerCard } from '@/components/jamie-games/PokerCard';
import {
  createPokerGame,
  getJamiePokerCommentary,
  getPokerStageLabel,
  getSuggestedPokerBet,
  humanPokerAction,
  startNextPokerHand,
  type PokerAction,
  type PokerGameState,
  type RandomSource,
} from '@/lib/jamie-games/poker';

const POKER_STATS_KEY = 'sunset_play_jamie_poker_stats';

type PokerStats = {
  hands: number;
  wins: number;
  losses: number;
  ties: number;
};

type JamiePokerGameProps = {
  random?: RandomSource;
};

const EMPTY_STATS: PokerStats = {
  hands: 0,
  wins: 0,
  losses: 0,
  ties: 0,
};

export function JamiePokerGame({ random }: JamiePokerGameProps) {
  const randomRef = useRef<RandomSource>(random ?? Math.random);
  const recordedHandsRef = useRef<Set<number>>(new Set());
  const [game, setGame] = useState<PokerGameState>(() => createPokerGame({ random: randomRef.current }));
  const [stats, setStats] = useState<PokerStats>(EMPTY_STATS);

  useEffect(() => {
    const saved = window.localStorage.getItem(POKER_STATS_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<PokerStats>;
      setStats({
        hands: Number(parsed.hands) || 0,
        wins: Number(parsed.wins) || 0,
        losses: Number(parsed.losses) || 0,
        ties: Number(parsed.ties) || 0,
      });
    } catch {
      setStats(EMPTY_STATS);
    }
  }, []);

  useEffect(() => {
    if (game.status !== 'hand-over' || !game.lastWinner || recordedHandsRef.current.has(game.handNumber)) return;
    recordedHandsRef.current.add(game.handNumber);
    setStats((current) => {
      const next = {
        hands: current.hands + 1,
        wins: current.wins + (game.lastWinner === 'human' ? 1 : 0),
        losses: current.losses + (game.lastWinner === 'jamie' ? 1 : 0),
        ties: current.ties + (game.lastWinner === 'tie' ? 1 : 0),
      };
      window.localStorage.setItem(POKER_STATS_KEY, JSON.stringify(next));
      return next;
    });
  }, [game.handNumber, game.lastWinner, game.status]);

  const takeAction = useCallback((action: PokerAction) => {
    setGame((current) => humanPokerAction(current, action, randomRef.current));
  }, []);

  const nextHand = useCallback(() => {
    setGame((current) => startNextPokerHand(current, randomRef.current));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (game.status === 'hand-over') {
        if (event.code === 'KeyN') {
          event.preventDefault();
          nextHand();
        }
        return;
      }

      const controls: Record<string, PokerAction> = {
        KeyC: game.toCall > 0 ? 'call' : 'check',
        KeyB: 'bet',
        KeyF: 'fold',
      };
      const action = controls[event.code];
      if (!action) return;
      event.preventDefault();
      takeAction(action);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game.status, game.toCall, nextHand, takeAction]);

  const visibleJamieCards = game.status === 'hand-over';
  const suggestedBet = getSuggestedPokerBet(game);
  const commentary = getJamiePokerCommentary(game);
  const showdownText = useMemo(() => {
    if (!game.lastShowdown) return null;
    return `You: ${game.lastShowdown.human.label}. Jamie: ${game.lastShowdown.jamie.label}.`;
  }, [game.lastShowdown]);

  return (
    <main className="min-h-screen bg-[#050a08] pb-28 text-slate-100">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/play-jamie" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-300 transition hover:text-emerald-100">
              <ChevronLeft className="h-4 w-4" /> Play Jamie
            </Link>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              <Spade className="h-8 w-8 text-emerald-300" /> Texas Hold&apos;em with Jamie
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Heads-up Hold&apos;em with virtual chips, real hand ranking, lightweight betting, and Jamie reading the room like a suspiciously charming dealer.
            </p>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] text-center">
            {[
              ['Pot', game.pot],
              ['You', game.stacks.human],
              ['Jamie', game.stacks.jamie],
            ].map(([label, value]) => (
              <div key={label} className="min-w-20 border-r border-white/10 px-4 py-2 last:border-r-0">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <p className="mt-1 font-mono text-lg font-black text-white">{Number(value).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,1fr)_360px]">
          <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200/20 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.26),rgba(6,78,59,0.2)_42%,rgba(2,6,23,0.96)_76%)] p-4 shadow-[0_30px_120px_rgba(16,185,129,0.12)] sm:p-6">
            <div className="absolute inset-6 rounded-[2rem] border border-emerald-100/10" />

            <div className="relative z-10 grid gap-7">
              <PlayerRail
                label="Jamie"
                stack={game.stacks.jamie}
                cards={game.jamieHole}
                hidden={!visibleJamieCards}
                align="top"
              />

              <section className="rounded-[2rem] border border-emerald-100/15 bg-black/30 p-4 backdrop-blur-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
                    {getPokerStageLabel(game.stage)}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-300/10 px-3 py-1 font-mono text-sm font-black text-amber-100">
                    <CircleDollarSign className="h-4 w-4" /> Pot {game.pot.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2 sm:gap-3" aria-label="Community cards">
                  {Array.from({ length: 5 }, (_, index) => (
                    <PokerCard
                      key={index}
                      card={game.community[index]}
                      hidden={!game.community[index]}
                      label={game.community[index] ? `Community card ${index + 1}` : `Empty community card ${index + 1}`}
                    />
                  ))}
                </div>

                <p className="mt-5 min-h-12 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-semibold leading-6 text-slate-200">
                  {game.message}
                  {showdownText ? <span className="mt-1 block text-emerald-200">{showdownText}</span> : null}
                </p>
              </section>

              <PlayerRail
                label="You"
                stack={game.stacks.human}
                cards={game.humanHole}
                hidden={false}
                align="bottom"
              />
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-xl border border-emerald-200/15 bg-emerald-400/[0.07] p-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
                <Sparkles className="h-4 w-4" /> Jamie says
              </div>
              <p className="mt-4 text-base font-semibold leading-7 text-emerald-50">&ldquo;{commentary}&rdquo;</p>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Your move</p>
              <div className="mt-4 grid gap-2">
                {game.status === 'hand-over' ? (
                  <Button className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={nextHand}>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Deal next hand
                  </Button>
                ) : game.toCall > 0 ? (
                  <>
                    <Button className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={() => takeAction('call')}>
                      Call {game.toCall}
                    </Button>
                    <Button variant="outline" className="w-full border-rose-200/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20" onClick={() => takeAction('fold')}>
                      Fold
                    </Button>
                  </>
                ) : (
                  <>
                    <Button className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={() => takeAction('check')}>
                      Check
                    </Button>
                    <Button variant="outline" className="w-full border-amber-200/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20" onClick={() => takeAction('bet')} disabled={suggestedBet <= 0}>
                      Bet {suggestedBet}
                    </Button>
                  </>
                )}
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Keyboard: C checks/calls, B bets, F folds, and N deals the next hand after showdown.
              </p>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                <Trophy className="h-4 w-4 text-amber-200" /> Local record
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {[
                  ['Hands', stats.hands],
                  ['Wins', stats.wins],
                  ['Losses', stats.losses],
                  ['Ties', stats.ties],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="font-mono text-xl font-black text-white">{value}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Hand log</p>
              <ol className="mt-4 max-h-52 space-y-2 overflow-y-auto text-xs leading-5 text-slate-400">
                {game.log.slice(-8).map((entry, index) => (
                  <li key={`${entry}-${index}`} className="rounded-lg bg-black/20 px-3 py-2">{entry}</li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

type PlayerRailProps = {
  label: string;
  stack: number;
  cards: PokerGameState['humanHole'];
  hidden: boolean;
  align: 'top' | 'bottom';
};

function PlayerRail({ label, stack, cards, hidden, align }: PlayerRailProps) {
  return (
    <section className={`flex flex-wrap items-center justify-between gap-4 ${align === 'top' ? '' : 'sm:flex-row-reverse'}`}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
        <p className="mt-1 font-mono text-2xl font-black text-white">{stack.toLocaleString()}</p>
      </div>
      <div className="flex gap-2">
        {cards.map((card, index) => (
          <PokerCard key={`${card.rank}-${card.suit}`} card={card} hidden={hidden} label={`${label} card ${index + 1}`} />
        ))}
      </div>
    </section>
  );
}
