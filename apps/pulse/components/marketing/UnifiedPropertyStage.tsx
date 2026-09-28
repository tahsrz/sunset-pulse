'use client';

import React, { useState, useEffect } from 'react';
import StageSwitcher, { StageMode } from './StageSwitcher';
import FeaturedPropertyCard from '../FeaturedPropertyCard';
import PropertyCard from '../PropertyCard';
import Spinner from '../Spinner';
import { Property } from '@/lib/types';
import marketingCopy from '@/config/marketing_copy.json';
import { FaHome, FaListUl } from 'react-icons/fa';

interface UnifiedPropertyStageProps {
  initialStagedProperties: Property[];
}

const UnifiedPropertyStage: React.FC<UnifiedPropertyStageProps> = ({ initialStagedProperties }) => {
  const [mode, setMode] = useState<StageMode>('LIVE');
  const stagedProperties = initialStagedProperties;
  const [liveProperties, setLiveProperties] = useState<Property[]>([]);
  const [loadingLive, setLoadingLive] = useState(true);
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
    <section className="py-16 sm:py-20 waterlily-section">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Stage Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-wider text-slate-300 mb-4">
            {mode === 'STAGED' ? <FaHome className="text-blue-400" /> : <FaListUl className="text-amber-400" />}
            {mode === 'STAGED' ? 'Curated Listings' : 'Live MLS Feed'}
          </div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter waterlily-heading mb-2">
            {mode === 'STAGED' ? featured.title : 'Active IDX Listings'}
          </h2>
          <p className="text-teal-100/70 text-sm leading-6">
            {mode === 'STAGED' ? featured.tagline : 'Current listings from the regional MLS feed'}
          </p>
        </div>

        {/* The Switcher */}
        <StageSwitcher mode={mode} onModeChange={setMode} liveStatus={loadingLive ? 'Loading current listings…' : liveError ? 'The listing feed is temporarily unavailable' : `${liveProperties.length} listings available to explore`} />

        {/* Property Grid */}
        <div className="relative min-h-[400px]">
          {mode === 'STAGED' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              {stagedProperties && Array.isArray(stagedProperties) && stagedProperties.length > 0 ? (
                stagedProperties.map((property) => (
                  property && <FeaturedPropertyCard key={property._id} property={property} />
                ))
              ) : (
                <div className="col-span-full text-center py-20 opacity-40 italic">No curated listings are available right now.</div>
              )}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              {loadingLive ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Spinner loading={loadingLive} />
                  <p className="text-sm text-teal-300 animate-pulse">Loading regional listings...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {!liveError && liveProperties.length > 0 ? (
                    liveProperties.map((property) => (
                      property && <PropertyCard key={property._id} property={property} />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-20 border border-dashed border-white/10 rounded-3xl">
                       <p className="text-slate-300 text-sm leading-6">{liveError ? 'We couldn’t load the listing feed. You can still browse curated properties above.' : 'No live listings are available right now.'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stage Footer Note */}
        <div className="mt-10 text-center">
          <p className="text-xs leading-5 text-slate-400">
            [ {mode} ] - {mode === 'STAGED' ? 'Curated property selection' : 'Regional IDX feed'}
          </p>
        </div>
      </div>
    </section>
  );
};

export default UnifiedPropertyStage;
