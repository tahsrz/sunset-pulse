'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaHeart, FaMapMarkerAlt, FaBed, FaBath, FaRulerCombined, FaTrash, FaExternalLinkAlt, FaRobot } from 'react-icons/fa';
import Spinner from '@/components/Spinner';
import { toggleCollection } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';

const CollectionsPage = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/collections');
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCollections();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleRemove = async (e, propId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user?.id) return;

    try {
      await toggleCollection(user.id, propId);
      setProperties(prev => prev.filter(p => p._id !== propId));
      toast.success("Asset removed from Pulse Folder");
    } catch (err) {
      toast.error("Eviction failed.");
    }
  };

  if (loading) return <Spinner loading={loading} />;

  return (
    <div className='min-h-screen bg-slate-950 text-white p-8'>
      <header className='mb-12 max-w-7xl mx-auto flex justify-between items-end'>
        <div>
          <div className='flex items-center gap-3 text-red-500 mb-2'>
            <FaHeart size={20} className='animate-pulse' />
            <span className='text-[10px] font-black uppercase tracking-[0.5em] text-white/40'>Consumer_Grid</span>
          </div>
          <h1 className='text-6xl font-black italic tracking-tighter text-white'>My Pulse Folder</h1>
          <p className='text-slate-500 font-mono text-xs mt-2 uppercase tracking-widest'>Intelligence-backed asset collection</p>
        </div>
        <div className='text-right'>
          <div className='text-4xl font-mono font-bold text-red-500'>{properties.length}</div>
          <div className='text-[10px] font-black uppercase opacity-30'>Saved Assets</div>
        </div>
      </header>

      <div className='max-w-7xl mx-auto'>
        {properties.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-40 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]'>
            <div className='p-6 bg-white/5 rounded-full mb-6 opacity-20'>
              <FaHeart size={40} />
            </div>
            <h2 className='text-xl font-bold text-white/40 uppercase tracking-widest'>Your Folder is Empty</h2>
            <Link href='/properties' className='mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all'>
              Recon Properties
            </Link>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {properties.map((property) => (
              <div key={property._id} className='group bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden hover:border-red-500/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(239,68,68,0.1)]'>
                <Link href={`/properties/${property._id}`} className='relative block aspect-[16/10] overflow-hidden'>
                  <Image 
                    src={property.images?.[0] || '/images/properties/placeholder.jpg'} 
                    alt={property.name}
                    fill
                    className='object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[50%] group-hover:grayscale-0'
                  />
                  <div className='absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60' />
                  
                  <button 
                    onClick={(e) => handleRemove(e, property._id)}
                    className='absolute top-4 right-4 p-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all transform hover:rotate-12 active:scale-90 z-10'
                    title='Remove from Collection'
                  >
                    <FaTrash size={14} />
                  </button>

                  <div className='absolute bottom-4 left-4 right-4 flex justify-between items-end'>
                    <div className='bg-red-600/90 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2'>
                      <FaRobot size={10} /> Jamie_Verified
                    </div>
                    <div className='text-2xl font-black text-white'>
                      ${property.rates?.monthly?.toLocaleString() || property.rates?.nightly?.toLocaleString()}
                      <span className='text-[10px] font-normal opacity-60 ml-1'>/mo</span>
                    </div>
                  </div>
                </Link>

                <div className='p-6'>
                  <div className='flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2'>
                    <FaMapMarkerAlt className='text-blue-500' />
                    {property.location?.city}, {property.location?.state}
                  </div>
                  <h3 className='text-xl font-bold text-white mb-4 group-hover:text-red-500 transition-colors'>{property.name}</h3>
                  
                  <div className='grid grid-cols-3 gap-4 border-y border-white/5 py-4 mb-6'>
                    <div className='flex flex-col gap-1'>
                      <div className='text-[8px] font-black uppercase text-slate-500'>Beds</div>
                      <div className='flex items-center gap-2 text-xs font-bold'>
                        <FaBed size={12} className='text-blue-400' /> {property.beds}
                      </div>
                    </div>
                    <div className='flex flex-col gap-1'>
                      <div className='text-[8px] font-black uppercase text-slate-500'>Baths</div>
                      <div className='flex items-center gap-2 text-xs font-bold'>
                        <FaBath size={12} className='text-blue-400' /> {property.baths}
                      </div>
                    </div>
                    <div className='flex flex-col gap-1'>
                      <div className='text-[8px] font-black uppercase text-slate-500'>Sqft</div>
                      <div className='flex items-center gap-2 text-xs font-bold'>
                        <FaRulerCombined size={12} className='text-blue-400' /> {property.square_feet}
                      </div>
                    </div>
                  </div>

                  <div className='flex gap-3'>
                    <Link 
                      href={`/properties/${property._id}`}
                      className='flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-center transition-all flex items-center justify-center gap-2'
                    >
                      <FaExternalLinkAlt size={10} /> View Intel
                    </Link>
                    <Link 
                      href={`/properties/${property._id}?tour=true`}
                      className='flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-center transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2'
                    >
                      <FaRobot size={12} /> Start Tour
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default CollectionsPage;
