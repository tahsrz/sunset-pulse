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
    <div className="w-full bg-slate-900 text-white border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-10 text-xs font-medium uppercase tracking-wider">
          <div className="flex items-center space-x-6 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-slate-400">Market Pulse:</span>
              <span className="text-green-400">Active</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-slate-400">Global Yield:</span>
              <span className="text-blue-400">{globalYield}%</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-slate-400">Price Index:</span>
              <span className="text-orange-400">+1.2%</span>
            </div>

            {isAdvancedMode && (
              <div className="flex items-center gap-2 whitespace-nowrap pl-4 border-l border-white/10 ml-2 animate-in fade-in slide-in-from-left duration-700">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-400 font-black tracking-tighter italic">
                  <FaBolt size={10} className="fill-blue-400" />
                  <span>Advanced_Protocol: Active</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => toggleChart('heatmap')}
              className={`flex items-center gap-1 hover:text-white transition-colors ${activeChart === 'heatmap' ? 'text-white' : 'text-slate-400'}`}
            >
              <FaChartLine /> Heatmap
            </button>
            <button 
              onClick={() => toggleChart('bar')}
              className={`flex items-center gap-1 hover:text-white transition-colors ${activeChart === 'bar' ? 'text-white' : 'text-slate-400'}`}
            >
              <FaChartBar /> Yields
            </button>
          </div>
        </div>
      </div>

      {activeChart && (
        <div className="bg-slate-800 p-6 border-b border-slate-700 relative animate-in fade-in slide-in-from-top duration-300">
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
