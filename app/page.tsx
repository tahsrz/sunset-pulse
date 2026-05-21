import React, { Suspense } from 'react';
import CinematicHero from '@/components/CinematicHero';
import VirtualWorldHub from '@/components/world/VirtualWorldHub';
import InfoBoxes from '@/components/InfoBoxes';
import UnifiedPropertyStage from '@/components/marketing/UnifiedPropertyStage';
import ValuePropositionGrid from '@/components/marketing/ValuePropositionGrid';
import SunsetHistorySection from '@/components/marketing/SunsetHistorySection';
import FAQSection from '@/components/marketing/FAQSection';
import ArchitectureOverview from '@/components/architecture/ArchitectureOverview';
import { getCachedProperties } from '@/lib/core/propertyRecon';

/**
 * Dynamic Pocket: Fetches curated properties on the server and streams them once resolved.
 */
const StagedPropertiesPocket: React.FC = async () => {
  const stagedPropertiesRaw = await getCachedProperties({ showFeatured: true });
  
  // Force serialization to plain objects for Client Component compatibility
  const stagedProperties = JSON.parse(JSON.stringify(stagedPropertiesRaw));

  return <UnifiedPropertyStage initialStagedProperties={stagedProperties} />;
};

const HomePage: React.FC = () => {
  return (
    <>
      <CinematicHero />
      <div className="waterlily-surface">
        <VirtualWorldHub />
        <ValuePropositionGrid />
        
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
