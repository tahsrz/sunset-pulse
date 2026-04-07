'use client';
import { useState, useEffect } from 'react';
import PropertyCard from '@/components/PropertyCard';
import Spinner from '@/components/Spinner';
import Pagination from '@/components/Pagination';
import Link from 'next/link';
import { FaMapMarkedAlt, FaList } from 'react-icons/fa';

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch(
          `/api/properties?page=${page}&pageSize=${pageSize}`
        );

        if (!res.ok) {
          console.warn('Failed to fetch data');
          setProperties([]);
          setTotalItems(0);
          return;
        }

        const data = await res.json();
        setProperties(data.properties);
        setTotalItems(data.total);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [page, pageSize]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  return loading ? (
    <Spinner />
  ) : (
    <section className='relative px-4 py-6'>
      <div className='container-xl lg:container m-auto px-4 py-6'>
        {/* Navigation Toggle Header */}
        <div className='flex justify-between items-center mb-10'>
          <h2 className='text-2xl font-black text-slate-800 uppercase italic tracking-tighter'>
            Property Grid
          </h2>
          <Link 
            href='/explorer'
            className='flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl transition-all'
          >
            <FaMapMarkedAlt className='text-sm' />
            Switch to Map Explorer
          </Link>
        </div>

        {properties.length === 0 ? (
          <p>No properties found</p>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {properties.map((property) => (
              <PropertyCard key={property._id} property={property} />
            ))}
          </div>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Floating Tactical Map Toggle */}
      <Link 
        href='/explorer'
        className='fixed bottom-10 right-10 z-50 group flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-full font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-blue-600 hover:scale-110 transition-all duration-300'
      >
        <div className='relative'>
          <div className='absolute inset-0 bg-blue-400 blur-md opacity-20 group-hover:opacity-40 transition-opacity' />
          <FaMapMarkedAlt className='relative text-lg group-hover:rotate-12 transition-transform' />
        </div>
        Explore via Map
      </Link>
    </section>
  );
};
export default Properties;
