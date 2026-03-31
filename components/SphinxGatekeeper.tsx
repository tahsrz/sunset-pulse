'use client';
import React, { useState } from 'react';
import { FaSkull, FaUnlock, FaQuestionCircle } from 'react-icons/fa';

interface SphinxGatekeeperProps {
  children: React.ReactNode;
}

export default function SphinxGatekeeper({ children }: SphinxGatekeeperProps) {
  const [answer, setAnswer] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState(false);

  const riddle = {
    question: "What walks on four feet in the morning, two in the afternoon, and three at night?",
    answer: "human"
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.toLowerCase().trim() === riddle.answer) {
      setIsUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setAnswer('');
    }
  };

  if (isUnlocked) {
    return (
      <div className="animate-in fade-in zoom-in duration-700">
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center gap-3 text-green-400 text-xs font-black uppercase tracking-widest">
          <FaUnlock /> Riddle Solved. Access Granted.
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-red-500/20 rounded-[2.5rem] p-8 shadow-2xl shadow-red-500/5">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="p-4 bg-red-500/10 rounded-full mb-4 animate-pulse">
          <FaSkull className="text-3xl text-red-500" />
        </div>
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">
          The Riddle of the Sphinx
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
          Answer correctly to reveal the coordinates. Fail, and remain in the shadows as a robot.
        </p>
      </div>

      <div className="bg-black/40 border border-white/5 rounded-2xl p-6 mb-8 italic text-slate-300 text-center font-serif leading-loose shadow-inner">
        "{riddle.question}"
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="relative group">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            className={`w-full p-4 bg-slate-950 border ${error ? 'border-red-500 animate-shake' : 'border-white/10 group-hover:border-white/20'} rounded-xl text-center text-white focus:outline-none focus:border-red-500 transition-all uppercase font-black tracking-widest text-xs`}
          />
          {error && (
            <p className="absolute -bottom-6 left-0 right-0 text-[10px] text-red-500 font-black uppercase text-center animate-bounce">
              Incorrect. The Sphinx is displeased. Are you Human?
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2"
        >
          Verify Answer <FaQuestionCircle />
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-6 opacity-20 grayscale">
        <img src="/assets/images/logo.png" alt="Sunset Pulse" className="h-4" />
        <div className="h-4 w-px bg-white/20" />
        <span className="text-[8px] font-black uppercase tracking-widest">Protocol Guard v1.0</span>
      </div>
    </div>
  );
}
