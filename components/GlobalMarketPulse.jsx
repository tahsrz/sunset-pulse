'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { FaChartLine, FaChartBar, FaTimes } from 'react-icons/fa';

// Dynamically import the heavy D3 engine
const RandomChart = dynamic(() => import('./RandomChart'), {
  loading: () => <div className="h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">Loading Market Engine...</div>,
  ssr: false // D3 needs the window object
});

const GlobalMarketPulse = () => {
  const [activeChart, setActiveChart] = useState(null);

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
              <span className="text-blue-400">5.42%</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-slate-400">Price Index:</span>
              <span className="text-orange-400">+1.2%</span>
            </div>
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
