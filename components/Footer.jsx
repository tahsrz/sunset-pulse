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
    <footer className='bg-gray-200 py-4 mt-24'>
      <div className='container mx-auto flex flex-col md:flex-row items-center justify-between px-4'>
        <div className='mb-4 md:mb-0'>
          <Image src={logo} alt='Logo' className='h-8 w-auto' />
        </div>

        <div className='flex flex-col md:flex-row items-center gap-4'>
          <p className='text-sm text-gray-500 mt-2 md:mt-0'>
            &copy; {year} SunsetCollective. All rights reserved.
          </p>
          <a 
            href="https://www.trec.texas.gov/forms/consumer-protection-notice" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline font-bold"
          >
            Texas Real Estate Commission Consumer Protection Notice (CN 1-5)
          </a>
          <span className="text-gray-300 hidden md:block">|</span>
          <a 
            href="/iabs" 
            className="text-xs text-blue-600 hover:underline font-bold"
          >
            Information About Brokerage Services (IABS)
          </a>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
