'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import logo from '@/assets/images/logo-white.png';
import profileDefault from '@/assets/images/profile.png';
import { FaGoogle, FaShoppingBasket, FaCode, FaShieldAlt } from 'react-icons/fa';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeProvider';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { isDevMode } = useTheme();
  
  // session.user from next-auth had 'image', supabase user has 'user_metadata.avatar_url'
  // and my Profiles table has 'avatar_url'. 
  // For now I'll use user_metadata or fallback
  const profileImage = user?.user_metadata?.avatar_url || profileDefault;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  const pathname = usePathname();
  const { cart } = useCart();
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav className='bg-[var(--nav-bg)] border-b border-white/10 transition-colors duration-500'>
      <div className='mx-auto max-w-7xl px-2 sm:px-6 lg:px-8'>
        <div className='relative flex h-20 items-center justify-between'>
          <div className='flex flex-1 items-center justify-center md:items-stretch md:justify-start'>
            <Link className='flex flex-shrink-0 items-center' href='/'>
              <Image className='h-10 w-auto' src={logo} alt='Sunset Pulse' />
              <span className='hidden md:block text-white text-2xl font-bold ml-2'>
                Sunset Pulse
              </span>
            </Link>
            <div className='hidden md:ml-6 md:block'>
              <div className='flex space-x-2'>
                <Link href='/' className={`${pathname === '/' ? 'bg-black/20' : ''} text-white hover:bg-white/10 rounded-md px-3 py-2 transition-colors`}>Home</Link>
                <Link href='/properties' className={`${pathname === '/properties' ? 'bg-black/20' : ''} text-white hover:bg-white/10 rounded-md px-3 py-2 transition-colors`}>Properties</Link>
                {(user?.user_metadata?.role === 'realtor' || user?.user_metadata?.role === 'admin') && (
                  <Link href='/lead-gen' className={`${pathname.startsWith('/lead-gen') ? 'bg-blue-600/20 text-blue-400' : 'text-white'} hover:bg-white/10 rounded-md px-3 py-2 transition-colors`}>Lead Gen</Link>
                )}
                <Link href='/explorer' className={`${pathname === '/explorer' ? 'bg-blue-600/20 text-blue-400' : 'text-white'} hover:bg-white/10 rounded-md px-3 py-2 transition-colors flex items-center gap-2`}>
                  Explorer
                </Link>
                <Link href='/drone-demo' className={`${pathname === '/drone-demo' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'text-slate-300'} border border-transparent hover:bg-white/10 rounded-md px-3 py-2 transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest`}>
                  Drone Academy
                </Link>
                <Link href='/grill' className={`${pathname === '/grill' ? 'bg-black/20' : ''} text-white hover:bg-white/10 rounded-md px-3 py-2 transition-colors`}>Grill</Link>
                <Link href='/abidan' className={`${pathname === '/abidan' ? 'bg-blue-600/30 text-blue-200 border-blue-500/20' : 'text-slate-300'} border border-transparent hover:bg-white/10 rounded-md px-3 py-2 transition-all flex items-center gap-2 italic font-black uppercase text-[10px] tracking-widest`}>
                  <FaShieldAlt className='text-blue-500' /> Abidan
                </Link>
                
                {/* DEV MODE ONLY: ARCHITECTURE */}
                {isDevMode && (
                  <Link href='/architecture' className={`${pathname === '/architecture' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400'} hover:bg-white/10 flex items-center gap-2 rounded-md px-3 py-2 transition-all border border-transparent ${isDevMode ? 'border-orange-500/20' : ''}`}>
                    <FaCode /> Architecture
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className='absolute inset-y-0 right-0 flex items-center pr-2 md:static md:inset-auto md:ml-6 md:pr-0'>
            {!user && (
              <div className='hidden md:block md:ml-6'>
                <Link
                  href='/login'
                  className='flex items-center text-white bg-white/10 hover:bg-white/20 rounded-md px-3 py-2 transition-colors'
                >
                  <span>Login</span>
                </Link>
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

            {user && (
              <div className='relative ml-3 flex items-center gap-3'>
                {user?.user_metadata?.role === 'realtor' && (
                  <div className='hidden lg:flex flex-col items-end'>
                    <span className='text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] leading-none'>Realtor</span>
                    <span className='text-[10px] font-mono text-green-500 animate-pulse leading-none mt-1'>VALIDATED</span>
                  </div>
                )}
                <button
                  type='button'
                  className='relative flex rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 border border-white/10'
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                >
                  <Image className='h-9 w-9 rounded-full object-cover' src={profileImage} alt='Profile' width={36} height={36} />
                  {user?.user_metadata?.role === 'realtor' && (
                    <div className='absolute -right-1 -top-1 bg-blue-600 text-white p-0.5 rounded-md shadow-lg border border-blue-400'>
                      <FaShieldAlt size={8} />
                    </div>
                  )}
                </button>

                {isProfileMenuOpen && (
                  <div className='absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none'>
                    <Link href='/command-post' className='block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100' onClick={() => setIsProfileMenuOpen(false)}>Command Post</Link>
                    {!user?.user_metadata?.isSubscribed && (
                      <Link 
                        href='/premium'
                        className='block w-full text-left px-4 py-2 text-sm text-blue-600 font-bold hover:bg-blue-50 hover:text-blue-700 transition-colors'
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        🚀 Go Premium
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        signOut();
                        window.location.href = '/';
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
