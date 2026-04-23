'use client';

import React, { useState, useMemo } from 'react';
import { FaChevronDown, FaBrain, FaQuestionCircle, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import marketingCopy from '@/config/marketing_copy.json';

const FAQSection = () => {
  const { faq } = marketingCopy;
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [items, setItems] = useState(faq.items);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => b.score - a.score);
  }, [items]);

  const handleVote = (index: number, delta: number) => {
    const newItems = [...items];
    newItems[index].score += delta;
    setItems(newItems);
    
    // In a real production environment, we would also trigger a POST to sync this back to the server
    // For now, it updates the session state to demonstrate the sorting logic.
  };

  const toggleFAQ = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  return (
    <section className="py-24 bg-slate-950 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 text-blue-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-4 border border-blue-500/20">
            <FaBrain className="text-xs" /> Platform Intelligence
          </div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white mb-2">{faq.title}</h2>
          <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.6em]">{faq.tagline}</p>
        </div>

        <div className="space-y-4">
          {sortedItems.map((item) => {
            const originalIndex = items.findIndex(i => i.question === item.question);
            const itemId = `faq-${originalIndex}`;
            const isOpen = openIndex === itemId;

            return (
              <div 
                key={itemId} 
                className={`group rounded-3xl border transition-all duration-500 overflow-hidden ${
                  isOpen 
                    ? 'bg-slate-900 border-blue-500/30 shadow-2xl shadow-blue-500/10' 
                    : 'bg-slate-900/40 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex">
                  {/* Voting Column */}
                  <div className="flex flex-col items-center justify-center px-4 bg-black/20 border-r border-white/5 gap-2">
                    <button 
                      onClick={() => handleVote(originalIndex, 1)}
                      className="p-2 text-slate-600 hover:text-blue-400 transition-colors"
                      title="Relevant Briefing"
                    >
                      <FaArrowUp size={12} />
                    </button>
                    <span className="text-[10px] font-black font-mono text-blue-500/80">{item.score}</span>
                    <button 
                      onClick={() => handleVote(originalIndex, -1)}
                      className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                      title="Outdated Briefing"
                    >
                      <FaArrowDown size={12} />
                    </button>
                  </div>

                  <button 
                    onClick={() => toggleFAQ(itemId)}
                    className="flex-1 flex items-center justify-between p-8 text-left transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isOpen ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500'
                      }`}>
                        <FaQuestionCircle size={14} />
                      </div>
                      <span className={`text-sm font-bold uppercase tracking-widest transition-colors ${
                        isOpen ? 'text-blue-400' : 'text-slate-200'
                      }`}>
                        {item.question}
                      </span>
                    </div>
                    <FaChevronDown className={`text-slate-600 transition-transform duration-500 ${
                      isOpen ? 'rotate-180 text-blue-500' : ''
                    }`} />
                  </button>
                </div>
                
                <div 
                  className={`transition-all duration-500 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-8 pb-8 pl-[7.5rem]">
                    <p className="text-slate-400 text-sm leading-relaxed font-medium italic">
                      "{item.answer}"
                    </p>
                    <div className="mt-6 flex items-center gap-3 opacity-20">
                      <div className="h-px w-8 bg-blue-500" />
                      <span className="text-[8px] font-mono uppercase tracking-widest">Protocol Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
