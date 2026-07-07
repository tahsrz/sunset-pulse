'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Play, RefreshCcw, Sparkles, Trophy, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  VOLLEY_BALL_RADIUS,
  VOLLEY_COURT_HEIGHT,
  VOLLEY_COURT_WIDTH,
  VOLLEY_GROUND_Y,
  VOLLEY_NET_TOP_Y,
  VOLLEY_NET_X,
  VOLLEY_PLAYER_RADIUS,
  VOLLEY_TARGET_SCORE,
  createVolleyGame,
  getVolleyCommentary,
  serveVolley,
  tickVolley,
  type VolleyGameState,
  type VolleyInput,
} from '@/lib/jamie-games/volley';

const VOLLEY_STATS_KEY = 'sunset_play_jamie_volley_stats';

type VolleyStats = {
  matches: number;
  wins: number;
  losses: number;
};

const EMPTY_STATS: VolleyStats = {
  matches: 0,
  wins: 0,
  losses: 0,
};

export function JamieVolleyGame() {
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const recordedMatchRef = useRef(false);
  const [game, setGame] = useState<VolleyGameState>(() => createVolleyGame());
  const [stats, setStats] = useState<VolleyStats>(EMPTY_STATS);

  useEffect(() => {
    const saved = window.localStorage.getItem(VOLLEY_STATS_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<VolleyStats>;
      setStats({
        matches: Number(parsed.matches) || 0,
        wins: Number(parsed.wins) || 0,
        losses: Number(parsed.losses) || 0,
      });
    } catch {
      setStats(EMPTY_STATS);
    }
  }, []);

  useEffect(() => {
    if (game.status !== 'match-over' || recordedMatchRef.current) return;
    recordedMatchRef.current = true;
    setStats((current) => {
      const humanWon = game.scores.human > game.scores.jamie;
      const next = {
        matches: current.matches + 1,
        wins: current.wins + (humanWon ? 1 : 0),
        losses: current.losses + (humanWon ? 0 : 1),
      };
      window.localStorage.setItem(VOLLEY_STATS_KEY, JSON.stringify(next));
      return next;
    });
  }, [game.scores.human, game.scores.jamie, game.status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const playableCodes = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyW', 'Space'];
      if (!playableCodes.includes(event.code)) return;
      event.preventDefault();
      pressedKeysRef.current.add(event.code);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeysRef.current.delete(event.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (game.status !== 'playing') return;
    const timer = window.setInterval(() => {
      setGame((current) => tickVolley(current, getKeyboardInput(pressedKeysRef.current)));
    }, 1000 / 60);
    return () => window.clearInterval(timer);
  }, [game.status]);

  const serve = useCallback(() => {
    recordedMatchRef.current = false;
    setGame((current) => serveVolley(current));
  }, []);

  const restart = useCallback(() => {
    recordedMatchRef.current = false;
    setGame(createVolleyGame());
  }, []);

  const tapControl = useCallback((input: VolleyInput) => {
    setGame((current) => tickVolley(current, input));
  }, []);

  const commentary = getVolleyCommentary(game);
  const canServe = game.status === 'ready' || game.status === 'point-over';

  return (
    <main className="min-h-screen bg-[#061018] pb-28 text-slate-100">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/play-jamie" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-amber-300 transition hover:text-amber-100">
              <ChevronLeft className="h-4 w-4" /> Play Jamie
            </Link>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              <Waves className="h-8 w-8 text-cyan-300" /> Sunset Volley with Jamie
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              A fast beach rally game: move, jump, spike the ball over the net, and make Jamie defend the sand.
            </p>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] text-center">
            {[
              ['You', game.scores.human],
              ['Jamie', game.scores.jamie],
              ['Rally', game.rally],
            ].map(([label, value]) => (
              <div key={label} className="min-w-20 border-r border-white/10 px-4 py-2 last:border-r-0">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <p className="mt-1 font-mono text-lg font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,1fr)_360px]">
          <section className="overflow-hidden rounded-[2rem] border border-cyan-200/20 bg-sky-950/40 p-3 shadow-[0_30px_120px_rgba(14,165,233,0.14)] sm:p-5">
            <div
              role="application"
              aria-label={`Sunset Volley court. You ${game.scores.human}, Jamie ${game.scores.jamie}.`}
              className="relative aspect-[800/420] w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-sky-300 via-cyan-200 to-amber-100"
            >
              <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-b from-amber-200 to-amber-400" />
              <div className="absolute left-[10%] top-[13%] h-14 w-14 rounded-full bg-amber-200 shadow-[0_0_60px_rgba(253,224,71,0.8)]" />
              <div className="absolute inset-x-0 bottom-[14%] h-px bg-white/30" />
              <div
                className="absolute w-3 rounded-t-full bg-slate-800/80 shadow-[0_0_20px_rgba(15,23,42,0.35)]"
                style={{
                  left: `${toPercentX(VOLLEY_NET_X)}`,
                  top: `${toPercentY(VOLLEY_NET_TOP_Y)}`,
                  height: `${((VOLLEY_GROUND_Y - VOLLEY_NET_TOP_Y) / VOLLEY_COURT_HEIGHT) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              />
              <div
                className="absolute border-l-2 border-r-2 border-white/35"
                style={{
                  left: `${toPercentX(VOLLEY_NET_X)}`,
                  top: `${toPercentY(VOLLEY_NET_TOP_Y)}`,
                  width: '8%',
                  height: `${((VOLLEY_GROUND_Y - VOLLEY_NET_TOP_Y) / VOLLEY_COURT_HEIGHT) * 100}%`,
                  transform: 'translateX(-50%) skewX(-10deg)',
                }}
              />

              <VolleyAvatar body={game.human} label="You" color="from-violet-500 to-cyan-400" />
              <VolleyAvatar body={game.jamie} label="Jamie" color="from-emerald-500 to-amber-300" />
              <div
                aria-label="Volleyball"
                className="absolute rounded-full border-2 border-white bg-white shadow-[0_12px_28px_rgba(15,23,42,0.28)]"
                style={{
                  width: `${toPercentWidth(VOLLEY_BALL_RADIUS * 2)}%`,
                  height: `${toPercentHeight(VOLLEY_BALL_RADIUS * 2)}%`,
                  left: `${toPercentX(game.ball.x)}`,
                  top: `${toPercentY(game.ball.y)}`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span className="absolute inset-1 rounded-full border-l-2 border-cyan-400/70" />
                <span className="absolute inset-1 rounded-full border-r-2 border-amber-400/70" />
              </div>

              {game.status !== 'playing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 p-5 text-center backdrop-blur-sm">
                  <div className="rounded-2xl border border-white/15 bg-slate-950/80 p-6 shadow-2xl">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                      {game.status === 'match-over' ? 'Match over' : canServe ? 'Ready' : 'Point'}
                    </p>
                    <h2 className="mt-3 text-3xl font-black text-white">{game.message}</h2>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      {game.status === 'match-over' ? (
                        <Button onClick={restart}><RefreshCcw className="mr-2 h-4 w-4" /> New match</Button>
                      ) : (
                        <Button onClick={serve}><Play className="mr-2 h-4 w-4" /> Serve</Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-xl border border-cyan-200/15 bg-cyan-400/[0.07] p-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                <Sparkles className="h-4 w-4" /> Jamie says
              </div>
              <p className="mt-4 text-base font-semibold leading-7 text-cyan-50">&ldquo;{commentary}&rdquo;</p>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Controls</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button variant="outline" className="border-white/10 bg-white/[0.03]" onClick={() => tapControl({ left: true })} disabled={game.status !== 'playing'}>Left</Button>
                <Button variant="outline" className="border-white/10 bg-white/[0.03]" onClick={() => tapControl({ jump: true })} disabled={game.status !== 'playing'}>Jump</Button>
                <Button variant="outline" className="border-white/10 bg-white/[0.03]" onClick={() => tapControl({ right: true })} disabled={game.status !== 'playing'}>Right</Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={serve} disabled={!canServe}>
                  <Play className="mr-2 h-4 w-4" /> Serve
                </Button>
                <Button variant="outline" className="border-white/10 bg-white/[0.03]" onClick={restart}>
                  <RefreshCcw className="mr-2 h-4 w-4" /> Restart
                </Button>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Keyboard: arrows or A/D move, W/Up/Space jumps. First to {VOLLEY_TARGET_SCORE} wins.
              </p>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                <Trophy className="h-4 w-4 text-amber-200" /> Local match record
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ['Matches', stats.matches],
                  ['Wins', stats.wins],
                  ['Losses', stats.losses],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="font-mono text-xl font-black text-white">{value}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function VolleyAvatar({ body, label, color }: { body: VolleyGameState['human']; label: string; color: string }) {
  return (
    <div
      aria-label={label}
      className={`absolute rounded-full bg-gradient-to-br ${color} shadow-[0_18px_35px_rgba(15,23,42,0.28)]`}
      style={{
        width: `${toPercentWidth(VOLLEY_PLAYER_RADIUS * 2)}%`,
        height: `${toPercentHeight(VOLLEY_PLAYER_RADIUS * 2)}%`,
        left: `${toPercentX(body.x)}`,
        top: `${toPercentY(body.y)}`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
        {label}
      </span>
    </div>
  );
}

function getKeyboardInput(keys: Set<string>): VolleyInput {
  return {
    left: keys.has('ArrowLeft') || keys.has('KeyA'),
    right: keys.has('ArrowRight') || keys.has('KeyD'),
    jump: keys.has('ArrowUp') || keys.has('KeyW') || keys.has('Space'),
  };
}

function toPercentX(value: number) {
  return (value / VOLLEY_COURT_WIDTH) * 100;
}

function toPercentY(value: number) {
  return (value / VOLLEY_COURT_HEIGHT) * 100;
}

function toPercentWidth(value: number) {
  return (value / VOLLEY_COURT_WIDTH) * 100;
}

function toPercentHeight(value: number) {
  return (value / VOLLEY_COURT_HEIGHT) * 100;
}
