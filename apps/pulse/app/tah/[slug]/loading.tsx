import React from 'react';

export default function TahCartridgeLoading() {
  return (
    <main className="min-h-screen bg-[#071013] text-slate-50">
      <section className="border-b border-white/10 px-6 py-12 bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,0.10),transparent_30%),linear-gradient(135deg,#071013_0%,#12343b_48%,#43313d_100%)]">
        <div className="mx-auto max-w-6xl">
          <div className="h-4 w-32 bg-cyan-200/10 rounded animate-pulse" />
          
          <div className="mt-8 h-3 w-40 bg-pink-200/10 rounded animate-pulse" />
          <div className="mt-4 h-12 w-3/4 bg-white/5 rounded animate-pulse" />
          <div className="mt-5 space-y-2">
            <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-white/5 rounded animate-pulse" />
          </div>

          <dl className="mt-8 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded border border-white/10 bg-white/[0.04] p-4 h-24 animate-pulse" />
            ))}
          </dl>
          
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="h-10 w-32 bg-pink-300/10 rounded animate-pulse" />
            <div className="h-10 w-32 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded border border-white/10 bg-white/[0.04] p-5 h-32 animate-pulse" />
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded border border-white/10 bg-white/[0.04] p-4 h-48 animate-pulse" />
            <div className="rounded border border-white/10 bg-white/[0.04] p-4 h-64 animate-pulse" />
          </aside>
        </div>
      </section>
    </main>
  );
}
