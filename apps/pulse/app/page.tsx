import React, { Suspense } from 'react';
import Link from 'next/link';
import { MessageSquare, ShoppingBasket, Sparkles } from 'lucide-react';
import InfoBoxes from '@/components/InfoBoxes';
import UnifiedPropertyStage from '@/components/marketing/UnifiedPropertyStage';
import ValuePropositionGrid from '@/components/marketing/ValuePropositionGrid';
import SunsetHistorySection from '@/components/marketing/SunsetHistorySection';
import FAQSection from '@/components/marketing/FAQSection';
import ArchitectureOverview from '@/components/architecture/ArchitectureOverview';
import { getCachedProperties } from '@/lib/core/propertyRecon';
import { HomeHero, HomeWorldHub } from '@/components/home/HomeDynamicSections';
import AnimalOfDaySection from '@/components/animals/AnimalOfDaySection';

/**
 * fetches curated properties on the server and streams them once resolved
 */
const StagedPropertiesPocket: React.FC = async () => {
  const stagedPropertiesRaw = await getCachedProperties({ showFeatured: true });
  
  // force serialization to plain objects for Client Component compatibility
  const stagedProperties = JSON.parse(JSON.stringify(stagedPropertiesRaw));

  return <UnifiedPropertyStage initialStagedProperties={stagedProperties} />;
};

const HomePage: React.FC = () => {
  return (
    <>
      <CounterScanActions />
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
    </>
  );
};

export default HomePage;

function CounterScanActions() {
  return (
    <section className="relative z-30 border-b border-cyan-200/15 bg-[#07131a] px-4 py-4 text-white shadow-2xl shadow-black/30 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-cyan-200/15 bg-white/[0.06] p-4 backdrop-blur md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
              <Sparkles size={13} />
              Scanned from Sunset?
            </p>
            <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight text-white md:text-4xl">
              Order food, check specials, or open the local chat.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              For grill pickup, start with the orange button. Your cart and last order will stay on this phone.
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3 md:mt-0 md:min-w-[460px]">
            <Link
              href="/grill"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-400 px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-lg shadow-orange-950/30 transition hover:bg-orange-300"
            >
              <ShoppingBasket size={17} />
              Order Food
            </Link>
            <Link
              href="/counter"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/15"
            >
              Specials
            </Link>
            <Link
              href="/sunset-chat"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-200/10 px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-cyan-50 transition hover:bg-cyan-200/15"
            >
              <MessageSquare size={17} />
              Chat
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
