'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowAltCircleLeft } from 'react-icons/fa';
import PropertyCard from '@/components/PropertyCard';
import Spinner from '@/components/Spinner';
import AdvancedSearchWidget from '@/components/AdvancedSearchWidget';

const SearchResultsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSearchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/properties/search/advanced?${searchParams.toString()}`);

        if (res.status === 200) {
          const data = await res.json();
          setProperties(data);
        } else {
          setProperties([]);
        }
      } catch (error) {
        console.error('[FETCH_SEARCH_RESULTS_ERROR]', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [searchParams]);

  const handleSearch = (filters) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        if (key === 'amenities') {
          if (filters[key].length > 0) params.append(key, filters[key].join(','));
        } else {
          params.append(key, filters[key]);
        }
      }
    });
    router.push(`/properties/search-results?${params.toString()}`);
  };

  return (
    <>
      <section className='bg-blue-700 py-10 shadow-inner'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <AdvancedSearchWidget onSearch={handleSearch} />
        </div>
      </section>
      
      {loading ? (
        <Spinner loading={loading} />
      ) : (
        <section className='px-4 py-6 bg-slate-50 min-h-screen'>
          <div className='container-xl lg:container m-auto px-4 py-6'>
            <Link
              href='/properties'
              className='inline-flex items-center text-blue-600 hover:text-blue-800 font-bold uppercase tracking-widest text-xs transition-colors mb-8'
            >
              <FaArrowAltCircleLeft className='mr-2' /> Back To All Properties
            </Link>
            
            <div className='flex items-end justify-between mb-8'>
              <div>
                <h1 className='text-4xl font-black text-slate-900 uppercase tracking-tighter'>Search Results</h1>
                <p className='text-slate-500 font-medium text-sm mt-1'>
                  Found {properties.length} matches across Internal & MLS Intelligence Streams
                </p>
              </div>
            </div>

            {properties.length === 0 ? (
              <div className='bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm'>
                <p className='text-slate-500 font-bold text-lg'>No tactical matches found. Adjust your Recon filters.</p>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
                {properties.map((property) => (
                  <PropertyCard key={property._id || property.mls_id} property={property} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
};
export default SearchResultsPage;
