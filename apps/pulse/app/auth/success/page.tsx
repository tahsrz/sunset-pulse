'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaCheckCircle, FaArrowRight, FaShieldAlt } from 'react-icons/fa';

/**
 * Auth Success Page
 * Confirms successful authentication and redirects the user to the dashboard.
 */
export default function AuthSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-blue-600 selection:text-white">
      <div className="max-w-md w-full bg-slate-900 border border-white/10 p-10 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-3xl flex items-center justify-center text-green-500 mx-auto mb-8">
          <FaCheckCircle size={32} />
        </div>
        
        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase mb-4">
          Identity Verified
        </h1>
        
        <p className="text-slate-400 text-sm leading-relaxed mb-10">
          Authentication successful. Your session has been established and your security profile is now active.
        </p>

        <div className="space-y-4">
          <Link 
            href="/"
            className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-[10px] shadow-[0_10px_20px_rgba(37,99,235,0.2)] flex items-center justify-center gap-2"
          >
            Enter Management Console <FaArrowRight size={10} />
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-[10px] font-black text-green-500/50 uppercase tracking-widest">
            <FaShieldAlt size={10} /> Secure Session Active
          </div>
          <p className="text-[9px] font-mono text-slate-700 uppercase tracking-widest">
            Redirecting to properties...
          </p>
        </div>
      </div>
    </div>
  );
}
