'use client';

import React, { useState } from 'react';
import { FaHome, FaBrain, FaMapMarkedAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import ValuationHero from '@/components/valuation/ValuationHero';
import ValuationResult from '@/components/valuation/ValuationResult';
import ValuationAdminPanel from '@/components/valuation/ValuationAdminPanel';

const ValuationPage = () => {
  const { user } = useAuth();
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const isAdmin = user?.email === 'tahsrz@gmail.com';

  const handleEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return toast.error('Property address is required.');
    setLoading(true);
    try {
      const res = await fetch('/api/valuation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        toast.success("Property analysis complete.");
      }
    } catch (error) {
      toast.error("Valuation process encountered an error.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirmed(true);
    toast.success("Property added to market grid.");
  };

  const handleDownloadReport = () => {
    window.print();
  };

  const handleReset = () => {
    setResult(null);
    setConfirmed(false);
    setAddress('');
  };

  return (
    <div className='min-h-screen bg-slate-950 text-white'>
      <style jsx global>{`
        @media print {
          nav, footer, .no-print, button, form { display: none !important; }
          body { background: white !important; color: black !important; }
          .min-h-screen { background: white !important; }
          .print-container { 
            display: block !important; 
            padding: 40px !important;
            border: 2px solid #e2e8f0 !important;
            border-radius: 0 !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
          .text-white { color: black !important; }
          .text-slate-500 { color: #64748b !important; }
          .bg-slate-900 { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; }
          .bg-blue-600 { background: #2563eb !important; color: white !important; }
          .border-white\/10 { border-color: #e2e8f0 !important; }
          .print-header { display: block !important; margin-bottom: 40px; border-bottom: 4px solid #2563eb; padding-bottom: 20px; }
        }
      `}</style>

      {/* Hero Sector */}
      {!result && (
        <ValuationHero 
          address={address} 
          setAddress={setAddress} 
          onEstimate={handleEstimate} 
          loading={loading} 
        />
      )}

      <div className='container m-auto px-6 relative z-10 pb-20 pt-10'>
        {/* Admin Section */}
        {isAdmin && <ValuationAdminPanel />}

        {result && (
          <ValuationResult 
            result={result}
            confirmed={confirmed}
            onConfirm={handleConfirm}
            onDownload={handleDownloadReport}
            onReset={handleReset}
          />
        )}
      </div>

      {/* Grid Specs */}
      <section className='py-20 border-t border-white/5 no-print'>
        <div className='container m-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12'>
          {[
            { icon: <FaHome />, title: 'Real-Time Valuation', desc: 'Continuous monitoring of residential property values across local markets.' },
            { icon: <FaBrain />, title: 'Advanced Analysis', desc: 'Proprietary algorithms integrating local commerce data with real estate trends.' },
            { icon: <FaMapMarkedAlt />, title: 'Market Synchronization', desc: 'Seamlessly integrate property data into our professional reconnaissance network.' }
          ].map((item, i) => (
            <div key={i} className='space-y-4'>
              <div className='text-blue-500 text-3xl'>{item.icon}</div>
              <h3 className='text-xl font-bold uppercase tracking-tight text-white'>{item.title}</h3>
              <p className='text-slate-500 text-sm leading-relaxed'>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ValuationPage;
