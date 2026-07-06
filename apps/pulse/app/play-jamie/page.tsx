import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Crown, Gamepad2, Layers3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Play Jamie | Sunset Pulse',
  description: 'Challenge Jamie to local games inside Sunset Pulse.',
};

export default function PlayJamiePage() {
  return (
    <main className="min-h-screen bg-[#060913] px-4 py-16 text-white sm:px-6">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-violet-300">
            <Gamepad2 className="h-4 w-4" /> Jamie game room
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">Play Jamie.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-400">
            Small games, sharp opponents, and local-first play. Chess is the opening move; every game shares the same Jamie match identity and record layer.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Link href="/play-jamie/chess" className="group relative overflow-hidden rounded-2xl border border-violet-200/20 bg-gradient-to-br from-violet-400/15 via-white/[0.04] to-cyan-400/10 p-7 transition hover:-translate-y-1 hover:border-violet-200/40">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-amber-200/20 bg-amber-200/10">
                <Crown className="h-7 w-7 text-amber-200" />
              </span>
              <span className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">Playable</span>
            </div>
            <h2 className="mt-8 text-3xl font-black">Chess</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Full legal chess with three Jamie personalities, promotions, undo, move history, and a persistent match record.</p>
            <span className="mt-7 inline-flex items-center gap-2 text-sm font-black text-violet-200">
              Start match <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>

          <Link href="/play-jamie/tetris" className="group relative overflow-hidden rounded-2xl border border-cyan-200/20 bg-gradient-to-br from-cyan-400/15 via-white/[0.04] to-violet-400/10 p-7 transition hover:-translate-y-1 hover:border-cyan-200/40">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-200/10">
                <Layers3 className="h-7 w-7 text-cyan-200" />
              </span>
              <span className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">Playable</span>
            </div>
            <h2 className="mt-8 text-3xl font-black">Block Drop</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Tetris-style falling blocks with fair piece bags, ghost placement, levels, local high scores, and Jamie commentary.</p>
            <span className="mt-7 inline-flex items-center gap-2 text-sm font-black text-cyan-200">
              Start stacking <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
