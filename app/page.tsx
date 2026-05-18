import React, { Suspense } from 'react'; // <-- Added Suspense here
import CinematicHero from '@/components/CinematicHero';
import InfoBoxes from '@/components/InfoBoxes';
import FeaturedProperties from '@/components/FeaturedProperties';
import ArchitectureOverview from '@/components/architecture/ArchitectureOverview';
import ValuePropositionGrid from '@/components/marketing/ValuePropositionGrid';
import FAQSection from '@/components/marketing/FAQSection';

const HomePage: React.FC = () => {
  return (
    <>
      <CinematicHero />
      <div className="bg-slate-950">
        <ValuePropositionGrid />
        
        {/* @ts-expect-error Async Server Component */}
        <Suspense fallback={
          <div className="text-center py-20 text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
            Loading Featured Properties...
          </div>
        }>
          {/* @ts-expect-error Async Server Component */}
          <FeaturedProperties />
        </Suspense>

        <InfoBoxes />
        <FAQSection />
        <ArchitectureOverview />
      </div>
    </>
  );
};

export default HomePage;