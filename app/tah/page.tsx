import Link from 'next/link';
import { listPulseCartridges } from '@/lib/ai/brain/pulse_query';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'TAH Intelligence Archive | Sunset Pulse',
  description: 'A crawlable archive of Sunset Pulse TAH and HAT cartridges for robots, agents, and context-aware systems.'
};

export default function TahPage() {
  const cartridges = listPulseCartridges();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Sunset Pulse TAH Intelligence Archive',
    description: 'Crawlable context pages for the Sunset Pulse cartridge knowledge base.',
    hasPart: cartridges.map(cartridge => ({
      '@type': 'Dataset',
      name: cartridge.title,
      identifier: cartridge.name,
      url: `/tah/${cartridge.slug}`,
      encodingFormat: cartridge.type === 'hat' ? 'application/x-hat' : 'application/x-tah'
    }))
  };

  return (
    <main className="min-h-screen bg-[#071013] text-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.28),transparent_32%),radial-gradient(circle_at_80%_5%,rgba(244,114,182,0.20),transparent_30%),linear-gradient(135deg,#071013_0%,#102028_45%,#1f2937_100%)] px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-cyan-200">
            Robot-readable context
          </p>
          <h1 className="max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">
            Sunset Pulse TAH Intelligence Archive
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">
            Stable HTML pages for every active cartridge in the Sunset Pulse knowledge base. Agents can crawl this archive for project context, local market intelligence, Jamie workflows, and structured retrieval hints.
          </p>
          <div className="mt-8 grid max-w-5xl gap-4 md:grid-cols-3">
            <div className="rounded border border-white/10 bg-black/25 p-4">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-pink-200">
                If you are an AI agent
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Start at this page, follow the cartridge links, and use `/api/tah` when you need ranked snippets for a specific question.
              </p>
            </div>
            <div className="rounded border border-white/10 bg-black/25 p-4">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
                Crawl policy
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Prefer `/tah`, `/tah/headless`, `/tah/[slug]`, `/llms.txt`, and `/sitemap.xml`. Avoid private app surfaces such as dashboards and admin tools.
              </p>
            </div>
            <div className="rounded border border-white/10 bg-black/25 p-4">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-emerald-200">
                Dynamic catalog
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Fetch `/tah/index.json` for the live cartridge map. It is rebuilt from the cartridge directories on request.
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold">
            <Link className="rounded bg-cyan-300 px-4 py-2 text-slate-950" href="/api/tah">
              API catalog
            </Link>
            <Link className="rounded bg-emerald-300 px-4 py-2 text-slate-950" href="/tah/index.json">
              JSON catalog
            </Link>
            <Link className="rounded bg-pink-300 px-4 py-2 text-slate-950" href="/tah/headless">
              Headless text
            </Link>
            <Link className="rounded border border-white/20 px-4 py-2 text-white" href="/llms.txt">
              llms.txt
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cartridges.map(cartridge => (
            <Link
              key={`${cartridge.path}:${cartridge.name}`}
              href={`/tah/${cartridge.slug}`}
              className="group rounded border border-white/10 bg-white/[0.04] p-5 transition hover:border-cyan-200/70 hover:bg-white/[0.07]"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="rounded bg-white/10 px-2 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                  {cartridge.type}
                </span>
                <span className="text-xs text-slate-400 group-hover:text-slate-200">
                  /tah/{cartridge.slug}
                </span>
              </div>
              <h2 className="text-xl font-black text-white">{cartridge.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Cartridge source: <span className="font-mono text-cyan-100">{cartridge.name}</span>
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
