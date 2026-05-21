import Link from 'next/link';

export default function JamieVibesPage() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-black uppercase text-cyan-200">Jamie Control Surface</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">
          Agentic vibes, split into independent streams.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200">
          Jamie's memory feed, saved vibe dictionary, and agent mesh each render through their own App Router slot.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm font-bold">
        <Link href="/vibe-lab" className="rounded bg-cyan-300 px-4 py-2 text-slate-950">
          Open Vibe Lab
        </Link>
        <Link href="/api/jamie/briefing" className="rounded border border-white/20 px-4 py-2 text-white">
          Briefing API
        </Link>
      </div>
    </div>
  );
}
