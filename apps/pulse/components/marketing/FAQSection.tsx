'use client';

import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import marketingCopy from '@/config/marketing_copy.json';
import styles from '@/app/home.module.css';

export default function FAQSection() {
  const { faq } = marketingCopy;
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className={styles.section} aria-labelledby="home-faq-title">
      <div className={styles.frame}>
        <h2 id="home-faq-title" className="mb-6 text-3xl sm:text-4xl">{faq.title}</h2>
        <div className="border-y border-[#303946]">
          {faq.items.map((item, index) => {
            const itemId = 'faq-' + index;
            const answerId = itemId + '-answer';
            const isOpen = openId === itemId;
            return (
              <div key={itemId} className="border-b border-[#303946] last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenId(current => current === itemId ? null : itemId)}
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-[#121923] sm:px-6"
                >
                  <span className="min-w-0 text-base font-medium leading-6">{item.question}</span>
                  <FaChevronDown aria-hidden="true" className={isOpen ? 'shrink-0 rotate-180 text-slate-400' : 'shrink-0 text-slate-400'} />
                </button>
                <div id={answerId} aria-hidden={!isOpen} inert={!isOpen} hidden={!isOpen} className="px-4 pb-5 sm:px-6">
                  <p className="max-w-3xl text-base leading-7 text-slate-300">{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
