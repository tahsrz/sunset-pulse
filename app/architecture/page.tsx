'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeProvider';
import { FaShieldAlt, FaLock } from 'react-icons/fa';
import InfrastructureSection from '@/components/architecture/InfrastructureSection';
import IntelligenceLayer from '@/components/architecture/IntelligenceLayer';
import EngineSection from '@/components/architecture/EngineSection';

const ArchitecturePage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isDevMode } = useTheme();
  const router = useRouter();

  const isSubscribed = user?.user_metadata?.isSubscribed;
  const hasAccess = isDevMode && isSubscribed;

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      const timer = setTimeout(() => {
        if (!hasAccess) router.push('/premium');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasAccess, authLoading, router]);

  if (authLoading) {
    return (
      <div className='min-h-screen bg-slate-950 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className='min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center'>
        <div className='p-6 bg-red-500/10 rounded-full mb-8 border border-red-500/20'>
          <FaLock className='text-6xl text-red-500' />
        </div>
        <h1 className='text-4xl font-black uppercase italic tracking-tighter text-white mb-4'>
          Access Restricted
        </h1>
        <p className='text-slate-400 max-w-md mb-8 leading-relaxed'>
          Technical specifications are restricted to authorized personnel. 
          Please ensure your professional subscription is active.
        </p>
        <button 
          onClick={() => router.push('/premium')}
          className='px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold uppercase tracking-widest transition-all'
        >
          View Plans
        </button>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100 p-8 font-sans'>
      <header className='mb-12 border-b border-slate-800 pb-6'>
        <h1 className='text-6xl font-black tracking-tighter uppercase italic text-blue-500'>
          Technical Specifications
        </h1>
        <p className='text-slate-400 font-mono text-sm mt-2'>
          AUTHORIZED ACCESS // SYSTEM: SUNSET PULSE v2.0
        </p>
      </header>

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-12 mb-20'>
        <InfrastructureSection />
        <IntelligenceLayer />
        <EngineSection />
      </div>

      <footer className='border-t border-white/10 pt-12 pb-20'>
        <div className='max-w-4xl mx-auto text-center'>
          <div className='inline-block p-4 bg-blue-600 text-white rounded-full mb-8'>
            <FaShieldAlt size={40} />
          </div>
          <h2 className='text-4xl font-black uppercase tracking-tighter italic mb-6'>
            Our Technical Vision
          </h2>
          <div className='space-y-6 text-lg text-slate-400 font-serif italic leading-relaxed'>
            <p>
              "Sunset Pulse represents the convergence of high-performance spatial computing and generative intelligence, creating a seamless bridge between data and user experience."
            </p>
            <p>
              "By integrating advanced analytics with dynamic UI generation, we have developed a platform that evolves alongside market trends and user behavior."
            </p>
          </div>
          <div className='mt-12 flex flex-col items-center'>
            <div className='h-px w-24 bg-slate-800 mb-4' />
            <div className='text-[10px] font-mono tracking-[0.5em] uppercase text-slate-500'>
              Precision // Intelligence // Innovation
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ArchitecturePage;
