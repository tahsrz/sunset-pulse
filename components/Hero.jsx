'use client';
import AdvancedSearchWidget from './AdvancedSearchWidget';

const Hero = () => {
  const handleSearch = (filters) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    window.location.href = `/properties/search-results?${params.toString()}`;
  };

  return (
    <section 
      className='py-20 mb-4 transition-colors duration-300 ease-in-out'
      style={{ backgroundColor: 'var(--primary-color)' }}
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center'>
        <div className='text-center'>
          <h1 className='text-4xl font-extrabold text-white sm:text-5xl md:text-6xl uppercase tracking-tighter'>
            Find The Perfect Rental
          </h1>
          <p className='my-4 text-xl text-white font-medium'>
            Discover the perfect property that suits your needs.
          </p>
        </div>
        <AdvancedSearchWidget onSearch={handleSearch} />
      </div>
    </section>
  );
};
export default Hero;
