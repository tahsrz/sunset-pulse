import React, { type ReactNode } from 'react';
import styles from '@/app/home.module.css';
import HomeMoveTabs from './HomeMoveTabs';

export default function SellerAcquisitionHero({ sellerPlanHref, slideshow }: { sellerPlanHref: string; slideshow: ReactNode }) {
  return (
    <section aria-labelledby="seller-acquisition-title" className="py-9 sm:py-14 lg:py-20">
      <div className={`${styles.frame} grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-14`}>
        <div className="min-w-0">
          <h1 id="seller-acquisition-title" className="max-w-xl text-3xl font-black leading-[1.05] tracking-tight sm:text-5xl">
            Move fast with a Pulse agent.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-200 sm:text-lg">
            We've helped 1000+ customers sell their home without the stress.
          </p>
          <HomeMoveTabs sellerPlanHref={sellerPlanHref} />
        </div>
        <div className={`${styles.panel} overflow-hidden`}>{slideshow}</div>
      </div>
    </section>
  );
}
