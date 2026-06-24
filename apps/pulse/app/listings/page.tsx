'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PropertyCard from '@/components/PropertyCard';
import PropertySearchForm from '@/components/PropertySearchForm';
import { FaGlobeAmericas, FaServer, FaMapMarkerAlt } from 'react-icons/fa';
import Spinner from '@/components/Spinner';

const MARKET_BOARDS = [
  { id: '', label: 'Global (All Boards)' },
  { id: '61', label: 'TRREB (Toronto)' },
  { id: '1', label: 'California MLS' },
  { id: '15', label: 'Texas Real Estate' },
  { id: 'internal', label: 'Sunset Pulse Verified' }
];

function normalizeListingPayload(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.properties)) return payload.data.properties;
  if (Array.isArray(payload?.data?.listings)) return payload.data.listings;
  if (Array.isArray(payload?.properties)) return payload.properties;
  if (Array.isArray(payload?.listings)) return payload.listings;
  return [];
}

export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const currentBoard = searchParams.get('boardId') || '';
  const currentCity = searchParams.get('city') || '';

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams(searchParams.toString());
        if (params.has('city') && !params.has('location')) {
          params.set('location', params.get('city') || '');
        }
        params.set('includeMLS', 'true');

        const res = await fetch(`/api/properties/search/advanced?${params.toString()}`, {
          cache: 'no-store'
        });
        const payload = await res.json();
        setListings(payload.success === false ? [] : normalizeListingPayload(payload));
      } catch (error) {
        console.error('Failed to load listings:', error);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [searchParams]);

  const handleBoardChange = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set('boardId', id);
    else params.delete('boardId');
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <main className="bg-slate-50 min-h-screen">
      {/* MLS Header Block */}
      <section className="bg-slate-900 text-white py-12 border-b border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <FaGlobeAmericas />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Unified MLS Engine</span>
              </div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">Market Listings</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 max-w-md">
                Combining <span className="text-green-400">Sunset Pulse Verified</span> properties with <span className="text-blue-400">Global MLS Search</span> for broader market coverage.
              </p>
              
              {/* Market / Board Selector */}
              <div className="mt-6 flex flex-wrap gap-2">
                {MARKET_BOARDS.map((board) => (
                  <button
                    key={board.id}
                    onClick={() => handleBoardChange(board.id)}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                      currentBoard === board.id 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {board.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
              <FaServer className="text-slate-500" />
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-tight">Data Integrity</p>
                <p className="text-xs font-bold text-green-400 uppercase tracking-widest">Active Connection</p>
              </div>
            </div>
          </div>
          
          <PropertySearchForm />
        </div>
      </section>

      {/* Dense Results Grid */}
      <section className="container mx-auto py-12 px-6">
        <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">
              {loading ? 'Loading Listings...' : `${listings.length} Properties Found`}
            </h2>
            {currentCity && (
              <span className="flex items-center gap-1 bg-blue-100 text-blue-600 px-2 py-1 rounded text-[9px] font-black uppercase">
                <FaMapMarkerAlt /> {currentCity}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <select className="bg-white border border-slate-200 text-[10px] font-bold uppercase py-2 px-4 rounded-lg outline-none">
              <option>Newest First</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>
        </div>

        {loading ? (
          <Spinner loading={loading} />
        ) : listings.length === 0 ? (
          <div className="bg-white border border-slate-200 p-20 rounded-[3rem] text-center">
            <p className="text-slate-400 font-medium italic">No listings found in the selected market region.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing: any) => (
              <PropertyCard key={listing._id} property={listing} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
