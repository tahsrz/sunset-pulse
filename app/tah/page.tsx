import Link from 'next/link';
import { getCartridgeMetadata } from '@/lib/ai/brain/cartridge_metadata';
import { listPulseCartridges } from '@/lib/ai/brain/pulse_query';
import { TahLibraryClient } from '@/app/tah/TahLibraryClient';
import { getTahMasterMetadata } from '@/lib/core/tah_master';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'TAH Knowledge Archive | Sunset Pulse',
  description: 'A crawlable archive of Sunset Pulse TAH and HAT cartridges for robots, agents, and context-aware systems.'
};

export default function TahPage() {
  const cartridges = listPulseCartridges().map(cartridge => getCartridgeMetadata(cartridge));
  const publicCartridges = cartridges.map(({ path: _path, ...cartridge }) => cartridge);
  const master = getTahMasterMetadata();
  const masterArchive = {
    status: master.status,
    name: master.name,
    generatedAt: master.generatedAt,
    sourceCount: master.sourceCount,
    shardCount: master.shardCount,
    skippedCount: master.skippedCount,
    stats: master.stats,
    files: master.files
  };
  const formats = cartridges.reduce<Record<string, number>>((acc, cartridge) => {
    acc[cartridge.format] = (acc[cartridge.format] || 0) + 1;
    return acc;
  }, {});
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Sunset Pulse TAH Knowledge Archive',
    description: 'Crawlable context pages for the Sunset Pulse cartridge knowledge base.',
    hasPart: cartridges.map(cartridge => ({
      '@type': 'Dataset',
      name: cartridge.displayTitle,
      identifier: cartridge.source,
      url: `/tah/${cartridge.slug}`,
      encodingFormat: cartridge.type === 'hat' ? 'application/x-hat' : 'application/x-tah',
      keywords: [cartridge.domain.label, cartridge.format, cartridge.searchQuery]
    }))
  };

  return (
    <main className="min-h-screen bg-[#071013] text-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.28),transparent_32%),radial-gradient(circle_at_80%_5%,rgba(244,114,182,0.20),transparent_30%),linear-gradient(135deg,#071013_0%,#102028_45%,#1f2937_100%)] px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-cyan-200">
            TAH Library
          </p>
          <h1 className="max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">
            Sunset Pulse TAH Knowledge Archive
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">
            A dense, crawlable library for every active cartridge in the knowledge base. Humans browse the catalog; agents use the same pages, JSON, headless text, and query APIs as stable route contracts.
          </p>
          <div className="mt-8 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Cartridges" value={String(cartridges.length)} />
            <Metric label="Memoria Pairs" value={String(formats['memoria-pair'] || 0)} />
            <Metric label="Indexed TAH" value={String(formats['indexed-tah'] || 0)} />
            <Metric label="Swarm Streams" value={String(formats['swarm-stream'] || 0)} />
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

      <TahLibraryClient cartridges={publicCartridges} masterArchive={masterArchive} />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
