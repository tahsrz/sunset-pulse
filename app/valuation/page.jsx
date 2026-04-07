'use client';
import { useState } from 'react';
import { FaHome, FaSearchLocation, FaChartLine, FaCheckCircle, FaBrain, FaMapMarkedAlt, FaFilePdf } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Link from 'next/link';

const ValuationPage = () => {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleEstimate = async (e) => {
    e.preventDefault();
    if (!address) return toast.error('Address required for recon.');
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
        toast.success("Intelligence Captured.");
      }
    } catch (error) {
      toast.error("Valuation protocol failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirmed(true);
    toast.success("Asset locked into Global Grid.");
  };

  const handleDownloadReport = () => {
    window.print();
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
      <section className='relative py-32 overflow-hidden no-print'>
        <div className='container m-auto px-6 text-center relative z-10'>
          <div className='inline-flex items-center gap-2 bg-blue-500/10 text-blue-500 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-8 border border-blue-500/20'>
            <FaChartLine /> Tactical Asset Valuation
          </div>
          <h1 className='text-7xl font-black uppercase italic tracking-tighter mb-8 leading-none'>
            Predict Your <span className='text-blue-500'>Market Gravity.</span>
          </h1>
          <p className='text-slate-500 max-w-2xl mx-auto mb-12 text-lg font-medium italic'>
            Broadcast your address to the Jamie AI grid. We triangulate historical data, local commerce gravity, and market momentum to deliver an elite intelligence briefing.
          </p>
          
          <form onSubmit={handleEstimate} className='max-w-2xl mx-auto relative group'>
            <div className='absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000'></div>
            <div className='relative flex items-center bg-slate-900 rounded-3xl p-2 border border-white/10'>
              <div className='pl-6 text-slate-500'>
                <FaSearchLocation size={20} />
              </div>
              <input 
                type='text' 
                placeholder='ENTER TARGET COORDINATES (ADDRESS)...'
                className='flex-1 bg-transparent border-none focus:ring-0 px-6 py-4 text-sm font-black uppercase tracking-widest placeholder:text-slate-700'
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <button 
                type='submit'
                disabled={loading}
                className='bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95'
              >
                {loading ? 'CALCULATING...' : 'INITIALIZE RECON'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className='container m-auto px-6 relative z-10 pb-20'>
        {result && (
          <div className='print-container max-w-5xl mx-auto bg-slate-900 border border-white/10 rounded-[3rem] p-12 animate-in zoom-in-95 duration-500 shadow-2xl relative'>
            {/* Print Only Header */}
            <div className='hidden print-header'>
              <h1 className='text-4xl font-black uppercase italic'>Sunset Pulse <span className='text-blue-600'>Intelligence Briefing</span></h1>
              <p className='text-slate-500 text-xs font-bold uppercase tracking-widest mt-2'>Tactical Asset Valuation Report // Generated: {new Date().toLocaleDateString()}</p>
            </div>

            <div className='absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] no-print'>Intelligence Captured</div>
            
            <div className='mb-8 pb-8 border-b border-white/5'>
              <h2 className='text-sm font-black text-blue-500 uppercase tracking-[0.3em] mb-2'>Target Address</h2>
              <p className='text-3xl font-black italic'>{result.address}</p>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-12 text-left mb-12'>
              <div className='space-y-2'>
                <h3 className='text-[10px] font-black uppercase text-slate-500 tracking-widest'>Pulse Estimate</h3>
                <div className='text-5xl font-black text-blue-500'>${result.estimate?.toLocaleString()}</div>
                <div className='text-[10px] font-mono text-green-400'>+4.2% EXPECTED APPRECIATION</div>
              </div>
              <div className='space-y-2'>
                <h3 className='text-[10px] font-black uppercase text-slate-500 tracking-widest'>Market Gravity Index</h3>
                <div className='text-4xl font-black uppercase italic'>Alpha 7</div>
                <div className='text-[10px] font-mono text-blue-400'>HIGH CONVERSION PROBABILITY</div>
              </div>
              <div className='space-y-2'>
                <h3 className='text-[10px] font-black uppercase text-slate-500 tracking-widest'>Asset Features</h3>
                <div className='flex flex-wrap gap-2 pt-2'>
                  {result.features?.map((f, i) => (
                    <span key={i} className='text-[8px] bg-white/5 border border-white/10 px-2 py-1 rounded font-black uppercase tracking-widest'>{f}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className='no-print flex flex-col md:flex-row gap-4 mt-12'>
              {!confirmed ? (
                <button 
                  onClick={handleConfirm}
                  className='flex-1 bg-green-600 hover:bg-green-500 py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg'
                >
                  <FaCheckCircle /> Confirm & Lock to Grid
                </button>
              ) : (
                <button 
                  onClick={handleDownloadReport}
                  className='flex-1 bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg'
                >
                  <FaFilePdf /> Download Tactical Briefing
                </button>
              )}
              <button 
                onClick={() => setResult(null)}
                className='px-10 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all border border-white/10'
              >
                Reset Recon
              </button>
            </div>

            {confirmed && (
              <div className='mt-8 p-6 bg-green-500/10 border border-green-500/20 rounded-3xl text-center no-print'>
                <p className='text-green-400 text-[10px] font-black uppercase tracking-widest'>Intelligence Grid Synchronized</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid Specs */}
      <section className='py-20 border-t border-white/5'>
        <div className='container m-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12'>
          {[
            { icon: <FaHome />, title: 'Asset Tracking', desc: 'Real-time monitoring of residential and RV asset values across the North Texas sector.' },
            { icon: <FaBrain />, title: 'Algorithmic Recon', desc: 'Custom intelligence streams triangulating local business data with property trends.' },
            { icon: <FaMapMarkedAlt />, title: 'Spatial Sync', desc: 'Instantly broadcast your asset status to the global reconnaissance map.' }
          ].map((item, i) => (
            <div key={i} className='space-y-4'>
              <div className='text-blue-500 text-3xl'>{item.icon}</div>
              <h3 className='text-xl font-black uppercase tracking-tight'>{item.title}</h3>
              <p className='text-slate-500 text-sm leading-relaxed'>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ValuationPage;
