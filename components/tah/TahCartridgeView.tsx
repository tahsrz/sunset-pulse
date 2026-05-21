import Link from 'next/link';
import type { TahCartridgeViewData } from '@/lib/ai/brain/tah_page_data';

type TahCartridgeViewProps = {
  data: TahCartridgeViewData;
  mode?: 'page' | 'modal';
};

export function TahCartridgeView({ data, mode = 'page' }: TahCartridgeViewProps) {
  const { metadata, previews, related, searchQuery } = data;
  const isModal = mode === 'modal';
  const Shell = isModal ? 'div' : 'main';

  return (
    <Shell className={isModal ? 'bg-[#071013] text-slate-50' : 'min-h-screen bg-[#071013] text-slate-50'}>
      {!isModal && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data.jsonLd) }}
        />
      )}

      <section className={`${isModal ? 'px-5 py-6 sm:px-7' : 'border-b border-white/10 px-6 py-12'} bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,0.20),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(244,114,182,0.18),transparent_28%),linear-gradient(135deg,#071013_0%,#12343b_48%,#43313d_100%)]`}>
        <div className="mx-auto max-w-6xl">
          <Link href="/tah" scroll={false} className="text-sm font-semibold text-cyan-200 hover:text-white">
            Back to TAH archive
          </Link>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-pink-200">
            {metadata.domain.label} dossier
          </p>
          <h1 className={`${isModal ? 'text-3xl md:text-5xl' : 'text-4xl md:text-6xl'} mt-4 font-black leading-tight`}>
            {metadata.displayTitle}
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-7 text-slate-200">{metadata.summary}</p>

          <dl className="mt-8 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Format" value={metadata.format} />
            <Metric label="Shards" value={String(metadata.shardCount)} />
            <Metric label="Payload" value={formatBytes(metadata.payloadByteSize)} />
            <Metric label="Hashes" value={String(metadata.hashCount)} />
          </dl>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-300">
            Query seed: <span className="font-mono text-cyan-100">{searchQuery}</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
            <Link className="rounded bg-pink-300 px-4 py-2 text-slate-950" href={`/tah/${metadata.slug}/headless`}>
              Headless text
            </Link>
            <Link className="rounded border border-white/20 px-4 py-2 text-white" href={`/api/tah?q=${encodeURIComponent(searchQuery)}&limit=10`}>
              Query API
            </Link>
            <Link className="rounded border border-white/20 px-4 py-2 text-white" href={`/api/tah/${metadata.slug}/meta`}>
              Metadata JSON
            </Link>
          </div>
        </div>
      </section>

      <section className={isModal ? 'px-5 py-7 sm:px-7' : 'px-6 py-10'}>
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr,320px]">
          <div>
            <h2 className="text-2xl font-black">Context Preview</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Retrieved shards from the same search layer used by `/api/tah`.
            </p>

            <div className="mt-6 grid gap-4">
              {previews.length > 0 ? previews.map((preview, index) => (
                <article key={`${preview.source}:${index}`} className="rounded border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                    Match score {Number(preview.score || 0).toFixed(2)}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                    {preview.text}
                  </p>
                </article>
              )) : (
                <div className="rounded border border-white/10 bg-white/[0.04] p-5 text-sm leading-6 text-slate-300">
                  This cartridge is indexed and available through `/api/tah`, but the title query did not produce preview snippets.
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded border border-white/10 bg-white/[0.04] p-4">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-pink-200">Route Contract</h2>
              <div className="mt-4 space-y-3 text-xs">
                <RouteLink label="HTML" href={`/tah/${metadata.slug}`} />
                <RouteLink label="Headless" href={`/tah/${metadata.slug}/headless`} />
                <RouteLink label="Meta" href={`/api/tah/${metadata.slug}/meta`} />
                <RouteLink label="Query" href={`/api/tah?q=${encodeURIComponent(searchQuery)}&limit=10`} />
              </div>
            </section>

            <section className="rounded border border-white/10 bg-white/[0.04] p-4">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-emerald-200">Related</h2>
              <div className="mt-4 space-y-3">
                {related.length > 0 ? related.map(item => (
                  <Link key={item.slug} href={`/tah/${item.slug}`} scroll={false} className="block rounded border border-white/10 bg-black/20 p-3 transition hover:border-cyan-200/60">
                    <p className="line-clamp-1 text-sm font-black text-white">{item.displayTitle}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{item.format}</p>
                  </Link>
                )) : (
                  <p className="text-sm leading-6 text-slate-400">No nearby cartridges are mapped yet.</p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </Shell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.04] p-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="mt-2 font-mono text-cyan-100">{value}</dd>
    </div>
  );
}

function RouteLink({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} className="block rounded border border-white/10 bg-black/25 px-3 py-2 font-mono text-cyan-100 transition hover:border-cyan-200/60">
      <span className="mr-2 font-sans text-slate-400">{label}</span>
      {href}
    </Link>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 b';
  if (bytes < 1024) return `${bytes} b`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} kb`;
  return `${Math.round(bytes / 104857.6) / 10} mb`;
}
