'use client';

import React, { useState, useEffect } from 'react';
import StageSwitcher, { StageMode } from './StageSwitcher';
import FeaturedPropertyCard from '../FeaturedPropertyCard';
import PropertyCard from '../PropertyCard';
import Spinner from '../Spinner';
import { Property } from '@/lib/types';
import marketingCopy from '@/config/marketing_copy.json';
import styles from '@/app/home.module.css';

interface UnifiedPropertyStageProps {
  initialStagedProperties: Property[];
  initialMode?: StageMode;
  compact?: boolean;
}

const UnifiedPropertyStage: React.FC<UnifiedPropertyStageProps> = ({ initialStagedProperties, initialMode = 'LIVE', compact = false }) => {
  const [mode, setMode] = useState<StageMode>(initialMode);
  const stagedProperties = Array.isArray(initialStagedProperties) ? initialStagedProperties : [];
  const curatedGrid = !compact ? 'grid grid-cols-1 gap-4 lg:grid-cols-2'
    : stagedProperties.length === 1 ? 'mx-auto grid max-w-4xl' : styles.curatedGrid;
  const [liveProperties, setLiveProperties] = useState<Property[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState(false);
  const { featured } = marketingCopy.section_headers;

  useEffect(() => {
    if (mode !== 'LIVE') return;
    const controller = new AbortController();
    const fetchLiveFeed = async () => {
      setLoadingLive(true);
      setLiveError(false);
      try {
        // Load current listings from the IDX feed.
        const res = await fetch('/api/idx/hot-moving', { signal: controller.signal });
        if (!res.ok) throw new Error('Listings unavailable');
        const json = await res.json();
        if (controller.signal.aborted) return;
        // The API returns { data: { listings: [...] } }
        const listings = Array.isArray(json.data?.listings) ? json.data.listings : [];
        setLiveProperties(listings.filter((listing: Property) => (
          listing?.source === 'MLS'
          && Array.isArray(listing.images)
          && listing.images.some((image: unknown) => typeof image === 'string' && (
            /^https:\/\//i.test(image) || image === '/images/property-placeholder.svg'
          ))
        )));
      } catch {
        if (!controller.signal.aborted) setLiveError(true);
      } finally {
        if (!controller.signal.aborted) setLoadingLive(false);
      }
    };
    void fetchLiveFeed();
    return () => controller.abort();
  }, [mode]);

  return (
    <section className={styles.section} aria-labelledby="home-listings-title">
      <div className={styles.frame}>
        <div className="mb-5">
          <p className={styles.label}>Regional Listings</p>
          <h2 id="home-listings-title" className="mb-2 mt-2 text-3xl sm:text-4xl">
            {mode === 'STAGED' ? featured.title : 'Active IDX Listings'}
          </h2>
          <p className="text-sm leading-6 text-slate-300">
            {mode === 'STAGED' ? featured.tagline : 'Current listings from the regional MLS feed'}
          </p>
        </div>

        <StageSwitcher mode={mode} onModeChange={setMode} liveStatus={loadingLive ? 'Loading current listings…' : liveError ? 'The listing feed is temporarily unavailable' : liveProperties.length + ' listings available to explore'} />

        <div className={styles.listings}>
          {mode === 'STAGED' ? (
            <div className={curatedGrid}>
              {stagedProperties.length ? stagedProperties.map(property => (
                property && <FeaturedPropertyCard key={property._id} property={property} stacked={compact} />
              )) : <p className={styles.panel + ' col-span-full p-6 text-slate-300'}>No curated listings are available right now.</p>}
            </div>
          ) : loadingLive ? (
            <div className="flex items-center gap-4 py-6">
              <Spinner loading={loadingLive} />
              <p className="text-sm text-slate-300">Loading regional listings...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {!liveError && liveProperties.length > 0 ? liveProperties.map(property => (
                property && <PropertyCard key={property._id} property={property} />
              )) : (
                <p className={styles.panel + ' col-span-full p-6 text-sm leading-6 text-slate-300'}>
                  {liveError ? 'We couldn’t load the listing feed. You can still browse curated properties above.' : 'No live listings are available right now.'}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-5">
          <a href={mode === 'STAGED' ? '/properties' : '/idx'} className={styles.action}>
            {mode === 'STAGED' ? 'Browse All Properties' : 'Open Full IDX Search'}
          </a>
        </div>
      </div>
    </section>
  );
};

export default UnifiedPropertyStage;
