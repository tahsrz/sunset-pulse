import Link from 'next/link';
import { SlotShell } from '@/components/jamie-vibes/SlotShell';
import { getJamieVibeData } from '@/lib/jamie/agenticVibes';

export default async function JamieVibesSlot() {
  const data = await getJamieVibeData();

  return (
    <SlotShell
      eyebrow="Slot: @vibes"
      title="Vibe Dictionary"
      action={<Link href="/vibe-lab" className="rounded border border-white/15 px-3 py-2 text-xs font-bold text-cyan-100">Edit</Link>}
    >
      <div className="mb-4 flex items-center justify-between rounded border border-white/10 bg-black/20 px-3 py-2">
        <span className="text-xs font-bold uppercase text-slate-400">Source</span>
        <span className="text-xs font-black uppercase text-cyan-100">{data.source}</span>
      </div>

      <div className="grid gap-3">
        {data.vibes.map((vibe) => (
          <article key={vibe.id} className="rounded border border-white/10 bg-black/20 p-4 transition hover:border-cyan-200/50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">{vibe.name}</p>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{vibe.description}</p>
              </div>
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: vibe.color, boxShadow: `0 0 18px ${vibe.color}` }}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase text-slate-400">
              <span className="rounded bg-white/[0.05] px-2 py-1">Tone: {vibe.tone}</span>
              <span className="rounded bg-white/[0.05] px-2 py-1">Pacing: {vibe.pacing}</span>
            </div>

            {vibe.structure && (
              <p className="mt-3 rounded border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[11px] leading-5 text-cyan-100">
                {vibe.structure}
              </p>
            )}
          </article>
        ))}
      </div>
    </SlotShell>
  );
}
