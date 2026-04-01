'use client';
import React, { useState } from 'react';
import { FaLock, FaUnlock, FaInfoCircle } from 'react-icons/fa';

interface PropertyVerificationProps {
  children: React.ReactNode;
}

export default function PropertyVerification({ children }: PropertyVerificationProps) {
  const [answer, setAnswer] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState(false);

  const verification = {
    question: "To verify you are not a bot, please type the word 'human' below:",
    answer: "human"
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.toLowerCase().trim() === verification.answer) {
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
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center gap-3 text-green-400 text-xs font-bold uppercase tracking-wider">
          <FaUnlock /> Verification Successful. Access Granted.
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-blue-500/20 rounded-[2.5rem] p-8 shadow-2xl">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="p-4 bg-blue-500/10 rounded-full mb-4">
          <FaLock className="text-3xl text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold uppercase tracking-tight text-white mb-2">
          Property Access Verification
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
          Please complete the verification below to view premium property details and contact information.
        </p>
      </div>

      <div className="bg-black/40 border border-white/5 rounded-2xl p-6 mb-8 text-slate-300 text-center font-medium leading-loose shadow-inner">
        "{verification.question}"
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="relative group">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            className={`w-full p-4 bg-slate-950 border ${error ? 'border-red-500 animate-shake' : 'border-white/10 group-hover:border-white/20'} rounded-xl text-center text-white focus:outline-none focus:border-blue-500 transition-all uppercase font-bold tracking-widest text-xs`}
          />
          {error && (
            <p className="absolute -bottom-6 left-0 right-0 text-[10px] text-red-500 font-bold uppercase text-center animate-bounce">
              Verification failed. Please try again.
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/10 flex items-center justify-center gap-2"
        >
          Verify Identity <FaInfoCircle />
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-4 opacity-40">
        <img src="/assets/images/logo.png" alt="Sunset Pulse" className="h-4" />
        <div className="h-4 w-px bg-white/20" />
        <span className="text-[8px] font-bold uppercase tracking-widest">Secure Access Module</span>
      </div>
    </div>
  );
}

