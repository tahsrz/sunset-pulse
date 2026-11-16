import React, { cache, Suspense } from 'react';
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
import HomePropertySlideshow, { type HomePropertySlide } from '@/components/marketing/HomePropertySlideshow';
import AnimalOfDaySection from '@/components/animals/AnimalOfDaySection';
import { commercialSaleListings } from '@/config/commercial_sale_listings';
import { getUsableRemoteListingImages, type Listing } from '@/lib/data/listingContract';
import { getPublicListingById, searchListings } from '@/lib/data/listingRepository';
import { getTourHotList, isTourHotListQualifiedListing } from '@/lib/data/tourHotList';
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
  title: 'Buy or Sell with a Pulse Agent | Sunset Pulse',
  description: 'Find homes, explore local listings, or talk with a Pulse agent about selling your home.',
};

const featuredLimit = 4;
const addressAbbreviations: Record<string, string> = {
  rd: 'road', dr: 'drive', st: 'street', ln: 'lane', ave: 'avenue', blvd: 'boulevard', ct: 'court', pkwy: 'parkway',
  w: 'west', e: 'east', n: 'north', s: 'south',
};

const getCuratedListings = cache(async () => {
  try {
    return (await getTourHotList({ limit: featuredLimit })).listings;
  } catch (error) {
    console.error('[HOME_CURATED_LISTINGS_READ] Curated listings could not be loaded.', error);
    return [];
  }
});

async function FeaturedPropertySlideshow() {
  const slides: HomePropertySlide[] = [];
  const usedListings = new Set<string>();
  const usedPhotos = new Set<string>();
  const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

  function addSlides(listings: Listing[]) {
    for (const listing of listings) {
      if (slides.length === featuredLimit) break;
      if (!listing.display_public || (listing.is_demo && !isMockMode)) continue;

      const commercialListing = commercialSaleListings.find((item) => item.mls_id === listing.mls_id);
      if (commercialListing) {
        if (listing.listing_status.trim().toLowerCase() !== 'active' || listing.price_type !== 'sale') continue;
      } else if (!isTourHotListQualifiedListing(listing)) {
        continue;
      }

      const href = `/properties/${encodeURIComponent(listing.id)}`;
      const { street, city, state } = listing.location;
      const place = [city, state].filter(Boolean).join(', ');
      const address = [street, city, state].join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
        .replace(/\b(rd|dr|st|ln|ave|blvd|ct|w|e|n|s)\b/g, (word) => addressAbbreviations[word]);
      const keys = [`id:${listing.id}`];
      if (listing.mls_id) keys.push(`mls:${listing.mls_id}`);
      if (street) keys.push(`address:${address}`);
      if (keys.some((key) => usedListings.has(key))) continue;

      const photos = getUsableRemoteListingImages(listing);
      if (commercialListing && listing.images.includes(commercialListing.image_url) && commercialListing.image_url.startsWith('/')) {
        photos.unshift(commercialListing.image_url);
      }
      for (const photo of photos) {
        const url = new URL(photo, 'https://sunsetpulse.local');
        const photoKey = url.origin + url.pathname;
        if (usedPhotos.has(photoKey)) continue;

        slides.push({
          id: listing.id,
          name: street || listing.name,
          locality: commercialListing ? `Commercial sale · ${place}` : place,
          photo,
          href,
          credit: commercialListing ? `Listing courtesy of ${commercialListing.metadata.listing_office}` : undefined,
        });
        keys.forEach((key) => usedListings.add(key));
        usedPhotos.add(photoKey);
        break;
      }
    }
  }

  const [commercialResults, curated] = await Promise.all([
    Promise.allSettled(commercialSaleListings.map(({ mls_id }) => getPublicListingById(mls_id))),
    getCuratedListings(),
  ]);
  addSlides(commercialResults.flatMap((result) => {
    if (result.status === 'rejected') {
      console.error('[HOME_COMMERCIAL_LISTING_READ] A featured listing could not be loaded.', result.reason);
      return [];
    }
    return result.value ? [result.value] : [];
  }));
  addSlides(curated);
  if (slides.length < featuredLimit && !isMockMode) {
    try {
      addSlides(await searchListings({ source: 'MLS', priceType: 'sale' }, { limit: 100, includeLegacy: false, publicOnly: true }));
    } catch (error) {
      console.error('[HOME_SLIDESHOW_LISTINGS_READ] Additional listings could not be loaded.', error);
    }
  }
  return <HomePropertySlideshow slides={slides} />;
}

async function StagedPropertiesPocket() {
  const stagedProperties = JSON.parse(JSON.stringify(await getCuratedListings())) as Property[];
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
      <SellerAcquisitionHero
        sellerPlanHref={`/seller-plan${campaignQuery}#request`}
        slideshow={
          <Suspense fallback={<div aria-hidden="true" className="min-h-[250px] bg-[#0a2029] sm:min-h-[320px]" />}>
            <FeaturedPropertySlideshow />
          </Suspense>
        }
      />
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
