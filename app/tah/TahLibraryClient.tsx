'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CARTRIDGE_DOMAINS } from '@/lib/ai/brain/cartridge_domains';
import type { CartridgeMetadata } from '@/lib/ai/brain/cartridge_metadata';

type TahLibraryClientProps = {
  cartridges: Array<Omit<CartridgeMetadata, 'path'>>;
};

const ALL_DOMAINS = 'all';

export function TahLibraryClient({ cartridges }: TahLibraryClientProps) {
  const [query, setQuery] = useState('');
  const [activeDomain, setActiveDomain] = useState(ALL_DOMAINS);

  const domainCounts = useMemo(() => {
    return cartridges.reduce<Record<string, number>>((acc, cartridge) => {
      acc[cartridge.domain.id] = (acc[cartridge.domain.id] || 0) + 1;
      return acc;
    }, {});
  }, [cartridges]);

  const filteredCartridges = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cartridges.filter(cartridge => {
      const domainMatch = activeDomain === ALL_DOMAINS || cartridge.domain.id === activeDomain;
      if (!domainMatch) return false;
      if (!needle) return true;

      return [
        cartridge.displayTitle,
        cartridge.title,
        cartridge.source,
        cartridge.searchQuery,
        cartridge.summary,
        cartridge.domain.label,
        cartridge.format
      ].join(' ').toLowerCase().includes(needle);
    });
  }, [activeDomain, cartridges, query]);

  return (
    <section className="px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px),1fr]">
          <aside className="border-b border-white/10 pb-4 lg:border-b-0 lg:border-r lg:pr-4">
            <label className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200" htmlFor="tah-search">
              Library Search
            </label>
            <input
              id="tah-search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              className="mt-3 w-full rounded border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-200"
              placeholder="Search cartridges..."
            />

            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => setActiveDomain(ALL_DOMAINS)}
                className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left text-xs font-black uppercase tracking-[0.14em] transition ${activeDomain === ALL_DOMAINS ? 'border-cyan-200 bg-cyan-300 text-slate-950' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'}`}
              >
                <span>All Knowledge</span>
                <span>{cartridges.length}</span>
              </button>
              {CARTRIDGE_DOMAINS.filter(domain => domainCounts[domain.id]).map(domain => (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => setActiveDomain(domain.id)}
                  className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left text-xs font-black uppercase tracking-[0.14em] transition ${activeDomain === domain.id ? 'border-cyan-200 bg-white text-slate-950' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: domain.color }} />
                    <span className="truncate">{domain.label}</span>
                  </span>
                  <span>{domainCounts[domain.id]}</span>
                </button>
              ))}
            </div>
          </aside>

          <div>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-pink-200">Catalog</p>
                <h2 className="mt-2 text-2xl font-black text-white">{filteredCartridges.length} cartridges visible</h2>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <Link className="rounded bg-emerald-300 px-3 py-2 text-slate-950" href="/tah/index.json">JSON</Link>
                <Link className="rounded bg-pink-300 px-3 py-2 text-slate-950" href="/tah/headless">Headless</Link>
                <Link className="rounded border border-white/20 px-3 py-2 text-white" href="/api/tah">API</Link>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              {filteredCartridges.map(cartridge => (
                <article
                  key={`${cartridge.slug}:${cartridge.source}`}
                  className="rounded border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-200/60 hover:bg-white/[0.07]"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em]">
                    <span className="rounded bg-white/10 px-2 py-1 text-cyan-200">{cartridge.format}</span>
                    <span className="rounded bg-white/10 px-2 py-1 text-slate-300">{cartridge.domain.label}</span>
                    <span className="rounded bg-white/10 px-2 py-1 text-slate-300">{formatBytes(cartridge.payloadByteSize)}</span>
                    <span className="rounded bg-white/10 px-2 py-1 text-slate-300">{cartridge.shardCount} shards</span>
                  </div>

                  <h3 className="mt-3 text-xl font-black leading-tight text-white">{cartridge.displayTitle}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">{cartridge.summary}</p>
                  <p className="mt-3 truncate font-mono text-xs text-cyan-100">{cartridge.source}</p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    <Link className="rounded bg-cyan-300 px-3 py-2 text-slate-950" href={`/tah/${cartridge.slug}`}>Page</Link>
                    <Link className="rounded bg-pink-300 px-3 py-2 text-slate-950" href={`/tah/${cartridge.slug}/headless`}>Headless</Link>
                    <Link className="rounded border border-white/20 px-3 py-2 text-white" href={`/api/tah/${cartridge.slug}/meta`}>Meta</Link>
                    <Link className="rounded border border-white/20 px-3 py-2 text-white" href={cartridge.routes.api.replace(/^https?:\/\/[^/]+/, '')}>Query</Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 b';
  if (bytes < 1024) return `${bytes} b`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} kb`;
  return `${Math.round(bytes / 104857.6) / 10} mb`;
}
