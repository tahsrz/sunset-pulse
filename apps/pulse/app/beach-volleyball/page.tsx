import BeachVolleyballGame from './BeachVolleyballGame';

export const metadata = {
  title: 'Beach Volleyball | Sunset Pulse',
  description: 'A lightweight Sunset Pulse beach volleyball mini-game inspired by browser arcade rallies.',
};

export default function BeachVolleyballPage() {
  return (
    <main className="min-h-screen bg-[#06131d] px-4 pb-12 pt-24 text-white">
      <section className="mx-auto mb-10 max-w-4xl text-center">
        <div className="mb-4 inline-flex rounded-full border border-teal-200/20 bg-teal-200/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-teal-100">
          Jamie Arcade
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tight md:text-6xl">
          Beach <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-amber-300">Volleyball</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
          Rally against Jamie, clear the net, and keep the ball off your side of the sand. This is a clean-room
          arcade riff with original Sunset Pulse visuals and mechanics.
        </p>
      </section>

      <section className="mx-auto flex max-w-5xl justify-center">
        <BeachVolleyballGame />
      </section>
    </main>
  );
}
