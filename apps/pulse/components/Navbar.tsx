'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, Command as CommandIcon, LogIn, LogOut, Menu, Search, User, X } from 'lucide-react';
import { FaShoppingBasket, FaShieldAlt } from 'react-icons/fa';
import logo from '@/assets/images/logo-white.png';
import profileDefault from '@/assets/images/profile.png';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { signOut as signOutAction } from '@/app/login/actions';
import { CartItem } from '@/lib/types';
import InvestorBar from './investor/InvestorBar';
import { GlobalCommandPalette, type CommandPaletteRoute } from './GlobalCommandPalette';
import { appRoutes, routeDescription } from '@/lib/navigation/routeCatalog';
import { Button } from './ui/button';
import LeadIntakeDrawer from '@/components/admin/LeadIntakeDrawer';

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
  compact?: boolean;
};

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { cart } = useCart() as { cart: CartItem[] };
  const isSigningOutRef = useRef(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const [serverSessionUser, setServerSessionUser] = useState<ServerSessionUser | null>(null);

  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const profileImage = user?.profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || serverSessionUser?.image || profileDefault;
  const sessionRole = user?.user_metadata?.role || serverSessionUser?.role;
  const isLoggedIn = Boolean(user || serverSessionUser);
  const canOperateLeads = ['realtor', 'operator', 'admin'].includes(sessionRole || '');

  const loginHref = useMemo(() => {
    if (!pathname || pathname === '/' || pathname === '/login') {
      return '/login';
    }
    return `/login?redirect=${encodeURIComponent(pathname)}`;
  }, [pathname]);

  const { navLinks, primaryLinks, overflowLinks, commandRoutes } = useMemo(() => {
    const links: NavLink[] = [
      { href: '/', label: 'Home', active: pathname === '/' },
      { href: '/seller-plan', label: 'Sell', active: pathname === '/seller-plan' || pathname.startsWith('/seller-plan/') },
      { href: '/agent', label: 'Agent', active: pathname.startsWith('/agent') },
      { href: '/command-center', label: 'Command', active: pathname.startsWith('/command-center') },
      ...(canOperateLeads ? [{ href: '/admin/research-desk', label: 'Research Desk', active: pathname.startsWith('/admin/research-desk') || pathname.startsWith('/admin/lead-drafts') || pathname.startsWith('/admin/lead-engine') }] : []),
      { href: '/atlas', label: 'Atlas', active: pathname === '/atlas' },
      { href: '/spatial-lab', label: 'Spatial', active: pathname.startsWith('/spatial-lab') },
      { href: '/jamie-chat', label: 'Jamie', active: pathname.startsWith('/jamie-chat') || pathname.startsWith('/jamie-vibes') },
      { href: '/play-jamie', label: 'Play Jamie', active: pathname.startsWith('/play-jamie') },
      { href: '/idx', label: 'IDX Search', active: pathname === '/idx' },
      { href: '/value-guess', label: 'Value Guess', active: pathname.startsWith('/value-guess') },
      { href: '/properties', label: 'Properties', active: pathname === '/properties' },
      { href: '/explorer', label: 'Explorer', active: pathname === '/explorer' },
      ...(canOperateLeads ? [{ href: '/admin/lead-engine', label: 'Lead Engine', active: pathname.startsWith('/admin/lead-engine') }] : []),
      { href: '/tah', label: 'TAH', active: pathname.startsWith('/tah'), compact: true },
      { href: '/contracts/promulgated', label: 'Contracts', active: pathname.startsWith('/contracts/promulgated'), compact: true },
      { href: '/abidan', label: 'Abidan', active: pathname === '/abidan', compact: true },
      { href: '/grill', label: 'Grill', active: pathname === '/grill' },
      { href: '/sunset-chat', label: 'Chat', active: pathname === '/sunset-chat', compact: true },
      { href: '/investors', label: 'Investors', active: pathname === '/investors', compact: true },
      { href: '/contact', label: 'Contact', active: pathname === '/contact', compact: true },
    ];

    return {
      navLinks: links,
      primaryLinks: links.slice(0, 5),
      overflowLinks: links.slice(5),
      commandRoutes: appRoutes.map((route) => ({
        href: route.href, path: route.path, label: route.label, group: route.group,
        description: routeDescription(route), documentNavigation: route.kind === 'resource' && route.href === route.path,
        active: pathname === route.path,
      })) satisfies CommandPaletteRoute[],
    };
  }, [canOperateLeads, pathname]);

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
    setIsCommandOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    <nav className="sticky top-0 z-50 border-b border-[#303946] bg-[#0b0f17] text-white">
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

          <div className="hidden items-center gap-1 lg:flex">
            {primaryLinks.map((link) => (
              <NavItem key={link.href} link={link} />
            ))}

            {overflowLinks.length > 0 && (
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  className={`flex min-h-11 items-center gap-1 border-b-2 px-3 text-sm font-medium transition ${
                    overflowLinks.some((link) => link.active)
                      ? 'border-[#a7c5a7] text-white'
                      : 'border-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                  aria-label="Open more navigation links"
                  aria-expanded={isMoreMenuOpen}
                  onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                >
                  More
                  <ChevronDown size={16} className={isMoreMenuOpen ? 'rotate-180 transition' : 'transition'} />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-52 rounded border border-[#303946] bg-[#121923] p-2 z-[100]">
                    {overflowLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        aria-current={link.active ? "page" : undefined}
                        className={`flex items-center gap-2 rounded px-3 py-2.5 text-sm font-medium transition-all duration-200 border ${
                          link.active
                            ? "border-[#a7c5a7] text-white"
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
            {pathname?.startsWith('/admin') ? <LeadIntakeDrawer /> : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden rounded border border-white/15 bg-white/[0.045] px-3 text-slate-100 hover:bg-white/[0.09] md:inline-flex"
              aria-label="Open command palette"
              onClick={() => setIsCommandOpen(true)}
            >
              <CommandIcon size={15} />
              <span className="hidden xl:inline">Command</span>
              <kbd className="hidden rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-black text-slate-400 xl:inline-flex">
                ^K
              </kbd>
            </Button>

            <Link
              href="/idx"
              className="hidden items-center gap-2 rounded border border-white/15 px-3 py-2 font-mono text-xs uppercase text-slate-100 transition hover:bg-white/10 sm:flex"
            >
              <Search size={15} />
              IDX
            </Link>

            <Link href="/cart" className="relative rounded p-2.5 text-slate-100 transition hover:bg-white/[0.08]" aria-label="Open cart">
              <FaShoppingBasket className="text-xl" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black leading-none text-white">
                  {itemCount}
                </span>
              )}
            </Link>

            {isLoggedIn ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  className="relative flex h-10 w-10 items-center justify-center rounded border border-white/15 bg-white/[0.06] text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  aria-label="Open profile menu"
                  aria-expanded={isProfileMenuOpen}
                >
                  {typeof profileImage === 'string' && !profileImageFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="h-10 w-10 rounded object-cover"
                      src={profileImage}
                      alt="Profile"
                      width={40}
                      height={40}
                      referrerPolicy="no-referrer"
                      onError={() => setProfileImageFailed(true)}
                    />
                  ) : (
                    <Image className="h-10 w-10 rounded object-cover" src={profileDefault} alt="Profile" width={40} height={40} />
                  )}
                  {sessionRole === 'realtor' && (
                    <div className="absolute -right-0.5 -top-0.5 rounded-md border border-blue-300/50 bg-blue-600 p-0.5 text-white shadow-lg">
                      <FaShieldAlt size={8} />
                    </div>
                  )}
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-56 overflow-hidden rounded border border-slate-300 bg-white py-1 text-slate-800 z-[100]">
                    <Link href="/dashboard" className="flex items-center gap-2 px-4 py-3 text-sm font-bold hover:bg-slate-100">
                      <User size={16} />
                      Dashboard
                    </Link>
                    <Link href="/today" className="block px-4 py-3 text-sm font-bold hover:bg-slate-100">My Today</Link>
                    <div className="grid grid-cols-3 border-y border-slate-100 bg-slate-50 text-center text-xs font-semibold">
                      <Link href="/planner" className="px-2 py-3 hover:bg-slate-100">Planner</Link>
                      <Link href="/business" className="px-2 py-3 hover:bg-slate-100">Business</Link>
                      <Link href="/goals" className="px-2 py-3 hover:bg-slate-100">Goals</Link>
                    </div>
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
                className="inline-flex min-h-10 items-center gap-1.5 rounded border border-white/25 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 sm:gap-2 sm:px-4 sm:text-sm"
              >
                <LogIn size={16} />
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="max-h-[75dvh] overflow-y-auto border-t border-[#303946] bg-[#0b0f17] px-3 pb-4 pt-3 lg:hidden">
          <div className="divide-y divide-white/10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={link.active ? "page" : undefined}
                className={`flex min-h-11 items-center justify-between border-l-2 px-4 py-3 text-sm font-medium transition ${
                  link.active
                    ? "border-l-[#a7c5a7] bg-white/[0.06] text-white"
                    : 'border-transparent text-slate-200 hover:border-l-slate-500 hover:bg-white/[0.08]'
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

      <GlobalCommandPalette
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        routes={commandRoutes}
        isLoggedIn={isLoggedIn}
        loginHref={loginHref}
      />

      <InvestorBar />
    </nav>
  );
};

function NavItem({ link }: { link: NavLink }) {
  return (
    <Link
      href={link.href}
      aria-current={link.active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition ${
        link.active
          ? "border-[#a7c5a7] text-white"
          : 'border-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white'
      }`}
    >
      {link.label}
    </Link>
  );
}

export default Navbar;
