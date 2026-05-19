import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPulseCartridge, listPulseCartridges, previewPulseCartridge } from '@/lib/ai/brain/pulse_query';

export const dynamic = 'force-dynamic';

type TahCartridgePageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return listPulseCartridges().map(cartridge => ({ slug: cartridge.slug }));
}

export async function generateMetadata({ params }: TahCartridgePageProps) {
  const cartridge = getPulseCartridge(params.slug);
  if (!cartridge) {
    return {
      title: 'TAH Cartridge Not Found | Sunset Pulse'
    };
  }

  return {
    title: `${cartridge.title} | Sunset Pulse TAH`,
    description: `Robot-readable context page for the ${cartridge.name} Sunset Pulse cartridge.`
  };
}

export default async function TahCartridgePage({ params }: TahCartridgePageProps) {
  const cartridge = getPulseCartridge(params.slug);
  if (!cartridge) notFound();

  const previews = await previewPulseCartridge(params.slug, 6);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: cartridge.title,
    identifier: cartridge.name,
    url: `/tah/${cartridge.slug}`,
    isPartOf: {
      '@type': 'CollectionPage',
      name: 'Sunset Pulse TAH Intelligence Archive',
      url: '/tah'
    },
    encodingFormat: cartridge.type === 'hat' ? 'application/x-hat' : 'application/x-tah',
    distribution: {
      '@type': 'DataDownload',
      contentUrl: `/api/tah?q=${encodeURIComponent(cartridge.title)}&limit=10`,
      encodingFormat: 'application/json'
    }
  };

  return (
    <main className="min-h-screen bg-[#071013] text-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="border-b border-white/10 bg-[linear-gradient(135deg,#071013_0%,#12343b_48%,#43313d_100%)] px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <Link href="/tah" className="text-sm font-semibold text-cyan-200 hover:text-white">
            Back to TAH archive
          </Link>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-pink-200">
            {cartridge.type} cartridge
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">{cartridge.title}</h1>
          <dl className="mt-8 grid gap-4 text-sm md:grid-cols-3">
            <div className="rounded border border-white/10 bg-white/[0.04] p-4">
              <dt className="text-slate-400">Source</dt>
              <dd className="mt-2 font-mono text-cyan-100">{cartridge.name}</dd>
            </div>
            <div className="rounded border border-white/10 bg-white/[0.04] p-4">
              <dt className="text-slate-400">HTML URL</dt>
              <dd className="mt-2 font-mono text-cyan-100">/tah/{cartridge.slug}</dd>
            </div>
            <div className="rounded border border-white/10 bg-white/[0.04] p-4">
              <dt className="text-slate-400">Query API</dt>
              <dd className="mt-2 font-mono text-cyan-100">/api/tah</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-black">Context Preview</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            These snippets are retrieved from the cartridge search layer so crawlers can understand what kind of knowledge lives behind this stable page.
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
      </section>
    </main>
  );
}
