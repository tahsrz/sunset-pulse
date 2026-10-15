import React, { Suspense } from 'react';
import Link from 'next/link';
import { Compass, DatabaseZap, ShoppingBasket, Sparkles } from 'lucide-react';
import { headers } from 'next/headers';
import InfoBoxes from '@/components/InfoBoxes';
import UnifiedPropertyStage from '@/components/marketing/UnifiedPropertyStage';
import ValuePropositionGrid from '@/components/marketing/ValuePropositionGrid';
import SunsetHistorySection from '@/components/marketing/SunsetHistorySection';
import FAQSection from '@/components/marketing/FAQSection';
import ArchitectureOverview from '@/components/architecture/ArchitectureOverview';
import { HomeHero, HomeWorldHub } from '@/components/home/HomeDynamicSections';
import SellerAcquisitionHero from '@/components/marketing/SellerAcquisitionHero';
import AnimalOfDaySection from '@/components/animals/AnimalOfDaySection';
import { getTourHotList } from '@/lib/data/tourHotList';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import styles from './home.module.css';

/**
 * fetches curated properties on the server and streams them once resolved
 */
const StagedPropertiesPocket: React.FC = async () => {
  const stagedPropertiesRaw = (await getTourHotList({ limit: 10 })).listings;
  
  // force serialization to plain objects for Client Component compatibility
  const stagedProperties = JSON.parse(JSON.stringify(stagedPropertiesRaw));

  return <UnifiedPropertyStage initialStagedProperties={stagedProperties} />;
};

const HomePage = async () => {
  const access = await getOperatorAccess(getRequestHostFromHeaders(await headers()));

  return (
    <div className={styles.homePage}>
      <SellerAcquisitionHero />
      <CounterScanActions showLeadOperations={access.allowed} />
      <HomeHero />
      <div className="waterlily-surface">
        <HomeWorldHub />
        <ValuePropositionGrid />
        <AnimalOfDaySection />
        
        {/* Partial Prerendering (PPR) Pocket */}
        <Suspense fallback={
          <div className="text-center py-20 text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
            Loading curated listings...
          </div>
        }>
          <StagedPropertiesPocket />
        </Suspense>

        <SunsetHistorySection />
        <InfoBoxes />
        <FAQSection />
        <ArchitectureOverview />
      </div>
    </div>
  );
};

export default HomePage;

function CounterScanActions({ showLeadOperations }: { showLeadOperations: boolean }) {
  return (
    <section className="relative z-30 border-b border-cyan-200/15 bg-[#07131a] px-4 py-4 text-white shadow-2xl shadow-black/30 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-5 rounded-3xl border border-cyan-200/15 bg-white/[0.06] p-5 backdrop-blur sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-8">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
              <Sparkles size={13} />
              Scanned from Sunset?
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">
              Order Food or Open The Explorer
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Start a grill pickup order or explore the Sunset Pulse map.
            </p>
          </div>

          <div className={`grid gap-3 ${showLeadOperations ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <Link
              href="/grill"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-400 px-4 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-950 shadow-lg shadow-orange-950/30 transition hover:bg-orange-300"
            >
              <ShoppingBasket size={17} />
              Order Food
            </Link>
            <Link
              href="/explorer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-200/10 px-4 py-4 text-xs font-black uppercase tracking-[0.18em] text-cyan-50 transition hover:bg-cyan-200/15"
            >
              <Compass size={17} />
              Explorer
            </Link>
            {showLeadOperations ? <Link
              href="/admin/research-desk"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200/25 bg-emerald-200/10 px-4 py-4 text-xs font-black uppercase tracking-[0.18em] text-emerald-50 transition hover:bg-emerald-200/15"
            >
              <DatabaseZap size={17} />
              Lead Operations
            </Link> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
