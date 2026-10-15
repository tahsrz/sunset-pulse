import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Gamepad2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Crash Bash Online | Play Jamie | Sunset Pulse',
  description: 'Launch Crash Bash Online from Play Jamie, with controls and directions for solo games and private rooms.',
};

const controls = [
  ['Move', 'Arrow keys or WASD'],
  ['Jump', 'Space'],
  ['Attack', 'X'],
  ['Pick up / throw', 'Z'],
  ['Taunt', 'C'],
  ['Fullscreen', 'F or the game’s fullscreen button'],
] as const;

export default function CrashBashPage() {
  return (
    <main className="min-h-screen bg-[#060913] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/play-jamie" className="inline-flex items-center gap-2 text-sm font-bold text-violet-200 hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Play Jamie
        </Link>

        <section className="mt-8 rounded-3xl border border-orange-200/20 bg-gradient-to-br from-orange-400/15 via-white/[0.04] to-violet-400/10 p-6 sm:p-10" aria-labelledby="crash-bash-title">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-orange-200">
            <Gamepad2 className="h-4 w-4" aria-hidden="true" /> External game · crashbash.app
          </p>
          <h1 id="crash-bash-title" className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">Crash Bash Online.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Quick party battles, solo CPU opponents, or an online room with friends. This unofficial browser version of Crash Bash runs on its own site.
          </p>
          <a href="https://crashbash.app/" target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-3 rounded-xl bg-orange-200 px-6 py-4 font-black text-slate-950 transition hover:bg-orange-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-200">
            Play on crashbash.app <ExternalLink className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Opens in a new tab. Crash Bash uses its own CPU players, accounts, and records; results do not update your Jamie match record.
          </p>
        </section>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6" aria-labelledby="start-title">
            <h2 id="start-title" className="text-2xl font-black">Start a match</h2>
            <ol className="mt-5 list-decimal space-y-4 pl-5 text-sm leading-7 text-slate-300">
              <li>Open the game and choose <strong className="text-white">SOLO VS CPU</strong> for a solo battle, or <strong className="text-white">PRIVATE BATTLE</strong> to host a room for friends.</li>
              <li>For a private battle, choose two to four players and share the room code shown during character selection. Friends enter it through <strong className="text-white">JOIN</strong> → <strong className="text-white">BATTLE BY CODE</strong>.</li>
              <li>Pick characters, then let the host choose the arena and rules. Unfilled seats get CPU opponents; the round starts after everyone finishes loading.</li>
            </ol>
            <p className="mt-5 text-sm leading-7 text-slate-400">Guest battle play does not require an account. Adventure saves use a separate Crash Bash account.</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6" aria-labelledby="controls-title">
            <h2 id="controls-title" className="text-2xl font-black">Controls</h2>
            <dl className="mt-5 divide-y divide-white/10 text-sm">
              {controls.map(([action, keys]) => (
                <div key={action} className="flex justify-between gap-5 py-3">
                  <dt className="font-bold text-white">{action}</dt>
                  <dd className="text-right text-slate-300">{keys}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-sm leading-7 text-slate-400">On phones and tablets, use the game’s touch controls. To connect a controller, press any controller button.</p>
          </section>
        </div>

        <footer className="mt-8 text-sm leading-7 text-slate-400">
          <p>Crash Bash Online is an independent, unofficial fan project. Crash Bash and related characters belong to their respective owners.</p>
          <p className="mt-2">For current game help and account information, visit its own pages:</p>
          <nav aria-label="Crash Bash resources" className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            <a href="https://crashbash.app/faq" target="_blank" rel="noopener noreferrer" className="text-orange-200 underline underline-offset-4 hover:text-white">Game help <span className="sr-only">(opens in a new tab)</span></a>
            <a href="https://crashbash.app/terms" target="_blank" rel="noopener noreferrer" className="text-orange-200 underline underline-offset-4 hover:text-white">Terms <span className="sr-only">(opens in a new tab)</span></a>
            <a href="https://crashbash.app/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-200 underline underline-offset-4 hover:text-white">Privacy <span className="sr-only">(opens in a new tab)</span></a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
