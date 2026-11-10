import React, { Suspense } from 'react';
import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: 'Sell Your Home or Land in Sunset, Texas | Sunset Pulse',
  description: 'Talk with Sunset Pulse about selling your home or acreage near Sunset, Texas. Start with a free seller plan for your property.',
};

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
    <section className={styles.section} aria-labelledby="home-neighborhood-guides">
      <div className={styles.frame}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={styles.label}>Around North Texas</p>
            <h2 id="home-neighborhood-guides" className={`${styles.editorial} mt-2 text-3xl sm:text-4xl`}>Local Guides</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Read source-linked notes about the places around a home.</p>
          </div>
          <Link href="/neighborhoods" className={styles.action}>All Neighborhood Guides <span aria-hidden="true">→</span></Link>
        </div>
        <div className={`${styles.grid} mt-6 md:grid-cols-3`}>
          {guides.slice(0, 3).map((guide) => (
            <article key={guide.slug} className="flex min-h-48 flex-col overflow-hidden">
              {presentations.get(guide.slug)?.cover ? <Image src={presentations.get(guide.slug)!.cover!.src} alt={presentations.get(guide.slug)!.cover!.alt} width={presentations.get(guide.slug)!.cover!.width} height={presentations.get(guide.slug)!.cover!.height} className="h-44 w-full object-cover" sizes="(min-width: 1280px) 400px, (min-width: 768px) 33vw, 100vw" /> : null}
              <div className="flex flex-1 flex-col p-5">
              <p className={styles.label}>{guide.coverageType} · reviewed {guide.reviewedAt}</p>
              <h3 className={`${styles.editorial} mt-3 text-xl`}>{guide.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-300">{guide.summary}</p>
              <Link href={`/neighborhoods/${guide.slug}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Read guide</Link>
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
      <SellerAcquisitionHero campaignQuery={campaignQuery} phone={sellerIntroduction?.phone} />
      {sellerIntroduction ? <SellerIntroduction profile={sellerIntroduction} /> : null}
      <div>
        <SunsetHistorySection editorial />
        <HomeHero />
        <Suspense fallback={<div role="status" className="py-14 text-center text-sm text-slate-400">Loading curated properties…</div>}>
          <StagedPropertiesPocket />
        </Suspense>
        <NeighborhoodPreview />
        <InfoBoxes />
        <AnimalOfDaySection />
        <FAQSection />
      </div>
      <CounterScanActions showLeadOperations={access.allowed} />
    </div>
  );
}
