'use client';

import React, { useState } from 'react';
import { ABIDAN_DATA } from '@/constants/abidan';
import { FaEye, FaShieldAlt, FaGhost, FaSpider, FaCrosshairs, FaDove, FaBolt, FaSkull } from 'react-icons/fa';
import MakielFateChart from './MakielFateChart';
import GadraelRiskShield from './GadraelRiskShield';
import TelarielSpiderNet from './TelarielSpiderNet';

const JudgesWarRoom = () => {
  const [activeJudge, setActiveJudge] = useState(ABIDAN_DATA[0]);

  const getIcon = (type: string) => {
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
    <div className="bg-slate-950 min-h-screen text-slate-100 p-6 font-sans border border-white/5 rounded-[2rem] m-4 shadow-2xl overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] -z-10 rounded-full" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 blur-[120px] -z-10 rounded-full" />

      {/* Header Area */}
      <header className="flex justify-between items-end mb-12 border-b border-white/10 pb-8">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic text-blue-500">
            Judges War Room
          </h2>
          <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.4em] mt-2">
            [ MULTI-DIMENSIONAL RECONNAISSANCE GRID // SYNCED ]
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <span className="text-[10px] text-slate-600 block uppercase font-black">Active Iteration</span>
            <span className="text-xs font-mono text-blue-400">NTREIS_GRID_001</span>
          </div>
          <div className="w-12 h-12 border border-white/10 rounded-xl flex items-center justify-center bg-white/5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* JUDGE SELECTION COLUMN */}
        <div className="lg:col-span-1 space-y-3">
          {ABIDAN_DATA.map((judge) => (
            <button
              key={judge.id}
              onClick={() => setActiveJudge(judge)}
              className={`w-full group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 overflow-hidden ${
                activeJudge.id === judge.id 
                ? 'bg-blue-600/10 border-blue-500/50 shadow-lg' 
                : 'bg-white/5 border-white/5 hover:border-white/20'
              }`}
            >
              <div className={`p-2 rounded-lg transition-colors ${activeJudge.id === judge.id ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                {getIcon(judge.geometryType)}
              </div>
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-tighter leading-none">{judge.name}</p>
                <p className="text-[9px] text-slate-500 uppercase font-mono mt-1 opacity-70">{judge.mantle}</p>
              </div>
              {activeJudge.id === judge.id && (
                <div className="absolute right-4 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,1)]" />
              )}
            </button>
          ))}
        </div>

        {/* MAIN VISUALIZATION AREA */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 min-h-[500px] relative overflow-hidden backdrop-blur-md">
            {/* Widget Selection based on Active Judge */}
            <div className="relative z-10 h-full">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-1 h-12 bg-blue-500" />
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">{activeJudge.name} / {activeJudge.mantle}</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest mt-1">Operational Protocol: {activeJudge.geometryType.toUpperCase()}</p>
                </div>
              </div>

              {/* Dynamic Content Rendering */}
              {activeJudge.id === 'makiel' && <MakielFateChart />}
              {activeJudge.id === 'gadrael' && <GadraelRiskShield />}
              {activeJudge.id === 'telariel' && <TelarielSpiderNet />}
              
              {/* Fallback for others currently under development */}
              {!['makiel', 'gadrael', 'telariel'].includes(activeJudge.id) && (
                <div className="flex flex-col items-center justify-center h-[350px] text-center border-2 border-dashed border-white/5 rounded-2xl">
                  <div className="text-4xl text-slate-800 mb-4">{getIcon(activeJudge.geometryType)}</div>
                  <h4 className="text-slate-500 font-black uppercase text-xs tracking-[0.3em]">Module Encrypted</h4>
                  <p className="text-[10px] text-slate-700 font-mono mt-2 italic">Awaiting high-fidelity reconnaissance data...</p>
                </div>
              )}
            </div>

            {/* Decorative background mantle */}
            <div className="absolute -bottom-20 -right-20 text-[20rem] text-white/5 select-none pointer-events-none rotate-12">
              {getIcon(activeJudge.geometryType)}
            </div>
          </div>

          {/* Lower Data Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
              <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest block mb-1">Signal Integrity</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black italic">98.4</span>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Purity Index</span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
              <span className="text-[9px] text-purple-500 font-black uppercase tracking-widest block mb-1">Iteration Stability</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black italic">OPTIMAL</span>
                <span className="text-[10px] text-slate-500 uppercase font-mono">No Void Decay</span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
              <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest block mb-1">Recon Density</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black italic">14.2 TB</span>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Per Parcel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JudgesWarRoom;
