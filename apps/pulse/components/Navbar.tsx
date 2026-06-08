'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, LogIn, LogOut, Menu, Search, User, X } from 'lucide-react';
import { FaShoppingBasket, FaShieldAlt } from 'react-icons/fa';
import logo from '@/assets/images/logo-white.png';
import profileDefault from '@/assets/images/profile.png';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { signOut as signOutAction } from '@/app/login/actions';
import { CartItem } from '@/lib/types';
import InvestorBar from './investor/InvestorBar';

interface ServerSessionUser {
  id: string;
  email?: string;
  image?: string | null;
  name?: string | null;
  role?: string;
}

type NavLink = {
  href: string;
  label: string;
  active: boolean;
  emphasis?: 'teal' | 'blue' | 'violet' | 'cyan' | 'emerald' | 'orange';
  compact?: boolean;
};

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { cart } = useCart() as { cart: CartItem[] };
  const isSigningOutRef = useRef(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const [serverSessionUser, setServerSessionUser] = useState<ServerSessionUser | null>(null);

  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const profileImage = user?.profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || serverSessionUser?.image || profileDefault;
  const sessionRole = user?.user_metadata?.role || serverSessionUser?.role;
  const isLoggedIn = Boolean(user || serverSessionUser);
  const isRealtorOrAdmin = user?.user_metadata?.role === 'realtor' || user?.user_metadata?.role === 'admin';

  const loginHref = useMemo(() => {
    if (!pathname || pathname === '/' || pathname === '/login') {
      return '/login';
    }
    return `/login?redirect=${encodeURIComponent(pathname)}`;
  }, [pathname]);

  const navLinks = useMemo<NavLink[]>(() => [
    { href: '/', label: 'Home', active: pathname === '/' },
    { href: '/atlas', label: 'Atlas', active: pathname === '/atlas', emphasis: 'cyan' },
    { href: '/jamie-vibes', label: 'Jamie', active: pathname.startsWith('/jamie-vibes'), emphasis: 'violet' },
    { href: '/idx', label: 'IDX Search', active: pathname === '/idx', emphasis: 'teal' },
    { href: '/properties', label: 'Properties', active: pathname === '/properties' },
    { href: '/explorer', label: 'Explorer', active: pathname === '/explorer', emphasis: 'teal' },
    ...(isRealtorOrAdmin ? [{ href: '/lead-gen', label: 'Lead Gen', active: pathname.startsWith('/lead-gen'), emphasis: 'blue' as const }] : []),
    { href: '/tah', label: 'TAH', active: pathname.startsWith('/tah'), emphasis: 'emerald', compact: true },
    { href: '/contracts/promulgated', label: 'Contracts', active: pathname.startsWith('/contracts/promulgated'), emphasis: 'cyan', compact: true },
    { href: '/abidan', label: 'Abidan', active: pathname === '/abidan', emphasis: 'violet', compact: true },
    { href: '/grill', label: 'Grill', active: pathname === '/grill' },
    { href: '/sunset-chat', label: 'Chat', active: pathname === '/sunset-chat', emphasis: 'orange', compact: true },
    { href: '/investors', label: 'Investors', active: pathname === '/investors', emphasis: 'orange', compact: true }
  ], [isRealtorOrAdmin, pathname]);

  const primaryLinks = navLinks.slice(0, 5);
  const overflowLinks = navLinks.slice(5);

  useEffect(() => {
    if (isSigningOutRef.current) {
      return;
    }
    let isCancelled = false;

    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        if (isCancelled) return;
        setServerSessionUser(body?.authenticated ? body.user : null);
      })
      .catch((error) => {
        console.error('[NAVBAR] Server session probe failed:', error);
      });

    return () => {
      isCancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMoreMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    setIsProfileMenuOpen(false);
    isSigningOutRef.current = true;
    setServerSessionUser(null);
    
    try {
      await signOutAction();
    } catch (err) {
      console.error('[NAVBAR] Server sign out failed:', err);
    }

    const { error } = await signOut();
    if (error) {
      console.error('[NAVBAR] Client sign out failed:', error.message);
      isSigningOutRef.current = false;
      return;
    }

    isSigningOutRef.current = false;
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-cyan-100/10 bg-[#06131d]/82 text-white shadow-[0_18px_60px_rgba(2,6,23,0.24)] backdrop-blur-2xl">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 md:h-[72px]">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-slate-100 transition hover:bg-white/[0.1] focus:outline-none focus:ring-2 focus:ring-cyan-300 lg:hidden"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <Link className="flex min-w-0 items-center gap-2" href="/">
              <Image className="h-9 w-auto shrink-0" src={logo} alt="Sunset Pulse" priority />
              <span className="truncate text-lg font-black tracking-tight sm:text-xl">Sunset Pulse</span>
            </Link>
          </div>

          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.045] p-1 lg:flex">
            {primaryLinks.map((link) => (
              <NavPill key={link.href} link={link} />
            ))}

            {overflowLinks.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  className={`flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold transition ${
                    overflowLinks.some((link) => link.active)
                      ? 'bg-white/[0.12] text-white'
                      : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
                  }`}
                  aria-label="Open more navigation links"
                  aria-expanded={isMoreMenuOpen}
                  onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                >
                  More
                  <ChevronDown size={16} className={isMoreMenuOpen ? 'rotate-180 transition' : 'transition'} />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-52 rounded-xl border border-cyan-400/20 bg-[#0a1e2d]/95 p-2 shadow-[0_20px_50px_rgba(8,112,184,0.25)] backdrop-blur-2xl z-[100] transition-all duration-200 origin-top-right scale-100 hover:border-cyan-400/30">
                    {overflowLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-all duration-200 border ${
                          link.active
                            ? desktopDropdownActiveClass(link.emphasis)
                            : 'border-transparent text-slate-200 hover:bg-white/[0.08] hover:text-white'
                        }`}
                      >
                        {link.label === 'Abidan' && <FaShieldAlt className="text-violet-300 shrink-0" />}
                        {link.label === 'Investors' && <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0 animate-pulse" />}
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <Link
              href="/idx"
              className="hidden items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-xs font-black uppercase text-cyan-50 transition hover:bg-cyan-200/15 sm:flex"
            >
              <Search size={15} />
              IDX
            </Link>

            <Link href="/cart" className="relative rounded-full p-2.5 text-slate-100 transition hover:bg-white/[0.08]" aria-label="Open cart">
              <FaShoppingBasket className="text-xl" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black leading-none text-white">
                  {itemCount}
                </span>
              )}
            </Link>

            {isLoggedIn ? (
              <div className="relative">
                <button
                  type="button"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  aria-label="Open profile menu"
                  aria-expanded={isProfileMenuOpen}
                >
                  {typeof profileImage === 'string' && !profileImageFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="h-10 w-10 rounded-full object-cover"
                      src={profileImage}
                      alt="Profile"
                      width={40}
                      height={40}
                      referrerPolicy="no-referrer"
                      onError={() => setProfileImageFailed(true)}
                    />
                  ) : (
                    <Image className="h-10 w-10 rounded-full object-cover" src={profileDefault} alt="Profile" width={40} height={40} />
                  )}
                  {sessionRole === 'realtor' && (
                    <div className="absolute -right-0.5 -top-0.5 rounded-md border border-blue-300/50 bg-blue-600 p-0.5 text-white shadow-lg">
                      <FaShieldAlt size={8} />
                    </div>
                  )}
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-56 overflow-hidden rounded-lg border border-white/10 bg-white py-1 text-slate-800 shadow-2xl z-[100]">
                    <Link href="/dashboard" className="flex items-center gap-2 px-4 py-3 text-sm font-bold hover:bg-slate-100">
                      <User size={16} />
                      Dashboard
                    </Link>
                    {!user?.user_metadata?.isSubscribed && sessionRole !== 'realtor' && (
                      <Link href="/premium" className="block px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-50">
                        Go Premium
                      </Link>
                    )}
                    <button onClick={handleSignOut} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-100">
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={loginHref}
                className="hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-50 sm:flex"
              >
                <LogIn size={16} />
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#071722]/96 px-3 pb-4 pt-3 shadow-2xl backdrop-blur-2xl">
          <div className="grid gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between rounded-md border px-4 py-3 text-sm font-bold transition ${
                  link.active
                    ? mobileActiveClass(link.emphasis)
                    : 'border-transparent text-slate-200 hover:border-white/10 hover:bg-white/[0.08]'
                } ${link.compact ? 'uppercase italic tracking-widest text-[11px]' : ''}`}
              >
                <span className="flex items-center gap-2">
                  {link.label === 'Abidan' && <FaShieldAlt className="text-violet-300" />}
                  {link.label === 'Investors' && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />}
                  {link.label}
                </span>
              </Link>
            ))}

            {!isLoggedIn && (
              <Link href={loginHref} className="mt-2 flex items-center gap-2 rounded-md border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15">
                <LogIn size={16} />
                Login
              </Link>
            )}
          </div>
        </div>
      )}

      <InvestorBar />
    </nav>
  );
};

function NavPill({ link }: { link: NavLink }) {
  return (
    <Link
      href={link.href}
      className={`rounded-full px-3 py-2 text-sm font-bold transition ${
        link.active
          ? desktopActiveClass(link.emphasis)
          : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
      }`}
    >
      {link.label}
    </Link>
  );
}

function desktopActiveClass(emphasis?: NavLink['emphasis']) {
  switch (emphasis) {
    case 'teal':
      return 'bg-teal-300/15 text-teal-100';
    case 'cyan':
      return 'bg-cyan-300/15 text-cyan-100';
    case 'violet':
      return 'bg-violet-300/15 text-violet-100';
    default:
      return 'bg-white/[0.12] text-white';
  }
}

function mobileActiveClass(emphasis?: NavLink['emphasis']) {
  switch (emphasis) {
    case 'teal':
      return 'border-teal-300/20 bg-teal-500/15 text-teal-100';
    case 'blue':
      return 'border-blue-300/20 bg-blue-600/15 text-blue-100';
    case 'violet':
      return 'border-violet-300/20 bg-violet-500/20 text-violet-100';
    case 'cyan':
      return 'border-cyan-300/20 bg-cyan-500/20 text-cyan-100';
    case 'emerald':
      return 'border-emerald-300/20 bg-emerald-500/20 text-emerald-100';
    case 'orange':
      return 'border-orange-300/20 bg-orange-600/20 text-orange-100';
    default:
      return 'border-white/10 bg-black/25 text-white';
  }
}

function desktopDropdownActiveClass(emphasis?: NavLink['emphasis']) {
  switch (emphasis) {
    case 'teal':
      return 'bg-teal-500/20 text-teal-100 border-teal-500/30';
    case 'blue':
      return 'bg-blue-500/20 text-blue-100 border-blue-500/30';
    case 'violet':
      return 'bg-violet-500/20 text-violet-100 border-violet-500/30';
    case 'cyan':
      return 'bg-cyan-500/20 text-cyan-100 border-cyan-500/30';
    case 'emerald':
      return 'bg-emerald-500/20 text-emerald-100 border-emerald-500/30';
    case 'orange':
      return 'bg-orange-500/20 text-orange-100 border-orange-500/30';
    default:
      return 'bg-white/10 text-white border-white/20';
  }
}

export default Navbar;
