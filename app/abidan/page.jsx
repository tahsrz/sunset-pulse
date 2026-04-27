'use client';
import React from 'react';
import { useTheme } from '@/context/ThemeProvider';
import { ABIDAN_DATA } from '@/constants/abidan';
import { FaShieldAlt, FaCrosshairs, FaBolt, FaGhost, FaSpider, FaDove, FaEye, FaSkull } from 'react-icons/fa';
import PropertyFiberViewer from '@/components/PropertyFiberViewer';

const AbidanIntroPage = () => {
  const { selectedAbidan, setSelectedAbidan } = useTheme();

  const getIcon = (type) => {
    switch (type) {
      case 'hound': return <FaEye />;
      case 'titan': return <FaShieldAlt />;
      case 'ghost': return <FaGhost />;
      case 'spider': return <FaSpider />;
      case 'wolf': return <FaCrosshairs />;
      case 'phoenix': return <FaDove />;
      case 'fox': return <FaBolt />;
      case 'reaper': return <FaSkull />;
      default: return <FaShieldAlt />;
    }
  };

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100 p-8 font-sans'>
      <header className='mb-12 border-b border-slate-800 pb-6'>
        <div className='flex justify-between items-end'>
          <div>
            <h1 className='text-6xl font-black tracking-tighter uppercase italic text-blue-500'>
              The Abidan Court
            </h1>
            <p className='text-slate-400 font-mono text-sm mt-2 uppercase tracking-widest'>
              [ ACCESS LEVEL: JUDGE // PROTOCOL: MANTLE_ASSUMPTION ]
            </p>
          </div>
          <a 
            href='/abidan/war-room' 
            className='px-6 py-3 bg-blue-600/10 border border-blue-500/30 rounded-xl text-blue-400 font-black uppercase text-[10px] tracking-[0.3em] hover:bg-blue-600 hover:text-white transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)]'
          >
            Enter War Room
          </a>
        </div>
      </header>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-12 mb-20'>
        {/* LEFT COLUMN: CHARACTER SELECTOR */}
        <div className='lg:col-span-1 space-y-4 max-h-[700px] overflow-y-auto pr-4 custom-scrollbar'>
          {ABIDAN_DATA.map((abidan) => (
            <button
              key={abidan.id}
              onClick={() => setSelectedAbidan(abidan)}
              className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 group relative overflow-hidden ${
                selectedAbidan.id === abidan.id 
                ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)]' 
                : 'bg-white/5 border-white/5 hover:border-white/20'
              }`}
            >
              <div className='flex items-center gap-4 relative z-10'>
                <div className={`p-3 rounded-xl ${selectedAbidan.id === abidan.id ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {getIcon(abidan.geometryType)}
                </div>
                <div>
                  <h3 className='font-black uppercase tracking-tighter text-lg'>{abidan.name}</h3>
                  <p className='text-[10px] text-slate-500 uppercase font-mono'>{abidan.mantle}</p>
                </div>
              </div>
              {selectedAbidan.id === abidan.id && (
                <div className='absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent' />
              )}
            </button>
          ))}
        </div>

        {/* Active Mantle */}
        <div className='lg:col-span-2 space-y-8'>
          <div className='bg-white/5 border border-white/10 p-10 rounded-[3rem] backdrop-blur-xl relative overflow-hidden'>
            <div className='absolute top-0 right-0 p-8 opacity-5'>
              {getIcon(selectedAbidan.geometryType)}
            </div>
            
            <div className='flex items-center gap-6 mb-8'>
              <div className='h-20 w-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' />
              <div>
                <h2 className='text-5xl font-black uppercase tracking-tighter italic'>{selectedAbidan.name}</h2>
                <p className='text-blue-400 font-mono text-xs uppercase tracking-[0.5em] mt-1'>{selectedAbidan.mantle}</p>
              </div>
            </div>

            <p className='text-xl text-slate-400 font-serif italic leading-relaxed mb-10'>
              "{selectedAbidan.description}"
            </p>

            {/* FORCED ANGEL MODE */}
            <div className='rounded-3xl overflow-hidden border border-white/5 bg-black/40'>
               {/* Create a dummy property object to satisfy the viewer */}
               <PropertyFiberViewer 
                 property={{ name: selectedAbidan.name, location: { street: 'ABIDAN_CORE' } }} 
                 color={selectedAbidan.color}
               />
            </div>
            
            <div className='mt-8 grid grid-cols-2 gap-4'>
              <div className='bg-black/40 p-4 rounded-2xl border border-white/5'>
                <span className='text-[10px] text-blue-500 block mb-1 uppercase font-mono'>Geometric Signature</span>
                <span className='text-sm font-bold uppercase'>{selectedAbidan.geometryType}</span>
              </div>
              <div className='bg-black/40 p-4 rounded-2xl border border-white/5'>
                <span className='text-[10px] text-blue-500 block mb-1 uppercase font-mono'>Power Output</span>
                <span className='text-sm font-bold uppercase italic'>Judge Class // ∞</span>
              </div>
            </div>

            {selectedAbidan.id === 'ozriel' && (
              <div className="mt-8 animate-in slide-in-from-bottom-4 duration-1000">
                <a 
                  href="/scythe" 
                  className="block w-full py-6 bg-gradient-to-r from-rose-900/40 to-indigo-900/40 border border-rose-500/30 rounded-3xl text-center group relative overflow-hidden transition-all hover:scale-[1.02]"
                >
                  <div className="absolute inset-0 bg-rose-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 flex items-center justify-center gap-4">
                    <FaSkull className="text-rose-500 animate-pulse" />
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.5em] text-rose-400 mb-1">External Protocol</div>
                      <div className="text-xl font-black italic tracking-tighter text-white uppercase">Invoke the Scythe Purifier</div>
                    </div>
                  </div>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className='border-t border-white/10 pt-12 pb-20'>
        <div className='max-w-4xl mx-auto text-center'>
          <h2 className='text-2xl font-black uppercase tracking-tighter italic mb-4 text-slate-500'>
            The Way remains. The Court observes.
          </h2>
          <p className='text-[10px] font-mono tracking-[0.5em] uppercase text-slate-600'>
            Property of the Sunset Collective // System: Abidan Core
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AbidanIntroPage;
