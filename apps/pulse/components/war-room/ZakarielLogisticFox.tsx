'use client';

import React from 'react';
import { FaTruck, FaFileSignature, FaSearchDollar, FaHandshake, FaFlagCheckered } from 'react-icons/fa';

interface ZakarielLogisticFoxProps {
  property?: any;
}

const ZakarielLogisticFox: React.FC<ZakarielLogisticFoxProps> = ({ property }) => {
  const stages = [
    { label: "Inspections", status: "COMPLETE", velocity: "HIGH", icon: <FaSearchDollar /> },
    { label: "Appraisal", status: "IN_PROGRESS", velocity: "MODERATE", icon: <FaTruck /> },
    { label: "Title Recon", status: "PENDING", velocity: "STABLE", icon: <FaFileSignature /> },
    { label: "Underwriting", status: "LOCKED", velocity: "LOW", icon: <FaHandshake /> },
    { label: "The Closing", status: "HORIZON", velocity: "N/A", icon: <FaFlagCheckered /> }
  ];

  return (
    <div className="w-full h-full flex flex-col gap-8 py-4">
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2" />
        <div className="absolute top-1/2 left-0 w-[40%] h-1 bg-orange-500 -translate-y-1/2 shadow-[0_0_15px_rgba(249,115,22,0.5)]" />

        <div className="flex justify-between items-center relative z-10">
          {stages.map((stage, i) => (
            <div key={i} className="flex flex-col items-center gap-4">
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                stage.status === 'COMPLETE' ? 'bg-orange-500 border-orange-400 text-white' :
                stage.status === 'IN_PROGRESS' ? 'bg-slate-900 border-orange-500 text-orange-500 animate-pulse' :
                'bg-slate-900 border-white/10 text-slate-600'
              }`}>
                {stage.icon}
              </div>
              <div className="text-center">
                <p className={`text-[10px] font-black uppercase tracking-tighter ${stage.status === 'IN_PROGRESS' ? 'text-orange-500' : 'text-slate-400'}`}>
                  {stage.label}
                </p>
                <p className="text-[8px] font-mono text-slate-600 uppercase mt-1">{stage.velocity}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-auto">
        <div className="bg-orange-600/5 border border-orange-500/10 p-4 rounded-xl">
          <span className="text-[9px] text-orange-500 font-black uppercase tracking-widest block mb-1">Time to Close</span>
          <span className="text-2xl font-black italic">14 DAYS</span>
        </div>
        <div className="bg-orange-600/5 border border-orange-500/10 p-4 rounded-xl">
          <span className="text-[9px] text-orange-500 font-black uppercase tracking-widest block mb-1">Transit Efficiency</span>
          <span className="text-2xl font-black italic">92%</span>
        </div>
      </div>

      <div className="p-4 bg-orange-600/10 border border-orange-500/20 rounded-xl w-full">
        <p className="text-[10px] text-orange-400 font-mono leading-relaxed uppercase tracking-tighter">
          ZAKARIEL LOGISTICS: Escrow timeline optimized. Appraisal submarket performing with high velocity. Closing protocols active.
        </p>
      </div>
    </div>
  );
};

export default ZakarielLogisticFox;
