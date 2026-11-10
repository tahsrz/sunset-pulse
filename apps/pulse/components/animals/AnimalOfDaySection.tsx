import { AlertTriangle, Bird, Database, ExternalLink, PawPrint } from 'lucide-react';
import { getAnimalOfDay } from '@/lib/animals/animalOfDay';

import styles from '@/app/home.module.css';

const minorTitleWords = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

export default function AnimalOfDaySection() {
  const animal = getAnimalOfDay();

  if (!animal) {
    return (
      <section className={styles.section}>
        <div className={styles.frame}>
          <p className={styles.label}>
            Animal of the Day Unavailable
          </p>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            The Catalogue of Life cartridge was not available on this machine, so the animal spotlight is paused.
          </p>
        </div>
      </section>
    );
  }

  const pathParts = animal.path.split(' > ').filter(Boolean);
  const animalTitle = (animal.vernacular !== 'None' ? animal.vernacular : animal.group)
    .split(' ')
    .map((word, index, words) => (
      index > 0 && index < words.length - 1 && minorTitleWords.has(word.toLowerCase())
        ? word.toLowerCase()
        : word.replace(/(^|-)\p{L}/gu, (initial) => initial.toUpperCase())
    ))
    .join(' ');
  const statusTone = /threatened|declining|vulnerable|endangered|critical/i.test(animal.profile.status)
    ? 'border-amber-300/30 bg-amber-300/10 text-amber-100'
    : 'border-slate-600 text-slate-100';

  return (
    <section className={styles.section}>
      <div className={styles.frame}>
        <div className={`${styles.grid} xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]`}>
          <div className="p-6 sm:p-8">

            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-slate-600 text-slate-300">
                  <PawPrint className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className={styles.label}>
                    TAH Animal of the Day
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-300">
                    {animal.dateKey} / {animal.cartridge}
                  </p>
                </div>
              </div>

              <h2 className={`${styles.editorial} mt-7 text-3xl leading-tight sm:text-5xl`}>
                {animalTitle}
              </h2>
              <p className="mt-3 font-mono text-sm tracking-[0.08em] text-slate-200">
                {animal.taxon}
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {pathParts.map((part, index) => (
                  <span
                    key={`${part}-${index}`}
                    className="rounded border border-slate-600 px-3 py-1 font-mono text-xs text-slate-300"
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

          <div className="p-6 sm:p-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div className={`rounded border p-5 ${statusTone}`}>
                <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.08em] opacity-80">
                  <AlertTriangle className="h-4 w-4" />
                  Conservation
                </div>
                <p className="mt-3 text-lg font-semibold leading-7">{animal.profile.status}</p>
              </div>

              <div className="rounded border border-slate-600 p-5 text-slate-100">
                <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.08em] text-slate-300">
                  <Bird className="h-4 w-4" />
                  Alive Count
                </div>
                <p className="mt-3 text-lg font-semibold leading-7">{animal.profile.population}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{animal.profile.populationNote}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-black tracking-[0.08em] text-slate-200">Fast Facts</h3>
                <ul className="mt-4">
                  {animal.profile.facts.map((fact) => (
                    <li key={fact} className="border-t border-white/15 py-3 text-sm leading-6 text-slate-300">
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-black tracking-[0.08em] text-amber-200">Pressure Points</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {animal.profile.threats.map((threat) => (
                    <span key={threat} className="rounded border border-slate-600 px-3 py-2 font-mono text-xs text-slate-300">
                      {threat}
                    </span>
                  ))}
                </div>

                <div className="mt-6 border-t border-white/15 pt-5">
                  <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.08em] text-slate-400">
                    <Database className="h-4 w-4" />
                    Source Note
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{animal.profile.sourceNote}</p>
                  {animal.link && (
                    <a
                      href={animal.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-xs font-black tracking-[0.05em] text-cyan-200 hover:text-cyan-100"
                    >
                      Open Taxon Source <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
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
    <div className="rounded border border-slate-600 p-4">
      <p className="font-mono text-xs uppercase text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}
