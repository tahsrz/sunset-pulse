'use client';

import React, { useState, useMemo } from 'react';
import { FaGem } from 'react-icons/fa';

const ROICalculator = () => {
  const [leadsPerMonth, setLeadsPerMonth] = useState(50);
  const [averageCommission, setAverageCommission] = useState(8500);

  const roiMetrics = useMemo(() => {
    const baselineConversion = 0.02; // 2% industry standard
    const pulseConversion = 0.06;   // 6% optimized velocity
    
    const baselineRevenue = leadsPerMonth * baselineConversion * averageCommission;
    const pulseRevenue = leadsPerMonth * pulseConversion * averageCommission;
    const delta = pulseRevenue - baselineRevenue;

    return { baselineRevenue, pulseRevenue, delta };
  }, [leadsPerMonth, averageCommission]);

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-16 py-12 items-center'>
      <div className='space-y-10'>
        <h3 className='text-5xl font-black uppercase italic tracking-tighter text-white'>Performance <span className='text-blue-500'>Analysis.</span></h3>
        
        <div className='space-y-8 bg-white/5 p-8 rounded-[2rem] border border-white/5'>
          <div className='space-y-4'>
            <div className='flex justify-between items-end'>
              <label className='text-[10px] font-bold uppercase tracking-widest text-blue-400'>Monthly Lead Volume</label>
              <span className='text-2xl font-mono font-bold text-white'>{leadsPerMonth}</span>
            </div>
            <input 
              type='range' min='10' max='500' step='10' 
              value={leadsPerMonth} onChange={(e) => setLeadsPerMonth(parseInt(e.target.value))}
              className='w-full accent-blue-500'
            />
          </div>

          <div className='space-y-4'>
            <div className='flex justify-between items-end'>
              <label className='text-[10px] font-bold uppercase tracking-widest text-blue-400'>Average Commission</label>
              <span className='text-2xl font-mono font-bold text-white'>${averageCommission.toLocaleString()}</span>
            </div>
            <input 
              type='range' min='2000' max='50000' step='500' 
              value={averageCommission} onChange={(e) => setAverageCommission(parseInt(e.target.value))}
              className='w-full accent-blue-500'
            />
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='p-4 bg-white/5 rounded-2xl border border-white/5'>
            <div className='text-[8px] font-bold uppercase text-slate-500 mb-1'>Estimated Revenue</div>
            <div className='text-2xl font-mono font-bold text-green-400'>${roiMetrics.pulseRevenue.toLocaleString()}</div>
          </div>
          <div className='p-4 bg-blue-600/20 rounded-2xl border border-blue-500/30'>
            <div className='text-[8px] font-bold uppercase text-blue-400 mb-1'>Net Monthly Gain</div>
            <div className='text-2xl font-mono font-bold text-white'>+${roiMetrics.delta.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className='bg-white/5 border border-white/10 rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden'>
        <div className='absolute top-0 right-0 p-4 opacity-10 text-white'><FaGem size={100} /></div>
        <h4 className='text-xl font-bold uppercase italic tracking-tighter text-blue-400'>Professional Access</h4>
        <div className='text-6xl font-mono text-white'>$299<span className='text-xl opacity-30'>/mo</span></div>
        <ul className='space-y-4 relative z-10'>
          {[
            'Unlimited Spatial Analysis', 
            'Priority Research Assistant', 
            'Advanced Market Datasets', 
            'Dynamic Environment Profiles', 
            'Automated Lead Management'
          ].map(feature => (
            <li key={feature} className='flex items-center gap-3 text-sm font-bold text-slate-300'>
              <div className='w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]' /> {feature}
            </li>
          ))}
        </ul>
        <button className='w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-sm shadow-xl shadow-blue-600/20 transition-all hover:scale-105'>
          Upgrade to Professional
        </button>
      </div>
    </div>
  );
};

export default ROICalculator;
