'use client';
import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { FaChartLine, FaChartBar, FaTimes, FaBolt } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeProvider';
import { useProperties } from '@/hooks/useProperties';

// Dynamically import the heavy D3 engine
const RandomChart = dynamic(() => import('./RandomChart'), {
  loading: () => <div className="h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">Loading Market Engine...</div>,
  ssr: false // D3 needs the window object
});

const GlobalMarketPulse = () => {
  const [activeChart, setActiveChart] = useState(null);
  const { isAdvancedMode } = useTheme();
  const { properties } = useProperties();

  // Calculate dynamic Global Yield based on active properties
  const globalYield = useMemo(() => {
    if (!properties || properties.length === 0) return 5.42;
    
    let totalYield = 0;
    let count = 0;

    properties.forEach(p => {
      const monthlyRate = p.rates?.monthly || (p.rates?.nightly ? p.rates.nightly * 30 : 0);
      if (monthlyRate > 0) {
        // Mock estimate if missing (Annual Rent / 0.06 Cap Rate)
        const estimate = (monthlyRate * 12) / 0.06;
        const yieldVal = (monthlyRate * 12) / estimate * 100;
        totalYield += yieldVal;
        count++;
      }
    });

    return count > 0 ? (totalYield / count).toFixed(2) : 5.42;
  }, [properties]);

  const toggleChart = (type) => {
    if (activeChart === type) {
      setActiveChart(null);
    } else {
      setActiveChart(type);
    }
  };

  return (
    <div className="w-full bg-[#06131d]/92 text-white border-b border-cyan-100/10 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 min-h-10 py-2 text-[11px] font-semibold uppercase">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar sm:gap-6">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
              </span>
              <span className="text-slate-400">Market Pulse</span>
              <span className="text-cyan-200">Active</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-slate-400">Yield</span>
              <span className="text-violet-200">{globalYield}%</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-slate-400">Price Index</span>
              <span className="text-amber-200">+1.2%</span>
            </div>

            {isAdvancedMode && (
              <div className="flex items-center gap-2 whitespace-nowrap pl-4 border-l border-white/10 ml-2 animate-in fade-in slide-in-from-left duration-700">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-200 font-black tracking-tighter italic">
                  <FaBolt size={10} className="fill-rose-200" />
                  <span>Advanced_Protocol: Active</span>
                </div>
              </div>
            )}
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <button 
              onClick={() => toggleChart('heatmap')}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors ${activeChart === 'heatmap' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/[0.08] hover:text-white'}`}
            >
              <FaChartLine /> Heatmap
            </button>
            <button 
              onClick={() => toggleChart('bar')}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors ${activeChart === 'bar' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/[0.08] hover:text-white'}`}
            >
              <FaChartBar /> Yields
            </button>
          </div>
        </div>
      </div>

      {activeChart && (
        <div className="waterlily-section p-6 border-b border-teal-200/10 relative animate-in fade-in slide-in-from-top duration-300">
          <button 
            onClick={() => setActiveChart(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
          >
            <FaTimes />
          </button>
          <div className="max-w-4xl mx-auto">
            <RandomChart type={activeChart} />
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalMarketPulse;
