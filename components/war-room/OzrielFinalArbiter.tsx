'use client';

import React from 'react';
import { FaSkull, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

interface Rewrite {
  original_fragment: string;
  suggested_rewrite: string;
  rationale: string;
}

interface OzrielAudit {
  ai_patterns_detected: string[];
  humanized_rewrites: Rewrite[];
  overall_tone_score: number;
}

interface OzrielFinalArbiterProps {
  auditData?: OzrielAudit;
  onAcceptRewrites?: () => void;
}

const OzrielFinalArbiter: React.FC<OzrielFinalArbiterProps> = ({ 
  auditData, 
  onAcceptRewrites 
}) => {
  const [hasPurified, setHasPurified] = React.useState(false);
  
  // Default/Fallback data
  const defaultAudit: OzrielAudit = {
    ai_patterns_detected: ["Passive Voice", "Excessive Adjectives", "Formulaic Transition"],
    humanized_rewrites: [
      {
        original_fragment: "It is important to note that...",
        suggested_rewrite: "Look,",
        rationale: "Removes robotic preamble."
      },
      {
        original_fragment: "...delving deep into the data...",
        suggested_rewrite: "...checking the numbers...",
        rationale: "Replaces 'delve' (AI tell)."
      }
    ],
    overall_tone_score: 72
  };

  const activeAudit = auditData || defaultAudit;
  const viabilityScore = activeAudit.overall_tone_score;
  const verdict = viabilityScore > 80 ? "PURE" : "CORRUPT";

  const handlePurify = () => {
    setHasPurified(true);
    if (onAcceptRewrites) onAcceptRewrites();
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 py-8">
      <div className="w-full max-w-2xl text-center space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-400">Final Recommendation</p>
        <h3 className="text-2xl font-black uppercase tracking-tight">
          {hasPurified || verdict === 'PURE' ? 'Copy passes the trust check.' : 'Copy needs human cleanup before release.'}
        </h3>
        <p className="text-sm text-slate-400">
          Ozriel is acting as the language QA layer here: keep what sounds human, remove what sounds generated.
        </p>
      </div>

      {/* Verdict Card */}
      <div className={`relative w-64 h-64 rounded-full flex flex-col items-center justify-center border-8 transition-all duration-1000 ${
        verdict === 'PURE' || hasPurified
        ? 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)] bg-emerald-500/5' 
        : 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)] bg-red-500/5'
      }`}>
        <div className={`text-6xl mb-4 ${verdict === 'PURE' || hasPurified ? 'text-emerald-500' : 'text-red-500'}`}>
          {verdict === 'PURE' || hasPurified ? <FaCheckCircle /> : <FaSkull />}
        </div>
        <h3 className="text-4xl font-black italic tracking-tighter">{hasPurified ? 'PURIFIED' : verdict}</h3>
        <p className="text-[10px] font-mono text-slate-500 uppercase mt-2 tracking-[0.3em]">Linguistic Integrity</p>

        {/* Decorative Scythe Arcs */}
        <div className="absolute inset-0 border-2 border-white/5 rounded-full animate-[spin_10s_linear_infinite]" />
        <div className="absolute inset-4 border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
      </div>

      {/* Audit Findings */}
      {!hasPurified && activeAudit.humanized_rewrites.length > 0 && (
        <div className="w-full max-w-2xl space-y-4">
          <div className="flex items-center gap-2 px-4">
            <FaExclamationTriangle className="text-red-500" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Detected AI Patterns</h4>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {activeAudit.humanized_rewrites.map((rewrite, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="text-[8px] font-mono text-red-500 uppercase">Original Fragment</span>
                  <span className="text-[8px] font-mono text-emerald-500 uppercase">Ozriel's Harvest</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <p className="text-xs text-slate-400 italic line-through">"{rewrite.original_fragment}"</p>
                  <p className="text-xs text-emerald-400 font-bold">"{rewrite.suggested_rewrite}"</p>
                </div>
                <p className="text-[9px] text-slate-500 mt-1 uppercase font-mono tracking-tighter">Rationale: {rewrite.rationale}</p>
              </div>
            ))}
          </div>

          <button 
            onClick={handlePurify}
            className="w-full py-4 bg-red-600 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.5em] italic rounded-xl transition-all duration-500 shadow-lg border border-white/10"
          >
            Purify Speech Pattern
          </button>
        </div>
      )}

      {hasPurified && (
        <div className="flex flex-col items-center gap-6 w-full max-w-xl">
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl w-full text-center animate-in zoom-in-95 duration-700">
            <p className="text-xs text-emerald-300 font-serif italic leading-relaxed">
              "The harvest is complete. The speech has been purified. Jamie now speaks with the weight of humanity. No robotic traces remain."
            </p>
          </div>
          
          <a 
            href="/scythe"
            className="group flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            <FaSkull className="text-rose-500 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 group-hover:text-white">Access External Purifier Protocol</span>
          </a>
        </div>
      )}

      {!hasPurified && (
        <div className="p-6 bg-indigo-950/40 border border-indigo-500/20 rounded-2xl w-full max-w-xl text-center">
          <p className="text-xs text-indigo-300 font-serif italic leading-relaxed">
            "I detect the cold touch of the machine in these words. They lack the grit of the North Texas soil. Let me scythe the formulaic and plant the seeds of true voice."
          </p>
          <p className="text-[10px] text-indigo-500 font-mono mt-4 uppercase tracking-[0.5em]">
            - OZRIEL, THE FINAL ARBITER
          </p>
        </div>
      )}
    </div>
  );
};

export default OzrielFinalArbiter;
