'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronsDown,
  Layers3,
  Pause,
  Play,
  RefreshCcw,
  RotateCw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TetrisControlButton } from '@/components/jamie-games/TetrisControlButton';
import {
  TETRIS_BOARD_HEIGHT,
  TETRIS_BOARD_WIDTH,
  createTetrominoBag,
  createTetrisGame,
  getGhostTetromino,
  getTetrisDropInterval,
  getTetrisPreview,
  getTetrominoCells,
  hardDropTetromino,
  lockTetromino,
  moveTetromino,
  rotateTetromino,
  type TetrisGameState,
  type TetrominoType,
} from '@/lib/jamie-games/tetris';

const HIGH_SCORE_KEY = 'sunset_play_jamie_tetris_high_score';

const PIECE_COLORS: Record<TetrominoType, string> = {
  I: '#22d3ee',
  J: '#60a5fa',
  L: '#fb923c',
  O: '#facc15',
  S: '#4ade80',
  T: '#c084fc',
  Z: '#fb7185',
};

function createFreshGame() {
  const pieces = [...createTetrominoBag(), ...createTetrominoBag()];
  const [first, next, ...queue] = pieces;
  return createTetrisGame(first, next, queue);
}

export function JamieTetrisGame() {
  const [game, setGame] = useState<TetrisGameState>(createFreshGame);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(HIGH_SCORE_KEY));
    if (Number.isFinite(saved) && saved > 0) setHighScore(saved);
  }, []);

  useEffect(() => {
    if (game.score <= highScore) return;
    setHighScore(game.score);
    window.localStorage.setItem(HIGH_SCORE_KEY, String(game.score));
  }, [game.score, highScore]);

  useEffect(() => {
    if (game.queue.length > 7) return;
    const refill = createTetrominoBag();
    setGame((current) => (
      current.queue.length <= 7
        ? { ...current, queue: [...current.queue, ...refill] }
        : current
    ));
  }, [game.queue.length]);

  const stepDown = useCallback((softDrop = false) => {
    setGame((current) => {
      const moved = moveTetromino(current, 0, 1);
      if (moved) return softDrop ? { ...moved, score: moved.score + 1 } : moved;
      if (current.status !== 'playing') return current;
      return lockTetromino(current);
    });
  }, []);

  const moveSideways = useCallback((direction: -1 | 1) => {
    setGame((current) => moveTetromino(current, direction, 0) ?? current);
  }, []);

  const rotate = useCallback(() => {
    setGame((current) => rotateTetromino(current) ?? current);
  }, []);

  const hardDrop = useCallback(() => {
    setGame((current) => (
      current.status === 'playing' ? hardDropTetromino(current) : current
    ));
  }, []);

  const togglePause = useCallback(() => {
    setGame((current) => {
      if (current.status === 'game-over') return current;
      return { ...current, status: current.status === 'paused' ? 'playing' : 'paused' };
    });
  }, []);

  const restart = useCallback(() => setGame(createFreshGame()), []);

  useEffect(() => {
    if (game.status !== 'playing') return;
    const timer = window.setInterval(() => stepDown(), getTetrisDropInterval(game.level));
    return () => window.clearInterval(timer);
  }, [game.level, game.status, stepDown]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      const controls: Record<string, () => void> = {
        ArrowLeft: () => moveSideways(-1),
        ArrowRight: () => moveSideways(1),
        ArrowDown: () => stepDown(true),
        ArrowUp: rotate,
        Space: hardDrop,
        KeyP: togglePause,
        KeyR: restart,
      };
      const control = controls[event.code];
      if (!control) return;
      event.preventDefault();
      control();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hardDrop, moveSideways, restart, rotate, stepDown, togglePause]);

  const visibleBoard = useMemo(() => {
    const active = new Map(getTetrominoCells(game.current).map(([x, y]) => [`${x}:${y}`, game.current.type]));
    const ghostPiece = getGhostTetromino(game.board, game.current);
    const ghost = new Set(getTetrominoCells(ghostPiece).map(([x, y]) => `${x}:${y}`));

    return game.board.flatMap((row, y) => row.map((locked, x) => {
      const key = `${x}:${y}`;
      const type = locked ?? active.get(key) ?? null;
      return { key, type, ghost: !type && ghost.has(key) };
    }));
  }, [game]);

  const previewCells = useMemo(
    () => new Set(getTetrisPreview(game.next).map(([x, y]) => `${x}:${y}`)),
    [game.next]
  );

  const commentary = getJamieTetrisCommentary(game);

  return (
    <main className="min-h-screen bg-[#060913] pb-28 text-slate-100">
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/play-jamie" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-violet-300 transition hover:text-violet-100">
              <ChevronLeft className="h-4 w-4" /> Play Jamie
            </Link>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              <Layers3 className="h-8 w-8 text-cyan-300" /> Block Drop with Jamie
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              A fast, local falling-block game. Clear lines, climb levels, and try not to give Jamie structural concerns.
            </p>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] text-center">
            {[
              ['Score', game.score],
              ['Lines', game.lines],
              ['Level', game.level],
            ].map(([label, value]) => (
              <div key={label} className="min-w-20 border-r border-white/10 px-4 py-2 last:border-r-0">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <p className="mt-1 font-mono text-lg font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(300px,520px)_minmax(300px,1fr)]">
          <section className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-cyan-200/20 bg-slate-950/80 p-3 shadow-[0_30px_100px_rgba(6,182,212,0.12)] sm:p-5">
            <div
              role="grid"
              aria-label={`Falling block board. Score ${game.score}, ${game.lines} lines, level ${game.level}.`}
              className="grid aspect-[1/2] w-full grid-cols-10 gap-px overflow-hidden rounded-lg border border-white/10 bg-slate-900"
              style={{ gridTemplateRows: `repeat(${TETRIS_BOARD_HEIGHT}, minmax(0, 1fr))` }}
            >
              {visibleBoard.map((cell) => (
                <span
                  key={cell.key}
                  role="gridcell"
                  aria-label={cell.type ? `${cell.type} block` : 'empty'}
                  className="rounded-[2px] border border-white/[0.025]"
                  style={cell.type ? {
                    backgroundColor: PIECE_COLORS[cell.type],
                    boxShadow: `inset 0 0 0 2px rgba(255,255,255,.16), 0 0 10px ${PIECE_COLORS[cell.type]}33`,
                  } : cell.ghost ? {
                    backgroundColor: `${PIECE_COLORS[game.current.type]}18`,
                    borderColor: `${PIECE_COLORS[game.current.type]}80`,
                  } : undefined}
                />
              ))}
            </div>

            {game.status !== 'playing' && (
              <div className="absolute inset-3 flex items-center justify-center rounded-xl bg-slate-950/80 p-6 text-center backdrop-blur-sm sm:inset-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-300">
                    {game.status === 'paused' ? 'Game paused' : 'Stack complete'}
                  </p>
                  <h2 className="mt-3 text-3xl font-black text-white">
                    {game.status === 'paused' ? 'Catch your breath.' : `${game.score.toLocaleString()} points`}
                  </h2>
                  <Button className="mt-5" onClick={game.status === 'paused' ? togglePause : restart}>
                    {game.status === 'paused' ? <Play className="mr-2 h-4 w-4" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                    {game.status === 'paused' ? 'Resume' : 'Play again'}
                  </Button>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-xl border border-violet-200/15 bg-violet-400/[0.07] p-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-violet-200">
                <Sparkles className="h-4 w-4" /> Jamie says
              </div>
              <p className="mt-4 text-base font-semibold leading-7 text-violet-50">“{commentary}”</p>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Next piece</p>
                <div className="mt-4 grid aspect-square max-w-28 grid-cols-4 gap-1" aria-label={`Next piece: ${game.next}`}>
                  {Array.from({ length: 16 }, (_, index) => {
                    const key = `${index % 4}:${Math.floor(index / 4)}`;
                    const filled = previewCells.has(key);
                    return (
                      <span
                        key={key}
                        className="rounded-sm"
                        style={filled ? { backgroundColor: PIECE_COLORS[game.next] } : undefined}
                      />
                    );
                  })}
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <Trophy className="h-4 w-4 text-amber-200" /> High score
                </div>
                <p className="mt-5 font-mono text-3xl font-black text-amber-100">{highScore.toLocaleString()}</p>
                <p className="mt-2 text-xs text-slate-500">Saved on this device.</p>
              </section>
            </div>

            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Controls</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.03]" onClick={togglePause} disabled={game.status === 'game-over'}>
                    {game.status === 'paused' ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                    {game.status === 'paused' ? 'Resume' : 'Pause'}
                  </Button>
                  <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.03]" onClick={restart}>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Restart
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-5 gap-2">
                <TetrisControlButton label="Move left" onClick={() => moveSideways(-1)} disabled={game.status !== 'playing'}><ArrowLeft /></TetrisControlButton>
                <TetrisControlButton label="Rotate" onClick={rotate} disabled={game.status !== 'playing'}><RotateCw /></TetrisControlButton>
                <TetrisControlButton label="Move down" onClick={() => stepDown(true)} disabled={game.status !== 'playing'}><ArrowDown /></TetrisControlButton>
                <TetrisControlButton label="Move right" onClick={() => moveSideways(1)} disabled={game.status !== 'playing'}><ArrowRight /></TetrisControlButton>
                <TetrisControlButton label="Hard drop" onClick={hardDrop} disabled={game.status !== 'playing'}><ChevronsDown /></TetrisControlButton>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Keyboard: arrows move and rotate, Space drops, P pauses, and R restarts.
              </p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function getJamieTetrisCommentary(game: TetrisGameState) {
  if (game.status === 'game-over') {
    return game.score >= 5_000
      ? 'That stack had ambition. It also eventually had zoning problems.'
      : 'The blocks won this round. Conveniently, they have agreed to a rematch.';
  }
  if (game.status === 'paused') return 'A tactical pause. Very sophisticated. I will guard the pieces.';
  if (game.level >= 8) return 'This has become less of a puzzle and more of a weather event.';
  if (game.lines >= 20) return 'Your line-clearing operation is becoming suspiciously efficient.';
  if (game.score >= 1_000) return 'Four figures. I am updating my estimate of your spatial reasoning.';
  if (game.lines > 0) return 'Clean line. Order restored, briefly.';
  return 'Build low, leave options, and remember: every tower begins as a manageable administrative error.';
}
