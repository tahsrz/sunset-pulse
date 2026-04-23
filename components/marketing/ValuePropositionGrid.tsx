'use client';

import React from 'react';
import { FaGlobe, FaCube, FaShieldAlt } from 'react-icons/fa';
import marketingCopy from '@/config/marketing_copy.json';

const ValuePropositionGrid = () => {
  const { mls_efficiency, spatial_search, backend_integrity } = marketingCopy.features;
  const { value_prop } = marketingCopy.section_headers;

  return (
    <section className="py-24 bg-slate-950 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-black uppercase italic tracking-tighter text-blue-500 mb-2">{value_prop.title}</h2>
          <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.6em]">{value_prop.tagline}</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* MLS Efficiency */}
          <div className="group p-8 rounded-[2.5rem] bg-slate-900/50 border border-white/5 hover:border-blue-500/30 transition-all duration-500 shadow-2xl">
            <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <FaGlobe className="text-blue-500 text-2xl" />
            </div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2">{mls_efficiency.title}</h3>
            <p className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-6">{mls_efficiency.tagline}</p>
            <p className="text-slate-400 leading-relaxed font-medium">
              {mls_efficiency.description}
            </p>
          </div>

          {/* Spatial Search / 3D */}
          <div className="group p-8 rounded-[2.5rem] bg-slate-900/50 border border-white/5 hover:border-orange-500/30 transition-all duration-500 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-colors" />
            <div className="w-14 h-14 bg-orange-600/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <FaCube className="text-orange-500 text-2xl" />
            </div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2">{spatial_search.title}</h3>
            <p className="text-orange-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-6">{spatial_search.tagline}</p>
            <p className="text-slate-400 leading-relaxed font-medium">
              {spatial_search.description}
            </p>
          </div>

          {/* Backend Integrity */}
          <div className="group p-8 rounded-[2.5rem] bg-slate-900/50 border border-white/5 hover:border-emerald-500/30 transition-all duration-500 shadow-2xl">
            <div className="w-14 h-14 bg-emerald-600/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <FaShieldAlt className="text-emerald-500 text-2xl" />
            </div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2">{backend_integrity.title}</h3>
            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-6">{backend_integrity.tagline}</p>
            <p className="text-slate-400 leading-relaxed font-medium">
              {backend_integrity.description}
            </p>
          </div>

        </div>
        
        <div className="mt-20 flex flex-col items-center gap-4 opacity-30">
          <div className="h-px w-24 bg-slate-800" />
          <span className="text-[8px] font-mono uppercase tracking-[0.8em] italic">{marketingCopy.cta.footer_note}</span>
        </div>
      </div>
    </section>
  );
};

export default ValuePropositionGrid;
