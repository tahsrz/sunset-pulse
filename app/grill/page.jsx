'use client';
import { useCart } from '@/context/CartContext';
import { FaPlus, FaMapMarkerAlt } from 'react-icons/fa'; // Added FaMapMarkerAlt for a nice icon
import { toast } from 'react-toastify';

const GrillPage = () => {
  const { addToCart } = useCart();

  const grillLocation = {
    location: {
      type: 'Point',
      coordinates: [33.4509181, -97.7734357],
    },
    street: '101 S. Council',
    city: 'Sunset',
    state: 'Texas',
    zipcode: '76270',
    mapUrl: 'https://www.google.com/maps/place/Sunset+Gas+And+Grill/@33.4509181,-97.7734357,17z/data=!3m1!4b1!4m6!3m5!1s0x864d87454c1b3ac3:0x56d4a198ade59dcb!8m2!3d33.4509181!4d-97.7734357!16s%2Fg%2F11c3p1ywp0?entry=ttu&g_ep=EgoyMDI2MDMxMS4wIKXMDSoASAFQAw%3D%3D'
  };

  const menuItems = [
    { id: 'h-01', name: 'Hamburger', price: 7.99, description: 'Fresh beef patty on a toasted bun' },
    { id: 'h-02', name: 'Hamburger Basket', price: 9.99, description: 'With hand-cut fries & a drink' },
    { id: 'c-01', name: 'Cheeseburger', price: 8.49, description: 'Melted American cheese & pickles' },
    { id: 'c-02', name: 'Cheeseburger Basket', price: 10.59, description: 'The cheeseburger experience with sides' },
    { id: 'bc-01', name: 'Bacon Cheeseburger', price: 10.99, description: 'Crispy bacon and melted cheese' },
    { id: 'bc-02', name: 'Bacon Cheeseburger Basket', price: 13.99, description: 'The ultimate roadside meal' },
  ];

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
              Sunset Gas & Grill
            </h1>
            
            <div className='mt-2 mb-4'>
              <a 
                href={grillLocation.mapUrl} 
                target='_blank' 
                rel='noopener noreferrer'
                className='inline-flex items-center gap-2 text-[#5d2a18] hover:text-[#b22222] font-bold uppercase tracking-widest text-sm transition-colors'
              >
                <FaMapMarkerAlt />
                {grillLocation.street}, {grillLocation.city}, {grillLocation.state}
              </a>
            </div>

            <div className='flex items-center justify-center gap-4'>
              <div className='h-px bg-[#5d2a18] w-20'></div>
              <p className='text-[#5d2a18] font-bold uppercase tracking-widest text-xs'>Est. 2026 • Montague County</p>
              <div className='h-px bg-[#5d2a18] w-20'></div>
            </div>
          </header>

          {/* Menu Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8'>
            {menuItems.map((item) => (
              <div key={item.id} className='group flex justify-between items-start border-b border-dotted border-[#5d2a18] pb-4'>
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
            ))}
          </div>

          {/* Footer Note */}
          <footer className='mt-16 text-center border-t-2 border-[#5d2a18] pt-6'>
            <p className='text-[#5d2a18] font-bold italic'>
              "Quality Meat • Friendly Service • Just Down the Road"
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default GrillPage;