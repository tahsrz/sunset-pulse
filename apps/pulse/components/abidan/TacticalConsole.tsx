'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaTerminal, FaPlay, FaTrash, FaHistory, FaInfoCircle } from 'react-icons/fa';

const TacticalConsole = () => {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<{ query: string; result: any; error?: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleExecute = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    const currentQuery = query.trim();
    
    try {
      const response = await fetch('/api/tah/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery }),
      });

      const data = await response.json();
      
      setHistory(prev => [...prev, { 
        query: currentQuery, 
        result: data.success ? data.result : data.error,
        error: !data.success
      }]);
      setQuery('');
    } catch (err) {
      setHistory(prev => [...prev, { 
        query: currentQuery, 
        result: "Connection error. Please try again.",
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-[100] border-2 border-white/20"
        title="Open Analysis Console"
      >
        <FaTerminal />
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 w-[450px] h-[600px] bg-slate-950 border border-blue-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] z-[100] flex flex-col overflow-hidden animate-in zoom-in duration-300">
      {/* Header */}
      <div className="p-4 bg-slate-900/80 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Analysis Console v1.2</h3>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <FaTrash className="text-xs" />
        </button>
      </div>

      {/* History Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-[11px] custom-scrollbar"
      >
        {history.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center px-8">
            <FaInfoCircle className="mb-4 text-2xl opacity-20" />
            <p className="uppercase tracking-widest text-[9px] font-black">Waiting for S-Expression input...</p>
            <p className="mt-2 leading-relaxed opacity-50 italic">Try: (SEARCH "Bowie" :beds-min 3) or (LIST-CARTRIDGES)</p>
          </div>
        )}
        
        {history.map((entry, idx) => (
          <div key={idx} className="space-y-2 animate-in fade-in duration-500">
            <div className="flex gap-2">
              <span className="text-emerald-500 font-black">tah&gt;</span>
              <span className="text-white italic">{entry.query}</span>
            </div>
            <div className={`pl-4 border-l ${entry.error ? 'border-red-500/50 text-red-400' : 'border-blue-500/20 text-blue-300'}`}>
              <pre className="whitespace-pre-wrap">
                {typeof entry.result === 'string' 
                  ? entry.result 
                  : JSON.stringify(entry.result, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <form 
        onSubmit={handleExecute}
        className="p-4 bg-black/40 border-t border-white/5"
      >
        <div className="relative">
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            placeholder="(EXISTS? 'listings_gate' 'MFRTB...')"
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs font-mono text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 transition-all"
          />
          <button 
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1.5 bottom-1.5 px-3 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-500 disabled:opacity-50 disabled:bg-slate-800 transition-all"
          >
            {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaPlay className="text-[10px]" />}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TacticalConsole;
