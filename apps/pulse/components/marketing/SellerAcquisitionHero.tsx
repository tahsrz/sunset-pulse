import React, { type ReactNode } from 'react';
import HomeMoveTabs from './HomeMoveTabs';

export default function SellerAcquisitionHero({ sellerPlanHref, slideshow }: { sellerPlanHref: string; slideshow: ReactNode }) {
  return (
    <section aria-labelledby="seller-acquisition-title" className="bg-[#e9f9fb] py-9 text-[#232c43] sm:py-14 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
        <HomeMoveTabs sellerPlanHref={sellerPlanHref} />
        <div className="min-w-0 overflow-hidden rounded-xl border border-[#b9d8da]">{slideshow}</div>
      </div>
    </section>
  );
}
