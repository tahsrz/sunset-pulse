'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import PropertyCard from '@/components/PropertyCard';
import Spinner from '@/components/Spinner';
import Pagination from '@/components/Pagination';
import { FaBullhorn } from 'react-icons/fa';

const LeadGenPropertiesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    const role = user?.user_metadata?.role;
    if (!user || (role !== 'realtor' && role !== 'admin')) {
      router.push('/');
      return;
    }

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
  }, [authLoading, page, pageSize, router, user]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  return (
    <section className='px-4 py-6 bg-slate-50 min-h-screen'>
      <div className='container-xl lg:container m-auto px-4 py-6'>
        <div className='bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8'>
          <div className='flex items-center gap-4 mb-4'>
            <div className='p-3 bg-blue-600 rounded-xl text-white shadow-lg'>
              <FaBullhorn size={24} />
            </div>
            <div>
              <h1 className='text-3xl font-black text-slate-900 uppercase italic tracking-tighter'>
                Lead Generation Command
              </h1>
              <p className='text-slate-500 text-sm font-medium'>
                Select an asset to configure automated capture funnels and intelligence intercepts.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : properties.length === 0 ? (
          <p>No properties found</p>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {properties.map((property) => (
              <div key={property._id} className="relative group">
                <PropertyCard property={property} />
                <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-all rounded-xl pointer-events-none border-2 border-transparent group-hover:border-blue-600/50" />
                <a 
                  href={`/lead-gen/${property._id}`}
                  className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xl transition-all opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                >
                  Configure Templates
                </a>
              </div>
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
    </section>
  );
};

export default LeadGenPropertiesPage;
