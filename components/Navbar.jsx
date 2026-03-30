'use client';
import { useState, useEffect } from 'react'; // Added useEffect
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import logo from '@/assets/images/logo-white.png';
import profileDefault from '@/assets/images/profile.png';
import { FaGoogle, FaShoppingBasket } from 'react-icons/fa';
import { useCart } from '@/context/CartContext';

import { signIn, signOut, useSession, getProviders } from 'next-auth/react';

const Navbar = () => {
  const { data: session } = useSession(); // Get session data
  const profileImage = session?.user?.image || profileDefault; // Use Google image if logged in

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [providers, setProviders] = useState(null); // State for Google Providers
  
  const pathname = usePathname();
  const { cart } = useCart();
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const setAuthProviders = async () => {
      const res = await getProviders();
      setProviders(res);
    };
    setAuthProviders();
  }, []);

  return (
    <nav 
      className='border-b transition-colors duration-300 ease-in-out'
      style={{ backgroundColor: 'var(--primary-color)', borderBottomColor: 'var(--primary-color)', filter: 'brightness(1.1)' }}
    >
      <div className='mx-auto max-w-7xl px-2 sm:px-6 lg:px-8'>
        <div className='relative flex h-20 items-center justify-between'>
          {/* ... Mobile Button remains same ... */}

          <div className='flex flex-1 items-center justify-center md:items-stretch md:justify-start'>
            {/* Logo */}
            <Link className='flex flex-shrink-0 items-center' href='/'>
              <Image className='h-10 w-auto' src={logo} alt='Sunset Pulse' />
              <span className='hidden md:block text-white text-2xl font-bold ml-2'>
                Sunset Pulse
              </span>
            </Link>
            {/* Desktop Menu */}
            <div className='hidden md:ml-6 md:block'>
              <div className='flex space-x-2'>
                <Link href='/' className={`${pathname === '/' ? 'bg-black' : ''} text-white hover:bg-gray-900 hover:text-white rounded-md px-3 py-2`}>Home</Link>
                <Link href='/properties' className={`${pathname === '/properties' ? 'bg-black' : ''} text-white hover:bg-gray-900 hover:text-white rounded-md px-3 py-2`}>Properties</Link>
                <Link href='/grill' className={`${pathname === '/grill' ? 'bg-black' : ''} text-white hover:bg-gray-900 hover:text-white rounded-md px-3 py-2`}>Grill</Link>
              </div>
            </div>
          </div>

          {/* Right Side Icons */}
          <div className='absolute inset-y-0 right-0 flex items-center pr-2 md:static md:inset-auto md:ml-6 md:pr-0'>
            
            {!session && (
              <div className='hidden md:block md:ml-6'>
                <div className='flex items-center'>
                  {providers && Object.values(providers).map((provider, index) => (
                    <button
                      key={index}
                      onClick={() => signIn(provider.id)}
                      className='flex items-center text-white bg-gray-700 hover:bg-gray-900 rounded-md px-3 py-2'
                    >
                      <FaGoogle className='text-white mr-2' />
                      <span>Login or Register</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Link href='/cart' className='relative group px-3'>
              <FaShoppingBasket className='text-white text-2xl group-hover:text-gray-300' />
              {itemCount > 0 && (
                <span className='absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full'>
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Profile Dropdown - Only show if session exists */}
            {session && (
              <div className='relative ml-3'>
                <button
                  type='button'
                  className='relative flex rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800'
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                >
                  <Image className='h-8 w-8 rounded-full' src={profileImage} alt='Profile' width={32} height={32} />
                </button>

                {/* Profile Menu (Sign Out Button) */}
                {isProfileMenuOpen && (
                  <div className='absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none'>
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        signOut();
                      }}
                      className='block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left'
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;