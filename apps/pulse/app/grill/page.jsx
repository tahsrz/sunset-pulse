'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeProvider';
import { buildDefaultBurgerCustomization } from '@/lib/grill/orderRelay';
import { getDealByCode, normalizeCouponCode } from '@/lib/grill/deals';
import { 
  FaPlus, 
  FaMinus, 
  FaMapMarkerAlt, 
  FaUtensils, 
  FaTimes, 
  FaShoppingBasket, 
  FaArrowRight, 
  FaSpinner, 
  FaStar,
  FaTruck
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const GrillPage = () => {
  const searchParams = useSearchParams();
  const { cart, addToCart, cartTotal, couponCode, applyCoupon, lastOrder, reorderLastOrder } = useCart();
  const { intelligence, agentId } = useTheme();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [trayPulse, setTrayPulse] = useState(false);

  const { grill } = intelligence;

  useEffect(() => {
    const incomingCoupon = normalizeCouponCode(searchParams.get('coupon'));
    if (!incomingCoupon || incomingCoupon === couponCode) return;
    const deal = getDealByCode(incomingCoupon);
    if (!deal) return;

    applyCoupon(incomingCoupon);
    toast.success(`${deal.code} is ready in your cart.`, {
      position: 'bottom-right',
      autoClose: 1800,
    });
  }, [searchParams, couponCode, applyCoupon]);

  // Retrieve menu items from the MongoDB API
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`/api/menu?agentId=${agentId}`);
        if (res.ok) {
          const data = await res.json();
          // Support standard data wrapping
          setMenuItems(data.data || data);
        }
      } catch (error) {
        console.error('Failed to fetch menu:', error);
        toast.error('Could not load current grill menu.');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [agentId]);

  // Derive categories dynamically from database items
  const categories = ['All', ...Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)))];

  // Filter items based on selected tab
  const filteredItems = selectedCategory === 'All'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  // Extract Daisy's Picks
  const daisyPicks = menuItems.filter(item => item.isDaisyPick);

  // Extract Staff's Picks
  const staffPicks = menuItems.filter(item => item.isStaffPick);

  // Directly add item from grid with simple scale feedback
  const handleQuickAdd = (e, item) => {
    e.stopPropagation(); // Avoid opening the details modal
    addToCart({
      ...item,
      customization: buildDefaultBurgerCustomization(),
    });
    setTrayPulse(true);
    setTimeout(() => setTrayPulse(false), 300);
    toast.success(`Added ${item.name} to tray!`, {
      position: 'bottom-right',
      autoClose: 1500,
    });
  };

  // Open item detail modal
  const openItemDetails = (item) => {
    setSelectedItem(item);
    setModalQuantity(1);
    setSpecialInstructions('');
  };

  // Add customized items from modal
  const handleModalAdd = () => {
    if (!selectedItem) return;
    
    // Add in a loop to increment quantity in context
    for (let i = 0; i < modalQuantity; i++) {
      addToCart({
        ...selectedItem,
        instructions: specialInstructions,
        customization: buildDefaultBurgerCustomization(specialInstructions),
      });
    }

    setTrayPulse(true);
    setTimeout(() => setTrayPulse(false), 300);
    toast.success(`Added ${modalQuantity}x ${selectedItem.name} to tray!`, {
      position: 'bottom-right',
      autoClose: 2000,
    });

    setSelectedItem(null);
  };

  const handleReorderLastOrder = () => {
    if (!reorderLastOrder?.()) return;
    setTrayPulse(true);
    setTimeout(() => setTrayPulse(false), 300);
    toast.success('Previous order restored to your tray.', {
      position: 'bottom-right',
      autoClose: 1800,
    });
  };

  // Calculate cart items total quantity
  const totalItemsInCart = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className='min-h-screen bg-slate-950 text-white relative overflow-hidden font-sans pb-32'>
      
      {/* 1. Ambient Background Glowing Orbs */}
      <div className='absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.08),transparent_60%)] pointer-events-none'></div>
      <div className='absolute bottom-10 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.08),transparent_60%)] pointer-events-none'></div>
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.03),transparent_70%)] pointer-events-none'></div>

      {/* 2. Page Content Container */}
      <div className='max-w-6xl mx-auto px-4 py-12 relative z-10'>
        
        {/* Header Branding Section */}
        <header className='text-center mb-16 space-y-4'>
          <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-[0.2em]'>
            <FaStar className='animate-pulse' size={10} />
            Tactical Hub Hospitality
            <FaStar className='animate-pulse' size={10} />
          </div>
          
          <h1 className='text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-rose-500 to-purple-600 bg-clip-text text-transparent uppercase py-2'>
            {grill.name || 'Sunset Gas & Grill'}
          </h1>
          
          <p className='text-slate-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed font-light'>
            {grill.tagline || 'Sizzling hot local delicacies engineered with peak performance.'}
          </p>

          <div className='flex flex-wrap items-center justify-center gap-6 pt-2 text-sm text-slate-300'>
            {grill.mapUrl ? (
              <a 
                href={grill.mapUrl} 
                target='_blank' 
                rel='noopener noreferrer'
                className='inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors group'
              >
                <FaMapMarkerAlt className='text-rose-500 group-hover:scale-110 transition-transform' />
                <span className='border-b border-dashed border-orange-400/40 group-hover:border-orange-300'>{grill.address}</span>
              </a>
            ) : (
              <span className='inline-flex items-center gap-2'>
                <FaMapMarkerAlt className='text-rose-500' />
                {grill.address}
              </span>
            )}
            <span className='hidden sm:inline text-slate-600'>|</span>
            <span className='text-slate-400 font-mono text-xs uppercase tracking-widest bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-md'>
              Est. 1986 • Local Quality
            </span>
          </div>
        </header>

        {/* Local Mailbox Delivery Announcement Banner */}
        <div className='mb-16 max-w-3xl mx-auto'>
          <div className='relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-r from-slate-950 via-slate-900/60 to-slate-950 p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-orange-500/5 group hover:border-orange-500/35 transition-all duration-300'>
            <div className='absolute -right-12 -bottom-12 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-rose-500/10 rounded-full blur-2xl pointer-events-none animate-pulse' />
            <div className='flex flex-col md:flex-row items-center gap-5 text-center md:text-left relative z-10'>
              <div className='flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-600/20 border border-orange-500/30 text-orange-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md'>
                <FaTruck size={24} className='animate-pulse' />
              </div>
              <div className='space-y-1.5'>
                <h3 className='text-lg md:text-xl font-extrabold text-slate-100 uppercase tracking-wide flex flex-wrap items-center justify-center md:justify-start gap-3'>
                  Live in Sunset?
                  <span className='text-[10px] px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 font-bold uppercase tracking-wider animate-pulse'>
                    Flat Surcharge Delivery
                  </span>
                </h3>
                <p className='text-sm text-slate-400 font-light leading-relaxed max-w-xl'>
                  Engineered for neighborhood convenience. We deliver piping hot orders straight to your mailbox for a flat <strong className='text-orange-400 font-bold font-mono'>$10.00</strong> fee!
                </p>
              </div>
            </div>
            <Link
              href='/cart'
              className='shrink-0 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-orange-500/10 hover:scale-105 active:scale-95 transition-all relative z-10 flex items-center gap-2 group'
            >
              Order Now
              <FaArrowRight size={10} className='group-hover:translate-x-1 transition-transform' />
            </Link>
          </div>
        </div>

        {lastOrder?.items?.length > 0 && (
          <div className='mb-16 max-w-3xl mx-auto'>
            <div className='rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 md:p-6 shadow-xl shadow-amber-500/5 flex flex-col md:flex-row md:items-center md:justify-between gap-5'>
              <div>
                <p className='text-[10px] font-black uppercase tracking-[0.22em] text-amber-300'>Previous Order</p>
                <h2 className='mt-2 text-xl font-black text-white'>Want the same thing again?</h2>
                <p className='mt-1 text-sm text-slate-300'>
                  {lastOrder.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)} items saved from your last grill order.
                </p>
              </div>
              <button
                type='button'
                onClick={handleReorderLastOrder}
                className='shrink-0 rounded-2xl bg-amber-300 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-950 hover:bg-amber-200 active:scale-95 transition-all'
              >
                Reorder
              </button>
            </div>
          </div>
        )}

        {/* Daisy's Picks Section */}
        {daisyPicks.length > 0 && (
          <section className='mb-16 space-y-6 relative'>
            {/* Ambient subtle glow background */}
            <div className='absolute -left-12 -top-12 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none' />
            <div className='flex items-center gap-3 px-1'>
              <div className='h-8 w-1 bg-gradient-to-b from-orange-500 to-rose-600 rounded-full' />
              <div>
                <h2 className='text-2xl font-black uppercase tracking-wider text-slate-100 flex items-center gap-2'>
                  Daisy's Picks
                  <span className='text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold uppercase tracking-widest animate-pulse'>
                    Chef's Favorite
                  </span>
                </h2>
                <p className='text-xs text-slate-400 font-light mt-0.5'>Hand-selected local specialties guaranteed to satisfy.</p>
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
              {daisyPicks.map((item) => (
                <article
                  key={`daisy-${item._id || item.id}`}
                  onClick={() => openItemDetails(item)}
                  className='group relative backdrop-blur-xl bg-gradient-to-b from-slate-900/40 to-slate-950/40 border border-orange-500/20 rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/40 hover:shadow-[0_0_25px_rgba(249,115,22,0.15)] cursor-pointer flex flex-col justify-between min-h-[11rem]'
                >
                  <div className='absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent' />
                  <div>
                    <div className='flex justify-between items-start gap-4'>
                      <h3 className='text-xl font-bold text-slate-100 group-hover:text-orange-400 transition-colors'>
                        {item.name}
                      </h3>
                      <span className='text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-semibold uppercase tracking-wider'>
                        Featured
                      </span>
                    </div>
                    <p className='text-xs text-slate-400 mt-2 leading-relaxed font-light line-clamp-2'>
                      {item.description || 'Crafted with premium ingredients to fuel your day.'}
                    </p>
                  </div>
                  <div className='flex justify-between items-center mt-4 pt-3 border-t border-white/5'>
                    <div>
                      <span className='text-[9px] text-slate-500 uppercase tracking-widest font-mono block'>Featured Price</span>
                      <p className='text-xl font-black text-white tracking-tight'>
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleQuickAdd(e, item)}
                      className='flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white hover:bg-gradient-to-r hover:from-orange-500 hover:to-rose-600 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg'
                    >
                      <FaPlus size={10} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Staff's Picks Section */}
        {staffPicks.length > 0 && (
          <section className='mb-16 space-y-6 relative'>
            {/* Ambient subtle glow background */}
            <div className='absolute -right-12 -top-12 w-64 h-64 bg-rose-500/10 blur-[80px] rounded-full pointer-events-none' />
            <div className='flex items-center gap-3 px-1'>
              <div className='h-8 w-1 bg-gradient-to-b from-rose-500 to-orange-500 rounded-full' />
              <div>
                <h2 className='text-2xl font-black uppercase tracking-wider text-slate-100 flex items-center gap-2'>
                  Staff's Picks
                  <span className='text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold uppercase tracking-widest animate-pulse'>
                    Signature Meals
                  </span>
                </h2>
                <p className='text-xs text-slate-400 font-light mt-0.5'>Crafted and loved by our on-duty team.</p>
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
              {staffPicks.map((item) => (
                <article
                  key={`staff-${item._id || item.id}`}
                  onClick={() => openItemDetails(item)}
                  className='group relative backdrop-blur-xl bg-gradient-to-b from-slate-900/40 to-slate-950/40 border border-rose-500/20 rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-rose-500/40 hover:shadow-[0_0_25px_rgba(244,63,94,0.15)] cursor-pointer flex flex-col justify-between min-h-[11rem]'
                >
                  <div className='absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-rose-500/40 to-transparent' />
                  <div>
                    <div className='flex justify-between items-start gap-4'>
                      <h3 className='text-xl font-bold text-slate-100 group-hover:text-rose-400 transition-colors'>
                        {item.name}
                      </h3>
                      <span className='text-[9px] px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold uppercase tracking-wider'>
                        Staff Signature
                      </span>
                    </div>
                    <p className='text-xs text-slate-400 mt-2 leading-relaxed font-light line-clamp-2'>
                      {item.description || 'Crafted with premium ingredients to fuel your day.'}
                    </p>
                  </div>
                  <div className='flex justify-between items-center mt-4 pt-3 border-t border-white/5'>
                    <div>
                      <span className='text-[9px] text-slate-500 uppercase tracking-widest font-mono block'>Signature Price</span>
                      <p className='text-xl font-black text-white tracking-tight'>
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleQuickAdd(e, item)}
                      className='flex items-center justify-center w-8 h-8 rounded-full bg-rose-500 text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-orange-500 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg'
                    >
                      <FaPlus size={10} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Dynamic Category Tab Navigation */}
        <section className='mb-12'>
          <div className='flex justify-center'>
            <div className='backdrop-blur-md bg-white/[0.02] border border-white/10 rounded-full p-1.5 flex gap-1 overflow-x-auto max-w-full scrollbar-none'>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2 rounded-full text-xs md:text-sm font-semibold tracking-wide uppercase transition-all duration-300 whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-lg shadow-orange-500/20 scale-105'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                  id={`grill-tab-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Main Grid Section */}
        <main>
          {loading ? (
            /* Pulsing Loading Skeletons */
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
              {[1, 2, 3, 4].map((num) => (
                <div 
                  key={num} 
                  className='h-48 rounded-2xl bg-white/[0.01] border border-white/5 animate-pulse flex flex-col justify-between p-6'
                >
                  <div className='space-y-3'>
                    <div className='h-6 w-1/3 bg-white/10 rounded-md'></div>
                    <div className='h-4 w-2/3 bg-white/5 rounded-md'></div>
                    <div className='h-4 w-1/2 bg-white/5 rounded-md'></div>
                  </div>
                  <div className='flex justify-between items-center pt-4'>
                    <div className='h-8 w-1/4 bg-white/10 rounded-md'></div>
                    <div className='h-10 w-10 bg-white/10 rounded-full'></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Items Grid */
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <article 
                    key={item._id || item.id}
                    onClick={() => openItemDetails(item)}
                    className='group backdrop-blur-md bg-white/[0.02] border border-white/10 rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/5 cursor-pointer flex flex-col justify-between min-h-[12.5rem]'
                  >
                    {/* Glowing highlight trace on hover */}
                    <div className='absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none'></div>

                    <div>
                      <div className='flex justify-between items-start gap-4'>
                        <h2 className='text-2xl font-bold text-slate-100 group-hover:text-orange-400 transition-colors'>
                          {item.name}
                        </h2>
                        {item.category && (
                          <span className='text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-white/5 text-slate-400 font-semibold uppercase tracking-wider'>
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p className='text-sm text-slate-400 mt-2 leading-relaxed font-light'>
                        {item.description || 'Crafted with premium ingredients to fuel your day.'}
                      </p>
                    </div>

                    <div className='flex justify-between items-center mt-6 pt-4 border-t border-white/5'>
                      <div className='space-y-0.5'>
                        <span className='text-[10px] text-slate-500 uppercase tracking-widest font-mono block'>Price</span>
                        <p className='text-2xl font-black text-white tracking-tight'>
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                      
                      <button
                        onClick={(e) => handleQuickAdd(e, item)}
                        className='flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 border border-white/10 text-orange-400 hover:bg-gradient-to-r hover:from-orange-500 hover:to-rose-600 hover:text-white hover:border-transparent transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg'
                        title='Quick Add'
                        id={`grill-quick-add-${item._id || item.id}`}
                      >
                        <FaPlus size={12} />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className='col-span-full text-center py-16 backdrop-blur-md bg-white/[0.01] border border-dashed border-white/10 rounded-2xl'>
                  <FaUtensils size={40} className='mx-auto text-slate-600 mb-4 animate-bounce' />
                  <p className='text-slate-400 font-light'>The grill is currently cooling down. Check back shortly.</p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer Link & Secret Portal */}
        <footer className='mt-24 text-center border-t border-white/5 pt-8 relative'>
          <p className='text-slate-500 italic text-sm font-light'>
            "{grill.tagline || 'Always smoking, always hot.'}"
          </p>
          <Link 
            href="/grill/kds" 
            className="absolute bottom-[-10px] right-2 opacity-10 hover:opacity-80 text-[10px] text-slate-600 font-mono uppercase tracking-[0.4em] transition-opacity"
          >
            [ KDS Portal ]
          </Link>
        </footer>
      </div>

      {/* 3. Interactive Detail & Customization Modal Overlay */}
      {selectedItem && (
        <div className='fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 animate-fadeIn'>
          <div 
            className='bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-slideUp'
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient Header Banner */}
            <div className='h-2 bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600'></div>
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedItem(null)}
              className='absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full'
            >
              <FaTimes size={14} />
            </button>

            {/* Modal Body */}
            <div className='p-6 md:p-8 space-y-6'>
              <div className='space-y-2'>
                <span className='text-[10px] px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold uppercase tracking-wider inline-block'>
                  {selectedItem.category || 'Specialty'}
                </span>
                <h2 className='text-3xl font-extrabold text-white tracking-tight'>
                  {selectedItem.name}
                </h2>
                <p className='text-slate-400 text-sm font-light leading-relaxed'>
                  {selectedItem.description || 'Crafted with premium ingredients to fuel your day.'}
                </p>
              </div>

              {/* Special Instructions Input */}
              <div className='space-y-2'>
                <label className='text-xs font-semibold text-slate-400 uppercase tracking-widest block'>Special Instructions</label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder='e.g., No onions, extra sauce, well-done...'
                  maxLength={150}
                  className='w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-all resize-none h-20'
                  id="grill-special-instructions"
                />
              </div>

              {/* Quantity Controls & Dynamic Multiplier */}
              <div className='flex items-center justify-between py-4 border-t border-b border-white/5'>
                <div>
                  <span className='text-xs font-semibold text-slate-400 uppercase tracking-widest block'>Select Quantity</span>
                  <p className='text-lg font-bold text-white mt-1'>
                    ${(selectedItem.price * modalQuantity).toFixed(2)}
                  </p>
                </div>

                <div className='flex items-center gap-4 bg-slate-950 border border-white/10 rounded-full p-1.5'>
                  <button
                    onClick={() => setModalQuantity(prev => Math.max(1, prev - 1))}
                    className='w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all'
                    disabled={modalQuantity <= 1}
                  >
                    <FaMinus size={10} />
                  </button>
                  <span className='font-mono font-bold text-lg w-6 text-center text-white'>
                    {modalQuantity}
                  </span>
                  <button
                    onClick={() => setModalQuantity(prev => Math.min(10, prev + 1))}
                    className='w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all'
                    disabled={modalQuantity >= 10}
                  >
                    <FaPlus size={10} />
                  </button>
                </div>
              </div>

              {/* CTA Action Button */}
              <button
                onClick={handleModalAdd}
                className='w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 text-white font-bold tracking-wide uppercase transition-all duration-300 hover:opacity-90 active:scale-[0.98] shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2'
                id="grill-modal-add-button"
              >
                <FaShoppingBasket size={14} />
                Add to Tray • ${(selectedItem.price * modalQuantity).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Unified Floating Tray Hook (Renders only when items populate cart) */}
      {totalItemsInCart > 0 && (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-fadeIn'>
          <div className={`backdrop-blur-xl bg-slate-950/80 border border-orange-500/30 shadow-2xl shadow-orange-500/10 rounded-2xl p-4 flex items-center justify-between transition-all duration-300 ${
            trayPulse ? 'scale-105 border-orange-400/50 shadow-orange-500/25' : ''
          }`}>
            <div className='flex items-center gap-4'>
              <div className='relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-600/20 border border-orange-500/30 text-orange-400'>
                <FaShoppingBasket size={18} className={trayPulse ? 'animate-bounce' : ''} />
                <span className='absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black border border-slate-950 animate-pulse'>
                  {totalItemsInCart}
                </span>
              </div>
              <div>
                <p className='text-sm font-bold text-slate-100 uppercase tracking-wider'>My Order Tray</p>
                <p className='text-xs text-slate-400 mt-0.5 font-light'>
                  Subtotal: <span className='text-orange-400 font-semibold font-mono'>${cartTotal.toFixed(2)}</span>
                </p>
              </div>
            </div>

            <Link
              href='/cart'
              className='py-2.5 px-5 bg-gradient-to-r from-orange-500 to-rose-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-2 group'
              id="grill-floating-tray-review"
            >
              Review Tray
              <FaArrowRight size={10} className='group-hover:translate-x-1 transition-transform' />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrillPage;
