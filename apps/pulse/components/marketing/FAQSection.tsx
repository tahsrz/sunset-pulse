'use client';

import React, { useState, useMemo } from 'react';
import { FaChevronDown, FaInfoCircle, FaQuestionCircle, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import marketingCopy from '@/config/marketing_copy.json';

const FAQSection = () => {
  const { faq } = marketingCopy;
  const [openId, setOpenId] = useState<string | null>(null);
  const [items, setItems] = useState(faq.items);

  const sortedItems = useMemo(() => {
    return items.map((item, index) => ({ item, index })).sort((a, b) => b.item.score - a.item.score);
  }, [items]);

  const handleVote = (index: number, delta: number) => {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, score: item.score + delta } : item
    )));
  };

  const toggleFAQ = (id: string) => {
    setOpenId((current) => current === id ? null : id);
  };

  return (
    <section className="waterlily-section border-t border-teal-200/10 py-16 sm:py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-10 text-center sm:mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full waterlily-chip px-4 py-1.5 text-xs font-semibold tracking-wider">
            <FaInfoCircle className="text-xs" /> Platform Overview
          </div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter waterlily-heading mb-2">{faq.title}</h2>
          <p className="text-sm leading-6 text-teal-100/70">{faq.tagline}</p>
        </div>

        <div className="space-y-4">
          {sortedItems.map(({ item, index }) => {
            const itemId = `faq-${index}`;
            const answerId = `${itemId}-answer`;
            const isOpen = openId === itemId;

            return (
              <div 
                key={itemId} 
                className={`group rounded-3xl border transition-all duration-500 overflow-hidden ${
                  isOpen 
                    ? 'waterlily-card border-violet-200/40 shadow-2xl shadow-violet-500/10' 
                    : 'waterlily-card border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex min-w-0">
                  {/* Voting Column */}
                  <div className="flex flex-col items-center justify-center px-4 bg-[#081824]/35 border-r border-teal-200/10 gap-2">
                    <button 
                      type="button"
                      onClick={() => handleVote(index, 1)}
                      className="min-h-10 min-w-10 p-2 text-teal-100/65 transition-colors hover:text-teal-200"
                      aria-label={`Mark “${item.question}” helpful`}
                    >
                      <FaArrowUp size={12} />
                    </button>
                    <span aria-label={`${item.score} helpfulness points`} className="text-xs font-semibold tabular-nums text-amber-100">{item.score}</span>
                    <button 
                      type="button"
                      onClick={() => handleVote(index, -1)}
                      className="min-h-10 min-w-10 p-2 text-teal-100/65 transition-colors hover:text-rose-200"
                      aria-label={`Mark “${item.question}” not helpful`}
                    >
                      <FaArrowDown size={12} />
                    </button>
                  </div>

                  <button 
                    type="button"
                    onClick={() => toggleFAQ(itemId)}
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    className="flex min-w-0 flex-1 items-center justify-between gap-4 p-4 text-left transition-colors sm:gap-6 sm:p-6"
                  >
                    <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
                        isOpen ? 'bg-violet-500 text-white' : 'bg-white/5 text-teal-100/50'
                      }`}>
                        <FaQuestionCircle size={14} />
                      </div>
                      <span className={`text-sm font-semibold leading-5 transition-colors sm:text-base ${
                        isOpen ? 'text-violet-100' : 'text-slate-200'
                      }`}>
                        {item.question}
                      </span>
                    </div>
                    <FaChevronDown aria-hidden="true" className={`shrink-0 text-teal-100/60 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-violet-200' : ''
                    }`} />
                  </button>
                </div>
                
                <div
                  id={answerId}
                  aria-hidden={!isOpen}
                  inert={!isOpen}
                  className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="pb-6 pl-16 pr-5 sm:pb-8 sm:pl-[7.5rem] sm:pr-8">
                      <p className="text-sm font-medium leading-6 text-teal-50/80 sm:leading-7">
                        {item.answer}
                      </p>
                      <div className="mt-5 flex items-center gap-3 text-teal-100/55">
                        <div className="h-px w-8 bg-teal-200" />
                        <span className="text-xs font-medium">Verified content</span>
                      </div>
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
