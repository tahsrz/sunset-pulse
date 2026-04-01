import Hero from '@/components/Hero';
import InfoBoxes from '@/components/InfoBoxes';
import HousingSections from '@/components/HousingSections';
import FeaturedProperties from '@/components/FeaturedProperties';

const HomePage = () => {
  return (
    <>
      <Hero />
      <InfoBoxes />
      <FeaturedProperties />
      <HousingSections />
    </>
  );
};
export default HomePage;
