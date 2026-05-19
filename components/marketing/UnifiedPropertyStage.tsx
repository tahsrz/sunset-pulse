'use client';

import React, { useState, useEffect } from 'react';
import StageSwitcher, { StageMode } from './StageSwitcher';
import FeaturedPropertyCard from '../FeaturedPropertyCard';
import PropertyCard from '../PropertyCard';
import Spinner from '../Spinner';
import { Property } from '@/lib/types';
import marketingCopy from '@/config/marketing_copy.json';
import { FaBroadcastTower, FaShieldAlt } from 'react-icons/fa';

interface UnifiedPropertyStageProps {
  initialStagedProperties: Property[];
}

const UnifiedPropertyStage: React.FC<UnifiedPropertyStageProps> = ({ initialStagedProperties }) => {
  const [mode, setMode] = useState<StageMode>('LIVE');
  const [stagedProperties, setStagedProperties] = useState<Property[]>(initialStagedProperties);
  const [liveProperties, setLiveProperties] = useState<any[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const { featured } = marketingCopy.section_headers;

  useEffect(() => {
    if (mode === 'LIVE' && liveProperties.length === 0) {
      fetchLiveFeed();
    }
  }, [mode, liveProperties.length]);

  const fetchLiveFeed = async () => {
    setLoadingLive(true);
    try {
      // Ingest "Hot Moving Special" listings directly from the Matrix Grid
      const res = await fetch('/api/idx/hot-moving');
      if (res.ok) {
        const json = await res.json();
        // The API returns { data: { listings: [...] } }
        setLiveProperties(json.data.listings || []);
      }
    } catch (error) {
      console.error('[LIVE_FEED_ERROR]: Signal lost.', error);
    } finally {
      setLoadingLive(false);
    }
  };

  return (
    <section className="py-24 waterlily-section">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Stage Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4">
            {mode === 'STAGED' ? <FaShieldAlt className="text-blue-400" /> : <FaBroadcastTower className="text-amber-400" />}
            {mode === 'STAGED' ? 'Intelligence Stage' : 'Matrix Grid // Hot Moving'}
          </div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter waterlily-heading mb-2">
            {mode === 'STAGED' ? featured.title : 'Hot Moving Specials'}
          </h2>
          <p className="text-teal-100/55 text-[10px] font-mono uppercase tracking-[0.4em]">
            {mode === 'STAGED' ? featured.tagline : 'Real-time high-velocity listings from the North Texas grid'}
          </p>
        </div>

        {/* The Switcher */}
        <StageSwitcher mode={mode} onModeChange={setMode} />

        {/* Property Grid */}
        <div className="relative min-h-[400px]">
          {mode === 'STAGED' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              {stagedProperties && Array.isArray(stagedProperties) && stagedProperties.length > 0 ? (
                stagedProperties.map((property) => (
                  property && <FeaturedPropertyCard key={property._id} property={property} />
                ))
              ) : (
                <div className="col-span-full text-center py-20 opacity-40 italic">No staged intelligence available.</div>
              )}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              {loadingLive ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Spinner />
                  <p className="text-[10px] font-mono uppercase tracking-widest text-teal-400 animate-pulse">Syncing with regional grid...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {liveProperties && Array.isArray(liveProperties) && liveProperties.length > 0 ? (
                    liveProperties.map((property) => (
                      property && <PropertyCard key={property._id} property={property} />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-20 border border-dashed border-white/10 rounded-3xl">
                       <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">No live signals detected in this sector.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stage Footer Note */}
        <div className="mt-16 text-center">
          <p className="text-[8px] font-mono uppercase tracking-[0.6em] text-slate-600 italic">
            [ {mode} ] - {mode === 'STAGED' ? 'Consolidated via Jamie Core' : 'Direct Matrix Integration Proxy'}
          </p>
        </div>
      </div>
    </section>
  );
};

export default UnifiedPropertyStage;
