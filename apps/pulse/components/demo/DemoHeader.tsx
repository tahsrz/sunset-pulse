'use client';

import React from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaShieldAlt } from 'react-icons/fa';

const DemoHeader = () => {
  return (
    <header className='flex justify-between items-center mb-16'>
      <Link href='/' className='group flex items-center gap-3 bg-white/5 hover:bg-white/10 px-6 py-2.5 rounded-full border border-white/10 transition-all'>
        <FaArrowLeft className='group-hover:-translate-x-1 transition-transform text-blue-400' />
        <span className='text-[10px] font-bold uppercase tracking-[0.3em] text-white'>Return Home</span>
      </Link>
      <div className='flex items-center gap-4'>
        <div className='text-right hidden md:block'>
          <div className='text-[10px] font-bold uppercase text-blue-500 tracking-widest'>Platform Security</div>
          <div className='text-xs font-mono uppercase text-green-400'>Verified Session</div>
        </div>
        <div className='w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)] text-white'>
          <FaShieldAlt />
        </div>
      </div>
    </header>
  );
};

export default DemoHeader;
