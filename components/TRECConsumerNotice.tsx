'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const TRECConsumerNotice = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="no-print border-b border-white/5 bg-[#040b12] text-slate-300">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 py-2 text-left"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span className="text-[11px] font-semibold leading-5 text-slate-400">
            <span className="mr-2 font-black uppercase text-cyan-200">Notice to Consumers</span>
            TREC forms and simulations are informational and not legal advice.
          </span>
          <ChevronDown size={16} className={`shrink-0 text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <p className="max-w-5xl pb-3 text-[11px] leading-5 text-slate-500">
            The contract forms displayed on this site are promulgated by the Texas Real Estate Commission (TREC).
            These forms are intended primarily for licensed real estate brokers or sales agents trained in their
            correct use. Use by the general public without the guidance of a licensed professional is at the user's
            own risk.
          </p>
        )}
      </div>
    </header>
  );
};

export default TRECConsumerNotice;
