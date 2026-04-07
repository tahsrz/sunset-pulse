'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaShieldAlt, FaRocket, FaGem, FaChartLine, FaBrain, FaSatellite, FaCalculator } from 'react-icons/fa';
import Live3DScene from '@/components/hero/Live3DScene';
import PropertyFiberViewer from '@/components/PropertyFiberViewer';
import JamieChat from '@/components/JamieChat';
import IntelligenceRecap from '@/components/IntelligenceRecap';
import PulsarSprite from '@/components/PulsarSprite';

const DemoPage = () => {
  const [activeStation, setActiveStation] = useState<'RECON' | 'INTEL' | 'ROI'>('RECON');
  
  // ROI Slider States
  const [leadsPerMonth, setLeadsPerMonth] = useState(50);
  const [averageCommission, setAverageCommission] = useState(8500);

  const mockProperty = {
    _id: 'elite-asset-001',
    name: 'Sunset Elite Plaza',
    type: 'Commercial Hybrid',
    location: { street: 'Pulse Corridor', city: 'Dallas', state: 'TX' },
    location_geo: { coordinates: [-96.7970, 32.7767] },
    rates: { monthly: 15000 },
    amenities: ['Neural Uplink', 'Tactical Security', 'Jamie Proximity']
  };

  const roiMetrics = useMemo(() => {
    const baselineConversion = 0.02; // 2% industry standard
    const pulseConversion = 0.06;   // 6% optimized velocity
    
    const baselineRevenue = leadsPerMonth * baselineConversion * averageCommission;
    const pulseRevenue = leadsPerMonth * pulseConversion * averageCommission;
    const delta = pulseRevenue - baselineRevenue;

    return { baselineRevenue, pulseRevenue, delta };
  }, [leadsPerMonth, averageCommission]);

  return (
    <div className='min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-600 selection:text-white'>
      {/* Background Neural Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <Live3DScene />
      </div>

      <div className='relative z-10 container m-auto px-6 py-12'>
        <header className='flex justify-between items-center mb-16'>
          <Link href='/' className='group flex items-center gap-3 bg-white/5 hover:bg-white/10 px-6 py-2.5 rounded-full border border-white/10 transition-all'>
            <FaArrowLeft className='group-hover:-translate-x-1 transition-transform text-blue-400' />
            <span className='text-[10px] font-black uppercase tracking-[0.3em]'>System Exit</span>
          </Link>
          <div className='flex items-center gap-4'>
            <div className='text-right hidden md:block'>
              <div className='text-[10px] font-black uppercase text-blue-500 tracking-widest'>Encryption Status</div>
              <div className='text-xs font-mono uppercase text-green-400'>AES-256 // Operational</div>
            </div>
            <div className='w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)]'>
              <FaShieldAlt />
            </div>
          </div>
        </header>

        {/* Hero Briefing */}
        <section className='max-w-4xl mb-24'>
          <div className='inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-8 border border-blue-500/20'>
            <FaRocket /> Strategic Briefing Protocol
          </div>
          <h1 className='text-7xl font-black uppercase italic tracking-tighter mb-8 leading-none'>
            Predictive <span className='text-blue-500 underline decoration-blue-500/30 underline-offset-8'>Spatial</span> Intelligence.
          </h1>
          <p className='text-slate-400 text-xl font-medium leading-relaxed max-w-2xl italic'>
            Sunset Pulse leverages high-fidelity 3D reconnaissance and generative neural architectures to eliminate market uncertainty. Experience the fusion of spatial data and autonomous conversion logic.
          </p>
        </section>

        {/* Tactical Stations Switcher */}
        <div className='flex gap-4 mb-8'>
          {[
            { id: 'RECON', label: 'Spatial Recon', icon: <FaSatellite /> },
            { id: 'INTEL', label: 'Neural Core', icon: <FaBrain /> },
            { id: 'ROI', label: 'ROI Analytics', icon: <FaCalculator /> }
          ].map(s => (
            <button 
              key={s.id}
              onClick={() => setActiveStation(s.id as any)}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${activeStation === s.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Station Display */}
        <div className='bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 shadow-2xl min-h-[600px] animate-in zoom-in-95 duration-500'>
          {activeStation === 'RECON' && (
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-12'>
              <div className='lg:col-span-8'>
                <PropertyFiberViewer property={mockProperty} />
              </div>
              <div className='lg:col-span-4 space-y-8'>
                <div>
                  <h3 className='text-2xl font-black uppercase italic tracking-tighter mb-4'>Autonomous Drone Recon</h3>
                  <p className='text-slate-400 text-sm leading-relaxed font-medium'>Navigate assets with sub-meter precision. Our procedural engine synthesizes environmental metadata—rooftop HVAC configurations, lawn integrity, and neighborhood gravity—providing a 360-degree tactical profile of every target.</p>
                </div>
                <div className='space-y-4'>
                  <div className='p-4 bg-white/5 rounded-2xl border border-white/5'>
                    <div className='text-[10px] font-black uppercase text-blue-400 mb-1'>Kinetic Intelligence</div>
                    <div className='text-xs font-bold'>Collision boundary enforcement and real-time telemetry streaming.</div>
                  </div>
                  <div className='p-4 bg-white/5 rounded-2xl border border-white/5'>
                    <div className='text-[10px] font-black uppercase text-blue-400 mb-1'>Dynamic Illumination</div>
                    <div className='text-xs font-bold'>Atmospheric syncing based on high-stakes temporal presets.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStation === 'INTEL' && (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <div className='mb-12'>
                <PulsarSprite intensity={1.5} status="ai" />
              </div>
              <h3 className='text-4xl font-black uppercase italic tracking-tighter mb-6'>Neural Core: Jamie</h3>
              <p className='text-slate-400 max-w-2xl text-lg mb-12 font-medium'>Jamie is your autonomous lead data researcher. Utilizing a 20-vector socioeconomic context, he provides persistent memory across sessions, predictive strategic intercepts, and vocal reconnaissance briefings.</p>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6 w-full'>
                <div className='p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl'>
                  <div className='text-2xl mb-4 text-blue-400'><FaBrain /></div>
                  <h4 className='text-sm font-black uppercase mb-2'>Context Retention</h4>
                  <p className='text-[10px] text-slate-500 uppercase tracking-widest font-bold'>Persistent memory bridge ensures continuity in high-stakes negotiations.</p>
                </div>
                <div className='p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl'>
                  <div className='text-2xl mb-4 text-blue-400'><FaSatellite /></div>
                  <h4 className='text-sm font-black uppercase mb-2'>Vector Triangulation</h4>
                  <p className='text-[10px] text-slate-500 uppercase tracking-widest font-bold'>Analysis of 20 socioeconomic data points to predict asset momentum.</p>
                </div>
                <div className='p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl'>
                  <div className='text-2xl mb-4 text-blue-400'><FaShieldAlt /></div>
                  <h4 className='text-sm font-black uppercase mb-2'>Tactical Recaps</h4>
                  <p className='text-[10px] text-slate-500 uppercase tracking-widest font-bold'>Automated session summaries and predicted tactical next-moves.</p>
                </div>
              </div>
            </div>
          )}

          {activeStation === 'ROI' && (
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-16 py-12 items-center'>
              <div className='space-y-10'>
                <h3 className='text-5xl font-black uppercase italic tracking-tighter'>Performance <span className='text-blue-500'>Intelligence.</span></h3>
                
                {/* Interactive ROI Calculator */}
                <div className='space-y-8 bg-white/5 p-8 rounded-[2rem] border border-white/5'>
                  <div className='space-y-4'>
                    <div className='flex justify-between items-end'>
                      <label className='text-[10px] font-black uppercase tracking-widest text-blue-400'>Monthly Lead Volume</label>
                      <span className='text-2xl font-mono font-bold'>{leadsPerMonth}</span>
                    </div>
                    <input 
                      type='range' min='10' max='500' step='10' 
                      value={leadsPerMonth} onChange={(e) => setLeadsPerMonth(parseInt(e.target.value))}
                      className='w-full accent-blue-500'
                    />
                  </div>

                  <div className='space-y-4'>
                    <div className='flex justify-between items-end'>
                      <label className='text-[10px] font-black uppercase tracking-widest text-blue-400'>Average Comm. Per Asset</label>
                      <span className='text-2xl font-mono font-bold'>${averageCommission.toLocaleString()}</span>
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
                    <div className='text-[8px] font-black uppercase text-slate-500 mb-1'>Pulse Revenue (6% Conv.)</div>
                    <div className='text-2xl font-mono font-bold text-green-400'>${roiMetrics.pulseRevenue.toLocaleString()}</div>
                  </div>
                  <div className='p-4 bg-blue-600/20 rounded-2xl border border-blue-500/30'>
                    <div className='text-[8px] font-black uppercase text-blue-400 mb-1'>Net Monthly Gain</div>
                    <div className='text-2xl font-mono font-bold'>+${roiMetrics.delta.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className='bg-white/5 border border-white/10 rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden'>
                <div className='absolute top-0 right-0 p-4 opacity-10'><FaGem size={100} /></div>
                <h4 className='text-xl font-black uppercase italic tracking-tighter text-blue-400'>Elite Access Tier</h4>
                <div className='text-6xl font-mono'>$299<span className='text-xl opacity-30'>/mo</span></div>
                <ul className='space-y-4 relative z-10'>
                  {['Unlimited 3D Recon Scans', 'Priority Neural Uplink (Jamie)', 'Advanced 20-Vector Datasets', 'Dynamic Grid Identities', 'Autonomous Lead Decay'].map(feature => (
                    <li key={feature} className='flex items-center gap-3 text-sm font-bold'>
                      <div className='w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]' /> {feature}
                    </li>
                  ))}
                </ul>
                <button className='w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-blue-600/20 transition-all hover:scale-105'>
                  Initialize Elite Status
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className='mt-24 pb-12 flex flex-col items-center gap-8 border-t border-white/5 pt-12'>
          <div className='flex gap-12'>
            <div className='text-center'>
              <div className='text-3xl font-mono font-bold text-blue-500'>3.0x</div>
              <div className='text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1'>Conversion Velocity</div>
            </div>
            <div className='text-center'>
              <div className='text-3xl font-mono font-bold text-blue-500'>20+</div>
              <div className='text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1'>Intelligence Vectors</div>
            </div>
            <div className='text-center'>
              <div className='text-3xl font-mono font-bold text-blue-500'>35</div>
              <div className='text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1'>Identity Presets</div>
            </div>
          </div>
          <div className='text-[8px] font-mono uppercase tracking-[0.5em] text-slate-600'>Proprietary Intelligence Grid // Powered by Jamie AI Operative</div>
        </footer>
      </div>

      {/* Demo Jamie Overlay */}
      <div className='pointer-events-auto'>
        <JamieChat propertyData={mockProperty} />
      </div>
      
      {/* Session Restore Notification */}
      <IntelligenceRecap />
    </div>
  );
};

export default DemoPage;
