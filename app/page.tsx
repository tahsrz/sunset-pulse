import React from 'react';
import CinematicHero from '@/components/CinematicHero';
import InfoBoxes from '@/components/InfoBoxes';
import FeaturedProperties from '@/components/FeaturedProperties';

const HomePage: React.FC = () => {
  return (
    <>
      <CinematicHero />
      <div className="bg-slate-950 pb-20">
        <FeaturedProperties />
        <InfoBoxes />
      </div>
    </>
  );
};

export default HomePage;
