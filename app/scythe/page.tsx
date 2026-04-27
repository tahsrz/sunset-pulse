'use client';

import React, { useState } from 'react';
import { FaSkull, FaMagic, FaHistory, FaCheck, FaTimes, FaShieldAlt, FaChartBar, FaFingerprint, FaFlag } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ScythePurifierPage = () => {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isReporting, setIsReporting] = useState<string | null>(null);

  const handlePurify = async () => {
    if (!inputText.trim()) return;
    setIsScanning(true);
    try {
      const response = await fetch('/api/jamie/purify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Purification failed:', error);
      toast.error('Transmission failed. Ozriel is silent.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleReport = async (detection: any) => {
    setIsReporting(detection.robotic);
    try {
      const response = await fetch('/api/jamie/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detection,
          context: inputText,
          action: 'FALSE_POSITIVE'
        })
      });
      if (response.ok) {
        toast.success('Discrepancy logged. Ozriel will re-evaluate.');
      }
    } catch (error) {
      console.error('Report failed:', error);
    } finally {
      setIsReporting(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score > 85) return 'text-emerald-500';
    if (score > 65) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-24 px-6">
      <ToastContainer theme="dark" position="bottom-right" />
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[60%] h-[60%] bg-rose-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-[0.4em] mb-6 animate-pulse">
            <FaSkull size={12} />
            Ozriel's Scythe v2.0
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white mb-6 leading-none uppercase">
            The Entropy <span className="text-rose-500">Purifier</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Linguistic entropy analysis and pattern excision. Ozriel detects machine predictability and "burstiness" anomalies.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Input Area */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500/50 to-blue-500/50 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition-opacity" />
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your text here (Email, Pitch Deck, Report)..."
                className="relative w-full h-[500px] bg-slate-900/50 border border-white/10 rounded-[2rem] p-8 text-white placeholder:text-white/10 focus:outline-none focus:border-rose-500/50 transition-all resize-none font-mono text-sm leading-relaxed"
              />
            </div>

            <button
              onClick={handlePurify}
              disabled={isScanning || !inputText.trim()}
              className="w-full py-6 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-white/20 text-white rounded-2xl font-black uppercase tracking-[0.5em] text-xs transition-all shadow-2xl shadow-rose-900/20 flex items-center justify-center gap-4 group"
            >
              {isScanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing Entropy & Density...
                </>
              ) : (
                <>
                  <FaMagic size={14} className="group-hover:rotate-12 transition-transform" />
                  Initiate Purification
                </>
              )}
            </button>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-5 space-y-6">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Score & Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 p-8 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-8 opacity-10">
                          <FaFingerprint size={80} />
                       </div>
                      <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Humanity Rating</div>
                      <div className={`text-7xl font-black italic tracking-tighter ${getScoreColor(result.humanity_score)}`}>
                        {result.humanity_score}%
                      </div>
                      <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${result.humanity_score}%` }}
                          className={`h-full ${result.humanity_score > 65 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        />
                      </div>
                    </div>

                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
                      <div className="text-[9px] font-black text-white/30 uppercase mb-2">Burstiness (Entropy)</div>
                      <div className="text-2xl font-black text-blue-500">{result.metrics.burstiness}</div>
                    </div>
                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
                      <div className="text-[9px] font-black text-white/30 uppercase mb-2">Detected Domain</div>
                      <div className="text-2xl font-black text-amber-500 capitalize">{result.domain.replace('_', ' ')}</div>
                    </div>
                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl col-span-2">
                      <div className="text-[9px] font-black text-white/30 uppercase mb-2">Repetition Factor</div>
                      <div className="text-2xl font-black text-rose-500">{result.metrics.repetition}</div>
                    </div>
                  </div>

                  {/* Detections List */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-4">
                      <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Detections ({result.detections.length})</div>
                      <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Density: {result.metrics.density}</div>
                    </div>
                    
                    {result.detections.length === 0 ? (
                      <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] text-emerald-400 text-xs flex flex-col items-center gap-4 italic text-center">
                        <FaCheck size={32} className="opacity-20" />
                        "Your humanity is absolute. I detect no trace of the machine's cold calculation."
                      </div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {result.detections.map((det: any, idx: number) => (
                          <div key={idx} className="p-6 bg-white/5 border border-white/10 rounded-2xl group hover:border-rose-500/30 transition-all relative">
                            <button 
                              onClick={() => handleReport(det)}
                              disabled={isReporting === det.robotic}
                              className="absolute top-4 right-4 text-white/20 hover:text-rose-500 transition-colors"
                              title="Report False Positive"
                            >
                              <FaFlag size={12} className={isReporting === det.robotic ? 'animate-pulse' : ''} />
                            </button>
                            
                            <div className="flex items-center gap-2 text-rose-500 mb-2">
                              <FaTimes size={10} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Pattern Detected</span>
                            </div>
                            <div className="text-white text-xs mb-3 line-through opacity-40">"{det.robotic}"</div>
                            <div className="flex items-center gap-2 text-emerald-500 mb-3">
                              <FaCheck size={10} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Purified Suggestion</span>
                            </div>
                            <div className="text-emerald-400 text-xs font-bold">"{det.purified}"</div>
                            <div className="mt-4 pt-4 border-t border-white/5 text-[9px] text-white/30 italic uppercase">
                              Rationale: {det.rationale}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Advice Card */}
                  <div className="p-8 bg-blue-600/10 border border-blue-500/20 rounded-[2rem]">
                    <div className="flex items-center gap-3 text-blue-500 mb-2">
                      <FaShieldAlt />
                      <span className="text-[10px] font-black uppercase tracking-widest">Ozriel's Counsel</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                      {result.humanity_score > 90 
                        ? '"You speak with the grit of the North Texas soil. Maintain this friction."'
                        : '"The machine seeks the path of least resistance. You have become predictable. Introduce chaos, be brief, and delete the preambles."'
                      }
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 border border-white/5 rounded-[2rem] bg-white/[0.02]">
                  <FaChartBar className="text-white/5 text-8xl mb-6" />
                  <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Awaiting Entropy Stream</div>
                  <p className="text-slate-600 text-xs mt-4 italic max-w-xs">
                    Input your transmission and invoke the Scythe to analyze linguistic density.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScythePurifierPage;

