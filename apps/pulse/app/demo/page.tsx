'use client';

import React, { useState } from 'react';
import { FaBrain, FaCalculator, FaPhoneAlt, FaSatellite } from 'react-icons/fa';
import Live3DScene from '@/components/hero/Live3DScene';
import JamieChat from '@/components/JamieChat';
import IntelligenceRecap from '@/components/IntelligenceRecap';
import DemoHeader from '@/components/demo/DemoHeader';
import DemoHero from '@/components/demo/DemoHero';
import SpatialRecon from '@/components/demo/SpatialRecon';
import IntelligenceCore from '@/components/demo/IntelligenceCore';
import ROICalculator from '@/components/demo/ROICalculator';
import CallAssistDemo from '@/components/demo/CallAssistDemo';

const DemoPage = () => {
  const [activeStation, setActiveStation] = useState<'SPATIAL' | 'ANALYSIS' | 'CALL' | 'ROI'>('SPATIAL');

  const mockProperty = {
    _id: 'featured-property-001',
    name: 'Sunset Elite Plaza',
    type: 'Commercial Hybrid',
    location: { street: 'Pulse Corridor', city: 'Dallas', state: 'TX' },
    location_geo: { coordinates: [-96.7970, 32.7767] },
    rates: { monthly: 15000 },
    amenities: ['Professional Analytics', 'Advanced Security', 'Research Integration']
  };

  return (
    <div className='min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-600 selection:text-white'>
      {/* Background Visualization */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <Live3DScene />
      </div>

      <div className='relative z-10 container m-auto px-6 py-12'>
        <DemoHeader />
        <DemoHero />

        {/* Station Switcher */}
        <div className='flex gap-4 mb-8 overflow-x-auto pb-2'>
          {[
            { id: 'SPATIAL', label: 'Spatial Analysis', icon: <FaSatellite /> },
            { id: 'ANALYSIS', label: 'Analysis Engine', icon: <FaBrain /> },
            { id: 'CALL', label: 'Call Assist', icon: <FaPhoneAlt /> },
            { id: 'ROI', label: 'ROI Analysis', icon: <FaCalculator /> }
          ].map(s => (
            <button 
              key={s.id}
              onClick={() => setActiveStation(s.id as any)}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all whitespace-nowrap ${
                activeStation === s.id 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' 
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Dynamic Station View */}
        <div className='bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 shadow-2xl min-h-[600px] animate-in zoom-in-95 duration-500'>
          {activeStation === 'SPATIAL' && <SpatialRecon property={mockProperty} />}
          {activeStation === 'ANALYSIS' && <IntelligenceCore />}
          {activeStation === 'CALL' && <CallAssistDemo />}
          {activeStation === 'ROI' && <ROICalculator />}
        </div>

        <footer className='mt-24 pb-12 flex flex-col items-center gap-8 border-t border-white/5 pt-12'>
          <div className='flex flex-wrap justify-center gap-12'>
            <div className='text-center'>
              <div className='text-3xl font-mono font-bold text-blue-500'>3.0x</div>
              <div className='text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-1'>Conversion Efficiency</div>
            </div>
            <div className='text-center'>
              <div className='text-3xl font-mono font-bold text-blue-500'>20+</div>
              <div className='text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-1'>Market Data Points</div>
            </div>
            <div className='text-center'>
              <div className='text-3xl font-mono font-bold text-blue-500'>35</div>
              <div className='text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-1'>Custom Profiles</div>
            </div>
          </div>
          <div className='text-[8px] font-mono uppercase tracking-[0.5em] text-slate-600'>Professional Real Estate Analysis // Supported by Jamie AI</div>
        </footer>
      </div>

      {/* Overlay Components */}
      <div className='pointer-events-auto'>
        <JamieChat propertyData={mockProperty} />
      </div>
      <IntelligenceRecap />
    </div>
  );
};

export default DemoPage;
