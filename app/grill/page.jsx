'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeProvider';
import { FaPlus, FaMapMarkerAlt, FaUtensils } from 'react-icons/fa';
import { toast } from 'react-toastify';

const GrillPage = () => {
  const { addToCart } = useCart();
  const { intelligence, agentId } = useTheme();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const { grill } = intelligence;

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`/api/menu?agentId=${agentId}`);
        if (res.ok) {
          const data = await res.json();
          // The API returns a successResponse wrapper
          setMenuItems(data.data || data);
        }
      } catch (error) {
        console.error('Failed to fetch menu:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [agentId]);

  const handleAdd = (item) => {
    addToCart(item);
    toast.success(`Added ${item.name} to tray!`, {
      position: 'bottom-right',
      autoClose: 2000,
    });
  };

  return (
    <div className='min-h-screen bg-[#fdf6e3] py-12 px-4 font-serif'>
      <div className='max-w-4xl mx-auto border-4 border-[#5d2a18] p-1 bg-white shadow-2xl'>
        <div className='border-2 border-[#5d2a18] p-8'>
          
          {/* Header Section */}
          <header className='text-center mb-12'>
            <h1 className='text-6xl font-black text-[#b22222] uppercase tracking-tighter italic'>
              {grill.name}
            </h1>
            
            <div className='mt-2 mb-4'>
              {grill.mapUrl ? (
                <a 
                  href={grill.mapUrl} 
                  target='_blank' 
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-2 text-[#5d2a18] hover:text-[#b22222] font-bold uppercase tracking-widest text-sm transition-colors'
                >
                  <FaMapMarkerAlt />
                  {grill.address}
                </a>
              ) : (
                <span className='inline-flex items-center gap-2 text-[#5d2a18] font-bold uppercase tracking-widest text-sm'>
                  <FaMapMarkerAlt />
                  {grill.address}
                </span>
              )}
            </div>

            <div className='flex items-center justify-center gap-4'>
              <div className='h-px bg-[#5d2a18] w-20'></div>
              <p className='text-[#5d2a18] font-bold uppercase tracking-widest text-xs'>
                Est. 2026 • Local Intelligence Hub
              </p>
              <div className='h-px bg-[#5d2a18] w-20'></div>
            </div>
          </header>

          {/* Menu Grid */}
          {loading ? (
            <div className='flex flex-col items-center justify-center py-20 text-[#5d2a18] animate-pulse'>
              <FaUtensils size={48} className='mb-4' />
              <p className='font-bold uppercase tracking-[0.3em] text-xs'>Synchronizing Menu Grid...</p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8'>
              {menuItems.length > 0 ? (
                menuItems.map((item) => (
                  <div key={item._id || item.id} className='group flex justify-between items-start border-b border-dotted border-[#5d2a18] pb-4'>
                    <div className='flex-1 pr-4'>
                      <h2 className='text-2xl font-bold text-[#2c1810] group-hover:text-[#b22222] transition-colors'>
                        {item.name}
                      </h2>
                      <p className='text-sm italic text-gray-600 leading-tight'>
                        {item.description}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-xl font-bold text-[#2c1810] mb-2'>
                        ${item.price.toFixed(2)}
                      </p>
                      <button
                        onClick={() => handleAdd(item)}
                        className='bg-[#b22222] text-white p-2 rounded-full hover:bg-[#5d2a18] transition-all transform hover:scale-110 shadow-md'
                        title='Add to Tray'
                      >
                        <FaPlus size={12} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className='col-span-full text-center py-10'>
                  <p className='text-[#5d2a18] italic'>The grill is currently cooling down. Check back shortly.</p>
                </div>
              )}
            </div>
          )}

          {/* Footer Note */}
          <footer className='mt-16 text-center border-t-2 border-[#5d2a18] pt-6 relative'>
            <p className='text-[#5d2a18] font-bold italic'>
              "{grill.tagline}"
            </p>
            <Link 
              href="/grill/kds" 
              className="absolute bottom-0 right-0 opacity-0 hover:opacity-100 text-[8px] text-[#5d2a18] font-mono uppercase tracking-[0.5em] transition-opacity"
            >
              [ OPERATIONS_LOG ]
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default GrillPage;
