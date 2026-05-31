'use client';
import { useState } from 'react';
import { FaCode, FaCheck, FaCopy } from 'react-icons/fa';

const IDXWidgetCreator = () => {
  const [activeWidget, setActiveWidget] = useState('Search');
  const [copied, setCopied] = useState(false);

  const widgets = {
    'Search': `<script src="https://sunsetpulse.app/widgets/search.js" data-api-key="YOUR_IDX_KEY"></script>\n<div id="sunset-pulse-search"></div>`,
    'Grid': `<script src="https://sunsetpulse.app/widgets/grid.js" data-api-key="YOUR_IDX_KEY" data-type="RV"></script>\n<div id="sunset-pulse-grid"></div>`,
    'Map': `<script src="https://sunsetpulse.app/widgets/map.js" data-api-key="YOUR_IDX_KEY" data-lat="33.0" data-lon="-97.0"></script>\n<div id="sunset-pulse-map"></div>`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(widgets[activeWidget]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className='bg-slate-900 rounded-3xl p-8 border border-white/5 shadow-2xl'>
      <div className='flex items-center gap-3 mb-8'>
        <div className='w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center'>
          <FaCode className='text-white' />
        </div>
        <div>
          <h3 className='text-xl font-black text-white uppercase tracking-tighter'>Custom IDX Widgets</h3>
          <p className='text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]'>WordPress & External Injection</p>
        </div>
      </div>

      <div className='flex gap-2 mb-6'>
        {Object.keys(widgets).map(w => (
          <button
            key={w}
            onClick={() => setActiveWidget(w)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeWidget === w ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {w} Bar
          </button>
        ))}
      </div>

      <div className='relative'>
        <pre className='bg-black/50 p-6 rounded-2xl border border-white/5 text-blue-400 text-xs overflow-x-auto font-mono leading-relaxed'>
          {widgets[activeWidget]}
        </pre>
        <button
          onClick={handleCopy}
          className='absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all'
        >
          {copied ? <FaCheck className='text-green-500' /> : <FaCopy className='text-slate-400' />}
        </button>
      </div>

      <div className='mt-8 flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5'>
        <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
        <p className='text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none'>
          Live MLS/IDX Stream active via Repliers.io Bridge
        </p>
      </div>
    </div>
  );
};

export default IDXWidgetCreator;
