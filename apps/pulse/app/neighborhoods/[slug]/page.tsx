import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getPublishedNeighborhoodGuide, listPublishedNeighborhoodGuides } from '@/lib/marketing/neighborhoodGuides.server';
import { getPublishedNeighborhoodPresentation } from '@/lib/marketing/neighborhoodPresentations.server';
import NeighborhoodMapLauncher from '@/components/marketing/NeighborhoodMapLauncher';
import { sellerCampaignQuery, type SellerCampaignSearchParams } from '@/lib/marketing/sellerCampaignQuery';

type PageProps = { params: Promise<{ slug: string }>; searchParams: Promise<SellerCampaignSearchParams> };
export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return listPublishedNeighborhoodGuides().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getPublishedNeighborhoodGuide(slug);
  if (!guide) return { title: 'Guide not found | Sunset Pulse', robots: { index: false, follow: false } };
  const presentation = getPublishedNeighborhoodPresentation(slug);
  return {
    title: `${guide.title} | Sunset Pulse`,
    description: guide.summary,
    alternates: { canonical: `/neighborhoods/${guide.slug}` },
    ...(presentation?.cover ? { openGraph: { images: [{ url: presentation.cover.src, alt: presentation.cover.alt, width: presentation.cover.width, height: presentation.cover.height }] } } : {}),
  };
}

export default async function NeighborhoodGuidePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const campaignQuery = sellerCampaignQuery(await searchParams);
  const guide = getPublishedNeighborhoodGuide(slug);
  if (!guide) notFound();
  const presentation = getPublishedNeighborhoodPresentation(slug);

  const evidence = new Map(guide.evidence.map((item) => [item.id, item]));
  return (
    <main className="min-h-screen bg-[#061017] px-4 py-12 text-white sm:px-6 sm:py-16">
      <article className="mx-auto max-w-4xl">
        <Link href="/neighborhoods" className="text-sm font-semibold text-teal-200 underline-offset-4 hover:underline">← All local guides</Link>
        <header className="mt-8 border-b border-white/10 pb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-200">{guide.coverageType} guide · revision {guide.revision}</p>
          <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">{guide.title}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">{guide.summary}</p>
          <p className="mt-4 text-xs text-slate-400">Reviewed {guide.reviewedAt}. Sources were checked on their listed retrieval dates; verify current details with each source.</p>
        </header>
        {presentation?.cover ? <figure className="mt-8 overflow-hidden rounded-3xl border border-white/10"><Image src={presentation.cover.src} alt={presentation.cover.alt} width={presentation.cover.width} height={presentation.cover.height} priority className="max-h-[560px] w-full object-cover" sizes="(min-width: 1024px) 896px, 100vw" /><figcaption className="bg-white/[0.04] px-4 py-3 text-sm text-slate-300">{presentation.cover.caption} <span className="text-slate-400">Photo: {presentation.cover.credit}</span></figcaption></figure> : null}
        {presentation?.localNote ? <aside className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm leading-7 text-slate-200">{presentation.localNote.text}</p><p className="mt-3 text-xs text-slate-400">From {presentation.localNote.author} · visited {presentation.localNote.visitedAt}</p></aside> : null}
        {presentation?.map && presentation.places.length > 0 ? <NeighborhoodMapLauncher center={presentation.map} places={presentation.places} evidence={presentation.evidence} /> : null}
        <div className="divide-y divide-white/10">
          {guide.sections.map((section) => (
            <section key={section.heading} className="py-8">
              <h2 className="text-2xl font-bold">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 leading-8 text-slate-300">{paragraph}</p>)}
              {section.statusNote && <p className="mt-4 rounded-xl border border-amber-200/20 bg-amber-100/[0.06] px-4 py-3 text-sm leading-6 text-amber-100">{section.statusNote}</p>}
              {section.evidenceIds.length > 0 && <ul className="mt-5 flex flex-wrap gap-3">{section.evidenceIds.map((id) => {
                const source = evidence.get(id)!;
                return <li key={id}><a className="text-sm font-semibold text-cyan-200 underline underline-offset-4" href={source.sourceUrl} target="_blank" rel="noreferrer">{source.publisher}: {source.title}</a></li>;
              })}</ul>}
            </section>
          ))}
        </div>
        {presentation?.photos.length ? <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Additional neighborhood photos">{presentation.photos.map((photo) => <figure key={photo.src} className="overflow-hidden rounded-2xl border border-white/10"><Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} className="h-64 w-full object-cover" sizes="(min-width: 640px) 50vw, 100vw" /><figcaption className="px-4 py-3 text-sm text-slate-300">{photo.caption} <span className="text-slate-400">Photo: {photo.credit}</span></figcaption></figure>)}</section> : null}
        <aside className="mt-8 rounded-3xl border border-teal-100/15 bg-teal-100/[0.06] p-6">
          <h2 className="text-xl font-bold">Thinking about selling nearby?</h2>
          <p className="mt-2 leading-7 text-slate-300">Request a personal conversation about timing, preparation and a property-specific pricing review. This page is general information, not a valuation.</p>
          <Link href={`/seller-plan${campaignQuery}`} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-teal-300 px-5 font-black text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Request a seller plan</Link>
        </aside>
      </article>
    </main>
  );
}
