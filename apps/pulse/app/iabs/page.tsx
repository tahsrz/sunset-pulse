import React from 'react';
import IABSForm from '@/components/property/IABSForm';

export const metadata = {
  title: 'IABS | Information About Brokerage Services',
  description: 'Texas Real Estate Commission mandatory disclosure regarding brokerage services.',
};

const IABSPage = () => {
  return (
    <main className="min-h-screen bg-slate-900 py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4">Brokerage Disclosure</h1>
          <p className="text-slate-400 uppercase tracking-[0.3em] text-[10px]">Texas Real Estate Commission // IABS 1-0</p>
        </div>
        <IABSForm />
      </div>
    </main>
  );
};

export default IABSPage;
