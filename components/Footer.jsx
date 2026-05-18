'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import logo from '@/assets/images/logo.png';

const Footer = () => {
  const [year, setYear] = useState('');

  useEffect(() => {
    setYear(new Date().getFullYear().toString());
  }, []);

  return (
    <footer className='waterlily-section py-6 mt-24 border-t border-teal-200/10'>
      <div className='container mx-auto flex flex-col md:flex-row items-center justify-between px-4'>
        <div className='mb-4 md:mb-0'>
          <Image src={logo} alt='Logo' className='h-8 w-auto' />
        </div>

        <div className='flex flex-col md:flex-row items-center gap-4'>
          <p className='text-sm text-teal-100/65 mt-2 md:mt-0'>
            &copy; {year} SunsetCollective. All rights reserved.
          </p>
          <a 
            href="https://www.trec.texas.gov/forms/consumer-protection-notice" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-teal-200 hover:text-rose-200 hover:underline font-bold"
          >
            Texas Real Estate Commission Consumer Protection Notice (CN 1-5)
          </a>
          <span className="text-teal-200/25 hidden md:block">|</span>
          <a 
            href="/iabs" 
            className="text-xs text-teal-200 hover:text-rose-200 hover:underline font-bold"
          >
            IABS (Interactive)
          </a>
          <span className="text-teal-200/25 hidden md:block">|</span>
          <a 
            href="https://www.dropbox.com/scl/fi/xjnnszs2h24nq95tvdmts/Information-About-Brokerage-Services.pdf?rlkey=uwn66iikqswvjscfr86dos7tk&e=1&st=bp3w9yw4&dl=0" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-teal-200 hover:text-rose-200 hover:underline font-bold"
          >
            IABS (Dropbox PDF)
          </a>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
