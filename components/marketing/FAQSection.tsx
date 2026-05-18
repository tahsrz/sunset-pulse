'use client';

import React, { useState, useMemo } from 'react';
import { FaChevronDown, FaInfoCircle, FaQuestionCircle, FaArrowUp, FaArrowDown } from 'react-icons/fa';
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
  };

  const toggleFAQ = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  return (
    <section className="py-24 waterlily-section border-t border-teal-200/10">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 waterlily-chip px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-4">
            <FaInfoCircle className="text-xs" /> Platform Overview
          </div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter waterlily-heading mb-2">{faq.title}</h2>
          <p className="text-teal-100/55 text-[10px] font-mono uppercase tracking-[0.6em]">{faq.tagline}</p>
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
                    ? 'waterlily-card border-violet-200/40 shadow-2xl shadow-violet-500/10' 
                    : 'waterlily-card border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex">
                  {/* Voting Column */}
                  <div className="flex flex-col items-center justify-center px-4 bg-[#081824]/35 border-r border-teal-200/10 gap-2">
                    <button 
                      onClick={() => handleVote(originalIndex, 1)}
                      className="p-2 text-teal-100/35 hover:text-teal-200 transition-colors"
                      title="Helpful"
                    >
                      <FaArrowUp size={12} />
                    </button>
                    <span className="text-[10px] font-black font-mono text-amber-100/90">{item.score}</span>
                    <button 
                      onClick={() => handleVote(originalIndex, -1)}
                      className="p-2 text-teal-100/35 hover:text-rose-200 transition-colors"
                      title="Not Helpful"
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
                        isOpen ? 'bg-violet-500 text-white' : 'bg-white/5 text-teal-100/50'
                      }`}>
                        <FaQuestionCircle size={14} />
                      </div>
                      <span className={`text-sm font-bold uppercase tracking-widest transition-colors ${
                        isOpen ? 'text-violet-100' : 'text-slate-200'
                      }`}>
                        {item.question}
                      </span>
                    </div>
                    <FaChevronDown className={`text-teal-100/35 transition-transform duration-500 ${
                      isOpen ? 'rotate-180 text-violet-200' : ''
                    }`} />
                  </button>
                </div>
                
                <div 
                  className={`transition-all duration-500 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-8 pb-8 pl-[7.5rem]">
                    <p className="text-teal-50/70 text-sm leading-relaxed font-medium">
                      {item.answer}
                    </p>
                    <div className="mt-6 flex items-center gap-3 opacity-20">
                      <div className="h-px w-8 bg-teal-200" />
                      <span className="text-[8px] font-mono uppercase tracking-widest">Verified Content</span>
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
