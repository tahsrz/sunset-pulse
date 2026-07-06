'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogIn, LogOut, Search, User, Compass, Hexagon, Crosshair, Wrench, ChevronRight } from 'lucide-react';
import { FaShoppingBasket, FaShieldAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/images/logo-white.png';
import profileDefault from '@/assets/images/profile.png';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { signOut as signOutAction } from '@/app/login/actions';
import { CartItem } from '@/lib/types';
import InvestorBar from './investor/InvestorBar';

// Types
type NavLink = {
  href: string;
  label: string;
  active: boolean;
  emphasis?: 'teal' | 'blue' | 'violet' | 'cyan' | 'emerald' | 'orange';
};

interface ServerSessionUser {
  id: string;
  email?: string;
  image?: string | null;
  name?: string | null;
  role?: string;
}

export default function AnchorNav() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { cart } = useCart() as { cart: CartItem[] };
  
  const [serverSessionUser, setServerSessionUser] = useState<ServerSessionUser | null>(null);
  const [activeCorner, setActiveCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const profileImage = user?.profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || serverSessionUser?.image || profileDefault;
  const isLoggedIn = Boolean(user || serverSessionUser);
  const isRealtorOrAdmin = user?.user_metadata?.role === 'realtor' || user?.user_metadata?.role === 'admin';

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        if (body?.authenticated) setServerSessionUser(body.user);
      })
      .catch(() => {});
  }, [user]);

  const handleSignOut = async () => {
    setActiveCorner(null);
    setServerSessionUser(null);
    try { await signOutAction(); } catch (err) {}
    await signOut();
    router.push('/');
    router.refresh();
  };

  const loginHref = !pathname || pathname === '/' || pathname === '/login' ? '/login' : `/login?redirect=${encodeURIComponent(pathname)}`;

  // Group links by corners
  const tlLinks: NavLink[] = [
    { href: '/', label: 'Home', active: pathname === '/' },
    { href: '/atlas', label: 'Atlas', active: pathname === '/atlas', emphasis: 'cyan' },
    { href: '/command-center', label: 'Command', active: pathname.startsWith('/command-center'), emphasis: 'cyan' },
  ];

  const trLinks: NavLink[] = [
    { href: '/idx', label: 'IDX Search', active: pathname === '/idx', emphasis: 'teal' },
    { href: '/value-guess', label: 'Value Guess', active: pathname.startsWith('/value-guess'), emphasis: 'orange' },
    { href: '/location-guess', label: 'Geo Guess', active: pathname.startsWith('/location-guess'), emphasis: 'orange' },
    { href: '/play-jamie', label: 'Play Jamie', active: pathname.startsWith('/play-jamie'), emphasis: 'violet' },
    { href: '/retail-clash', label: 'Retail Clash', active: pathname.startsWith('/retail-clash'), emphasis: 'orange' },
  ];

  const blLinks: NavLink[] = [
    { href: '/properties', label: 'Properties', active: pathname === '/properties' },
    { href: '/explorer', label: 'Explorer', active: pathname === '/explorer', emphasis: 'teal' },
    { href: '/jamie-chat', label: 'Jamie', active: pathname.startsWith('/jamie-chat') || pathname.startsWith('/jamie-vibes'), emphasis: 'violet' },
    ...(isRealtorOrAdmin ? [{ href: '/lead-gen', label: 'Lead Gen', active: pathname.startsWith('/lead-gen'), emphasis: 'blue' as const }] : []),
  ];

  const brLinks: NavLink[] = [
    { href: '/tah', label: 'TAH', active: pathname.startsWith('/tah'), emphasis: 'emerald' },
    { href: '/contracts/promulgated', label: 'Contracts', active: pathname.startsWith('/contracts/promulgated'), emphasis: 'cyan' },
    { href: '/abidan', label: 'Abidan', active: pathname === '/abidan', emphasis: 'violet' },
    { href: '/sunset-chat', label: 'Chat', active: pathname === '/sunset-chat', emphasis: 'orange' },
    { href: '/investors', label: 'Investors', active: pathname === '/investors', emphasis: 'orange' },
    { href: '/grill', label: 'Grill', active: pathname === '/grill' },
    { href: '/contact', label: 'Contact', active: pathname === '/contact', emphasis: 'blue' }
  ];

  // Animation variants
  const cornerVariants = {
    tl: { originX: 0, originY: 0 },
    tr: { originX: 1, originY: 0 },
    bl: { originX: 0, originY: 1 },
    br: { originX: 1, originY: 1 }
  };

  const menuVariants = {
    hidden: (corner: string) => ({
      opacity: 0,
      scale: 0.8,
      rotate: corner.includes('l') ? -15 : 15,
      transition: { duration: 0.2 }
    }),
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: { duration: 0.3, type: 'spring', bounce: 0.4 } as any
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <>
      <InvestorBar />
      
      {/* Top Left: Navigation Core */}
      <div 
        className="fixed top-4 left-4 z-50 group"
        onMouseEnter={() => setActiveCorner('tl')}
        onMouseLeave={() => setActiveCorner(null)}
      >
        <div className="relative">
          <div className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-cyan-200 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400 hover:bg-cyan-900/40">
            <Compass size={24} />
          </div>
          <AnimatePresence>
            {activeCorner === 'tl' && (
              <motion.div
                custom="tl"
                variants={menuVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                style={cornerVariants.tl}
                className="absolute left-14 top-0 ml-2 flex flex-col gap-2 p-2"
              >
                {tlLinks.map((link, i) => (
                  <motion.div key={link.href} variants={itemVariants} transition={{ delay: i * 0.05 }}>
                    <CornerLink link={link} onClick={() => setActiveCorner(null)} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Top Right: User & Actions */}
      <div 
        className="fixed top-4 right-4 z-50 group"
        onMouseEnter={() => setActiveCorner('tr')}
        onMouseLeave={() => setActiveCorner(null)}
      >
        <div className="relative">
          <div className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-amber-200 backdrop-blur-xl transition-all duration-300 hover:border-amber-400 hover:bg-amber-900/40">
            <User size={24} />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                {itemCount}
              </span>
            )}
          </div>
          <AnimatePresence>
            {activeCorner === 'tr' && (
              <motion.div
                custom="tr"
                variants={menuVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                style={cornerVariants.tr}
                className="absolute right-14 top-0 mr-2 flex flex-col items-end gap-2 p-2"
              >
                {/* User Account / Cart */}
                <motion.div variants={itemVariants} transition={{ delay: 0 }} className="flex gap-2">
                  <Link href="/cart" onClick={() => setActiveCorner(null)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:border-amber-400/50 hover:bg-white/10">
                    <FaShoppingBasket /> Cart
                  </Link>
                  {isLoggedIn ? (
                    <button onClick={handleSignOut} className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-200 backdrop-blur transition hover:bg-red-500/20">
                      <LogOut size={16} /> Exit
                    </button>
                  ) : (
                    <Link href={loginHref} onClick={() => setActiveCorner(null)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white px-4 py-2.5 text-sm font-bold text-black backdrop-blur transition hover:bg-cyan-50">
                      <LogIn size={16} /> Login
                    </Link>
                  )}
                </motion.div>
                
                {trLinks.map((link, i) => (
                  <motion.div key={link.href} variants={itemVariants} transition={{ delay: (i + 1) * 0.05 }}>
                    <CornerLink link={link} align="right" onClick={() => setActiveCorner(null)} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Left: Tools & Search */}
      <div 
        className="fixed bottom-4 left-4 z-50 group"
        onMouseEnter={() => setActiveCorner('bl')}
        onMouseLeave={() => setActiveCorner(null)}
      >
        <div className="relative">
          <div className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-teal-200 backdrop-blur-xl transition-all duration-300 hover:border-teal-400 hover:bg-teal-900/40">
            <Crosshair size={24} />
          </div>
          <AnimatePresence>
            {activeCorner === 'bl' && (
              <motion.div
                custom="bl"
                variants={menuVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                style={cornerVariants.bl}
                className="absolute bottom-14 left-0 mb-2 flex flex-col gap-2 p-2"
              >
                {[...blLinks].reverse().map((link, i) => (
                  <motion.div key={link.href} variants={itemVariants} transition={{ delay: i * 0.05 }}>
                    <CornerLink link={link} onClick={() => setActiveCorner(null)} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Right: Systems & Admin */}
      <div 
        className="fixed bottom-4 right-4 z-50 group"
        onMouseEnter={() => setActiveCorner('br')}
        onMouseLeave={() => setActiveCorner(null)}
      >
        <div className="relative">
          <div className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-violet-200 backdrop-blur-xl transition-all duration-300 hover:border-violet-400 hover:bg-violet-900/40">
            <Hexagon size={24} />
          </div>
          <AnimatePresence>
            {activeCorner === 'br' && (
              <motion.div
                custom="br"
                variants={menuVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                style={cornerVariants.br}
                className="absolute bottom-14 right-0 mb-2 flex flex-col items-end gap-2 p-2"
              >
                {[...brLinks].reverse().map((link, i) => (
                  <motion.div key={link.href} variants={itemVariants} transition={{ delay: i * 0.05 }}>
                    <CornerLink link={link} align="right" onClick={() => setActiveCorner(null)} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

function CornerLink({ link, align = 'left', onClick }: { link: NavLink; align?: 'left' | 'right'; onClick: () => void }) {
  const baseClasses = `flex items-center gap-3 rounded-xl border border-white/5 bg-black/80 px-4 py-2.5 text-sm font-bold backdrop-blur transition hover:scale-105 whitespace-nowrap`;
  const activeClasses = link.active ? getEmphasisClasses(link.emphasis) : 'text-slate-300 hover:border-white/20 hover:text-white';
  
  return (
    <Link href={link.href} onClick={onClick} className={`${baseClasses} ${activeClasses} ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      {link.label === 'Abidan' && <FaShieldAlt className="text-violet-300" />}
      {link.label === 'Investors' && <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />}
      {link.label}
      <ChevronRight size={14} className={`opacity-50 ${align === 'right' ? 'rotate-180' : ''}`} />
    </Link>
  );
}

function getEmphasisClasses(emphasis?: NavLink['emphasis']) {
  switch (emphasis) {
    case 'teal': return 'border-teal-500/30 bg-teal-500/10 text-teal-200';
    case 'cyan': return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
    case 'violet': return 'border-violet-500/30 bg-violet-500/10 text-violet-200';
    case 'blue': return 'border-blue-500/30 bg-blue-500/10 text-blue-200';
    case 'emerald': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    case 'orange': return 'border-orange-500/30 bg-orange-500/10 text-orange-200';
    default: return 'border-white/20 bg-white/10 text-white';
  }
}
