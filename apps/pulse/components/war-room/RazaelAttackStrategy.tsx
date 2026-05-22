'use client';

import React from 'react';
import { FaBolt, FaCrosshairs, FaSkull, FaFire } from 'react-icons/fa';

interface RazaelAttackStrategyProps {
  property?: any;
}

const RazaelAttackStrategy: React.FC<RazaelAttackStrategyProps> = ({ property }) => {
  const strategies = [
    { id: 1, title: "Aggressive Acquisition", risk: "HIGH", leverage: "85%", icon: <FaBolt /> },
    { id: 2, title: "Shadow Negotiation", risk: "MED", leverage: "62%", icon: <FaCrosshairs /> },
    { id: 3, title: "Market Blitz", risk: "HIGH", leverage: "94%", icon: <FaFire /> },
    { id: 4, title: "Asset Liquidation", risk: "LOW", leverage: "40%", icon: <FaSkull /> }
  ];

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        {strategies.map((s) => (
          <div key={s.id} className="bg-red-950/20 border border-red-500/20 p-4 rounded-2xl hover:border-red-500/50 transition-all group">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-red-500 text-lg group-hover:scale-110 transition-transform">
                {s.icon}
              </div>
              <h4 className="text-xs font-black uppercase tracking-tighter">{s.title}</h4>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[8px] text-slate-500 uppercase block mb-1">Risk Level</span>
                <span className={`text-[10px] font-bold ${s.risk === 'HIGH' ? 'text-red-500' : 'text-amber-500'}`}>{s.risk}</span>
              </div>
              <div className="text-right">
                <span className="text-[8px] text-slate-500 uppercase block mb-1">Leverage</span>
                <span className="text-xl font-black italic text-white">{s.leverage}</span>
              </div>
            </div>
            <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]" 
                style={{ width: s.leverage }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-auto p-4 bg-red-600/10 border border-red-500/20 rounded-xl w-full">
        <p className="text-[10px] text-red-400 font-mono leading-relaxed uppercase tracking-tighter">
          RAZAEL STRATEGY: Acquisition protocols active. Seller leverage identified as minimal. Proceed with [ AGGRESSIVE_OFFER ].
        </p>
      </div>
    </div>
  );
};

export default RazaelAttackStrategy;
