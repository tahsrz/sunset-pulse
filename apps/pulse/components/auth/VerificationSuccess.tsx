'use client';

import React from 'react';
import Link from 'next/link';
import { FaEnvelope } from 'react-icons/fa';

interface VerificationSuccessProps {
  email: string;
}

const VerificationSuccess: React.FC<VerificationSuccessProps> = ({ email }) => {
  return (
    <div className='text-center py-10 space-y-6 animate-in zoom-in duration-500'>
      <div className='w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto border border-blue-500/30 text-white'>
        <FaEnvelope className='text-blue-400 animate-bounce' size={32} />
      </div>
      <div>
        <h2 className='text-2xl font-black italic text-white'>Verification Required</h2>
        <p className='text-slate-500 text-xs mt-2 uppercase tracking-widest leading-relaxed'>
          A confirmation link has been sent to <span className='text-blue-400'>{email}</span>.<br />
          Please check your inbox to activate your account.
        </p>
      </div>
      <Link 
        href="/login"
        className='inline-block w-full py-4 bg-white/5 text-white/40 rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-white/10 transition-all text-center'
      >
        Return to Sign In
      </Link>
    </div>
  );
};

export default VerificationSuccess;
