import { AlertTriangle, Bird, Database, ExternalLink, PawPrint } from 'lucide-react';
import { getAnimalOfDay } from '@/lib/animals/animalOfDay';

export default function AnimalOfDaySection() {
  const animal = getAnimalOfDay();

  if (!animal) {
    return (
      <section className="waterlily-section px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-slate-950/50 p-8">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-200">
            Animal of the day unavailable
          </p>
          <p className="mt-3 max-w-2xl text-sm text-teal-50/65">
            The Catalogue of Life cartridge was not available on this machine, so the animal spotlight is paused.
          </p>
        </div>
      </section>
    );
  }

  const pathParts = animal.path.split(' > ').filter(Boolean);
  const statusTone = /threatened|declining|vulnerable|endangered|critical/i.test(animal.profile.status)
    ? 'border-amber-300/30 bg-amber-300/10 text-amber-100'
    : 'border-lime-300/25 bg-lime-300/10 text-lime-100';

  return (
    <section className="waterlily-section px-6 py-20 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-lime-200/15 bg-gradient-to-br from-slate-950 via-teal-950 to-lime-950 p-8 shadow-2xl shadow-teal-950/30">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-lime-300/15 blur-3xl" />
          <div className="absolute -bottom-16 left-8 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-slate-950">
                <PawPrint className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-lime-100/70">
                  TAH Animal Of The Day
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-100/60">
                  {animal.dateKey} / {animal.cartridge}
                </p>
              </div>
            </div>

            <h2 className="mt-8 text-4xl font-black uppercase italic tracking-tighter text-white md:text-6xl">
              {animal.vernacular !== 'None' ? animal.vernacular : animal.group}
            </h2>
            <p className="mt-3 font-mono text-sm uppercase tracking-[0.22em] text-lime-200">
              {animal.taxon}
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {pathParts.map((part, index) => (
                <span
                  key={`${part}-${index}`}
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                    index === 0
                      ? 'border-lime-300/30 bg-lime-300/10 text-lime-100'
                      : 'border-white/10 bg-white/[0.04] text-teal-100/70'
                  }`}
                >
                  {part}
                </span>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Rank" value={animal.rank} />
              <MetricCard label="Shard" value={`#${animal.shardIndex}`} />
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/65 p-8 shadow-2xl shadow-black/25 backdrop-blur-xl">
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`rounded-2xl border p-5 ${statusTone}`}>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] opacity-80">
                <AlertTriangle className="h-4 w-4" />
                Conservation
              </div>
              <p className="mt-3 text-2xl font-black uppercase italic tracking-tight">{animal.profile.status}</p>
            </div>

            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-cyan-50">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/75">
                <Bird className="h-4 w-4" />
                Alive Count
              </div>
              <p className="mt-3 text-2xl font-black uppercase italic tracking-tight">{animal.profile.population}</p>
              <p className="mt-2 text-xs leading-relaxed text-cyan-50/70">{animal.profile.populationNote}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.25em] text-lime-200">Fast Facts</h3>
              <ul className="mt-4 space-y-3">
                {animal.profile.facts.map((fact) => (
                  <li key={fact} className="rounded-xl border border-white/8 bg-white/[0.035] p-4 text-sm leading-relaxed text-teal-50/75">
                    {fact}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.25em] text-amber-200">Pressure Points</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {animal.profile.threats.map((threat) => (
                  <span key={threat} className="rounded-full border border-amber-200/15 bg-amber-200/10 px-3 py-2 text-xs font-bold text-amber-50/80">
                    {threat}
                  </span>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  <Database className="h-4 w-4" />
                  Source Note
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{animal.profile.sourceNote}</p>
                {animal.link && (
                  <a
                    href={animal.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-200 hover:text-cyan-100"
                  >
                    Open taxon source <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-teal-100/50">{label}</p>
      <p className="mt-2 text-lg font-black uppercase text-white">{value}</p>
    </div>
  );
}
