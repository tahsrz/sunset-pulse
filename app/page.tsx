import React, { Suspense } from 'react';
import CinematicHero from '@/components/CinematicHero';
import VirtualWorldHub from '@/components/world/VirtualWorldHub';
import InfoBoxes from '@/components/InfoBoxes';
import UnifiedPropertyStage from '@/components/marketing/UnifiedPropertyStage';
import ValuePropositionGrid from '@/components/marketing/ValuePropositionGrid';
import SunsetHistorySection from '@/components/marketing/SunsetHistorySection';
import FAQSection from '@/components/marketing/FAQSection';
import ArchitectureOverview from '@/components/architecture/ArchitectureOverview';
import { getProperties } from '@/lib/core/propertyRecon';

const HomePage: React.FC = async () => {
  const stagedPropertiesRaw = await getProperties({ showFeatured: true });
  
  // Force serialization to plain objects for Client Component compatibility
  const stagedProperties = JSON.parse(JSON.stringify(stagedPropertiesRaw));

  return (
    <>
      <CinematicHero />
      <div className="waterlily-surface">
        <VirtualWorldHub />
        <ValuePropositionGrid />
        
        <Suspense fallback={
          <div className="text-center py-20 text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
            Loading curated listings...
          </div>
        }>
          <UnifiedPropertyStage initialStagedProperties={stagedProperties} />
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
