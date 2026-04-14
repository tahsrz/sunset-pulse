import React from 'react';
import CinematicHero from '@/components/CinematicHero';
import InfoBoxes from '@/components/InfoBoxes';
import FeaturedProperties from '@/components/FeaturedProperties';
import ArchitectureOverview from '@/components/architecture/ArchitectureOverview';

const HomePage: React.FC = () => {
  return (
    <>
      <CinematicHero />
      <div className="bg-slate-950">
        <FeaturedProperties />
        <InfoBoxes />
        <ArchitectureOverview />
      </div>
    </>
  );
};

export default HomePage;
