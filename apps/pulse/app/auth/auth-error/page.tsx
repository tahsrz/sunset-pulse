'use client';

import React from 'react';
import Link from 'next/link';
import { FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';

/**
 * Auth Error Page
 * Standardized error handling for authentication failures.
 */
export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-blue-600 selection:text-white">
      <div className="max-w-md w-full bg-slate-900 border border-white/10 p-10 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-8">
          <FaExclamationTriangle size={32} />
        </div>
        
        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase mb-4">
          Authentication Error
        </h1>
        
        <p className="text-slate-400 text-sm leading-relaxed mb-10">
          We were unable to verify your identity. This could be due to an expired session or an issue with the identity provider. Please try signing in again.
        </p>

        <div className="space-y-4">
          <Link 
            href="/login"
            className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-[10px] shadow-[0_10px_20px_rgba(37,99,235,0.2)]"
          >
            Return to Login
          </Link>
          
          <Link 
            href="/"
            className="flex items-center justify-center gap-2 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest pt-4"
          >
            <FaArrowLeft size={10} /> Back to Properties
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-[9px] font-mono text-slate-700 uppercase tracking-widest">
            Error Code: 401_AUTH_FAILURE
          </p>
        </div>
      </div>
    </div>
  );
}
