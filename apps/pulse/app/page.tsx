import React, { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import InfoBoxes from '@/components/InfoBoxes';
import UnifiedPropertyStage from '@/components/marketing/UnifiedPropertyStage';
import SunsetHistorySection from '@/components/marketing/SunsetHistorySection';
import FAQSection from '@/components/marketing/FAQSection';
import { HomeHero } from '@/components/home/HomeDynamicSections';
import CounterScanActions from '@/components/home/CounterScanActions';
import SellerAcquisitionHero from '@/components/marketing/SellerAcquisitionHero';
import AnimalOfDaySection from '@/components/animals/AnimalOfDaySection';
import { getTourHotList } from '@/lib/data/tourHotList';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { listPublishedNeighborhoodGuides } from '@/lib/marketing/neighborhoodGuides.server';
import { listPublishedNeighborhoodPresentations } from '@/lib/marketing/neighborhoodPresentations.server';
import { getPublishedSellerIntroduction } from '@/lib/marketing/sellerIntroduction.server';
import { sellerCampaignQuery, type SellerCampaignSearchParams } from '@/lib/marketing/sellerCampaignQuery';
import SellerIntroduction from '@/components/marketing/SellerIntroduction';
import type { Property } from '@/lib/types';
import styles from './home.module.css';

async function StagedPropertiesPocket() {
  let stagedProperties: Property[] = [];
  try {
    const records = (await getTourHotList({ limit: 4 })).listings;
    stagedProperties = JSON.parse(JSON.stringify(records)) as Property[];
  } catch (error) {
    console.error('[HOME_CURATED_LISTINGS_READ] Curated listings could not be loaded.', error);
  }

  return <UnifiedPropertyStage initialStagedProperties={stagedProperties} initialMode="STAGED" compact />;
}

function NeighborhoodPreview() {
  const guides = listPublishedNeighborhoodGuides();
  const presentations = new Map(listPublishedNeighborhoodPresentations().map((presentation) => [presentation.slug, presentation]));
  return (
    <section className="waterlily-section px-4 py-14 text-white sm:px-6 sm:py-16" aria-labelledby="home-neighborhood-guides">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-200">Around North Texas</p>
            <h2 id="home-neighborhood-guides" className="mt-3 text-3xl font-black italic uppercase sm:text-4xl">Local Guides</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Read source-linked notes about the places around a home.</p>
          </div>
          <Link href="/neighborhoods" className="inline-flex min-h-11 items-center text-sm font-bold text-teal-200 underline underline-offset-4">All neighborhood guides <span aria-hidden="true" className="ml-2">→</span></Link>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {guides.slice(0, 3).map((guide) => (
            <article key={guide.slug} className="flex min-h-48 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              {presentations.get(guide.slug)?.cover ? <Image src={presentations.get(guide.slug)!.cover!.src} alt={presentations.get(guide.slug)!.cover!.alt} width={presentations.get(guide.slug)!.cover!.width} height={presentations.get(guide.slug)!.cover!.height} className="h-44 w-full object-cover" sizes="(min-width: 1280px) 400px, (min-width: 768px) 33vw, 100vw" /> : null}
              <div className="flex flex-1 flex-col p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-200">{guide.coverageType} · reviewed {guide.reviewedAt}</p>
              <h3 className="mt-3 text-xl font-bold">{guide.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-300">{guide.summary}</p>
              <Link href={`/neighborhoods/${guide.slug}`} className="mt-4 inline-flex min-h-10 items-center text-sm font-bold text-teal-100 underline underline-offset-4">Read guide</Link>
              </div>
            </article>
          ))}
          {guides.length === 0 ? <p className="text-sm text-slate-300">Local guides are being reviewed. Browse properties or search the live feed in the meantime.</p> : null}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<SellerCampaignSearchParams> }) {
  const access = await getOperatorAccess(getRequestHostFromHeaders(await headers()));
  const sellerIntroduction = getPublishedSellerIntroduction();
  const campaignQuery = sellerCampaignQuery(await searchParams);

  return (
    <div className={styles.homePage}>
      <SellerAcquisitionHero campaignQuery={campaignQuery} />
      <HomeHero />
      {sellerIntroduction ? <SellerIntroduction profile={sellerIntroduction} /> : null}
      <div className="waterlily-surface">
        <Suspense fallback={<div role="status" className="py-14 text-center text-sm text-slate-400">Loading curated properties…</div>}>
          <StagedPropertiesPocket />
        </Suspense>
        <NeighborhoodPreview />
        <SunsetHistorySection />
        <InfoBoxes />
        <AnimalOfDaySection />
        <FAQSection />
      </div>
      <CounterScanActions showLeadOperations={access.allowed} />
    </div>
  );
}
