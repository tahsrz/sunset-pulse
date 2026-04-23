import React from 'react';
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
        <FeaturedProperties />
        <InfoBoxes />
        <FAQSection />
        <ArchitectureOverview />
      </div>
    </>
  );
};

export default HomePage;
