'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import logo from '@/assets/images/logo-white.png';
import { ComplianceLinks } from './ComplianceLinks';

const footerLinks = [
  { href: '/atlas', label: 'Atlas' },
  { href: '/idx', label: 'IDX Search' },
  { href: '/properties', label: 'Properties' },
  { href: '/explorer', label: 'Explorer' },
  { href: '/contact', label: 'Contact' }
];

const Footer = () => {
  const [year, setYear] = useState('');

  useEffect(() => {
    setYear(new Date().getFullYear().toString());
  }, []);

  return (
    <footer className="mt-24 border-t border-cyan-100/10 bg-[#06131d] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <Image src={logo} alt="Sunset Pulse" className="h-9 w-auto" />
            <span className="text-lg font-black text-white">Sunset Pulse</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
            A living atlas for North Texas real estate intelligence, place memory, and market context.
          </p>
        </div>

        <div>
          <p className="text-xs font-black uppercase text-cyan-200">Explore</p>
          <div className="mt-4 grid gap-3">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-semibold text-slate-300 transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-black uppercase text-cyan-200">Compliance</p>
          <div className="mt-4 grid gap-3">
            <ComplianceLinks />
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 px-4 py-5">
        <p className="mx-auto max-w-7xl text-xs text-slate-500">
          &copy; {year} SunsetCollective. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
