import CinematicHero from '@/components/CinematicHero';
import InfoBoxes from '@/components/InfoBoxes';
import FeaturedProperties from '@/components/FeaturedProperties';

const HomePage = () => {
  return (
    <>
      <CinematicHero />
      <div className="bg-white">
        <FeaturedProperties />
        <InfoBoxes />
      </div>
    </>
  );
};
export default HomePage;
