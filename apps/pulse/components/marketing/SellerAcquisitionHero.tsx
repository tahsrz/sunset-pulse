import React from 'react';
import Link from 'next/link';
import { ArrowRight, MapPinned, Phone } from 'lucide-react';
import styles from '@/app/home.module.css';

const landmarks = [
  { number: '01', name: 'Double-wide', detail: '3 beds · 2 baths', x: 148, y: 78, leader: 'M158 90v17h30' },
  { number: '02', name: 'Outbuildings', detail: 'Workshop + 5 others', x: 414, y: 80, leader: 'M414 91h-24v25h-32' },
  { number: '03', name: 'Driveway', detail: 'Access from the road', x: 319, y: 222, leader: 'M319 233h-59' },
];

const outbuildings = [
  { x: 314, y: 108, width: 44, height: 29 },
  { x: 366, y: 132, width: 23, height: 17 },
  { x: 281, y: 126, width: 20, height: 17 },
  { x: 344, y: 163, width: 31, height: 19 },
  { x: 290, y: 187, width: 19, height: 15 },
  { x: 321, y: 198, width: 28, height: 16 },
];

function ExamplePropertyPlan() {
  return (
    <figure id="sunset-property-example" aria-labelledby="sunset-example-title" aria-describedby="sunset-example-disclaimer" tabIndex={-1} className={`${styles.panel} m-0 scroll-mt-28 overflow-hidden`}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3.5 sm:px-5">
        <span id="sunset-example-title" className="font-semibold">Example Property Layout</span>
        <span className="font-mono text-sm tabular-nums text-slate-300">2.5 acres</span>
      </figcaption>
      <svg viewBox="0 0 520 300" aria-hidden="true" className="block h-auto w-full border-y border-[var(--home-rule)]">
        <defs>
          <pattern id="sunset-site-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0v20" fill="none" stroke="#96a89c" strokeOpacity=".15" />
          </pattern>
          <pattern id="sunset-site-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0v6" stroke="#d2d8cd" strokeOpacity=".54" />
          </pattern>
        </defs>
        <path fill="#1a2322" d="M0 0h520v300H0z" />
        <path fill="#2b3a32" d="m98 62 293-25 29 120-26 84H121z" />
        <path fill="url(#sunset-site-grid)" d="M0 0h520v300H0z" />
        <path d="M0 75l98-13-9-62m302 37 129-11m-100 131 100-16M121 241 0 245m394-4 126-7" fill="none" stroke="#6e8176" strokeOpacity=".57" />
        <path d="m98 62 293-25 29 120-26 84H121z" fill="none" stroke="#a7c5a7" strokeWidth="1.7" />
        <path d="M0 266h520v34H0z" fill="#303b39" />
        <path d="M0 266h520M0 299h520" stroke="#788880" />
        <path d="M0 283h520" stroke="#a8b4ad" strokeOpacity=".48" strokeDasharray="10 8" />
        <path d="M252 267v-63q0-10-10-10h-43q-11 0-11-11v-31m64 52v-33q0-13 13-13h56q15 0 15-15v-6" fill="none" stroke="#899b91" strokeWidth="12" />
        <path d="M252 267v-63q0-10-10-10h-43q-11 0-11-11v-31m64 52v-33q0-13 13-13h56q15 0 15-15v-6" fill="none" stroke="#46574f" strokeWidth="9" />
        <rect x="145" y="107" width="86" height="45" fill="#afc6aa" stroke="#dbe6d8" />
        <path d="M145 129.5h86" stroke="#576e59" />
        {outbuildings.map(({ x, y, width, height }) => (
          <rect key={x} x={x} y={y} width={width} height={height} fill="url(#sunset-site-hatch)" stroke="#c1cec4" />
        ))}
        <g fill="#c4d1c8" className="font-mono text-[12px] tracking-wider">
          <text x="23" y="25">N</text>
          <path d="m28 31-5 11h10zM28 42v11" stroke="#c4d1c8" />
          <text x="23" y="257">ROAD FRONTAGE</text>
        </g>
        {landmarks.map(({ number, x, y, leader }) => (
          <g key={number} className="font-mono text-[13px] font-semibold">
            <path d={leader} fill="none" stroke="#d3dfd3" />
            <g transform={`translate(${x} ${y})`}>
              <rect width="28" height="22" fill="#16201e" stroke="#a7c5a7" />
              <text x="14" y="15" textAnchor="middle" fill="#e6eee7">{number}</text>
            </g>
          </g>
        ))}
      </svg>
      <ol className="grid gap-px bg-[var(--home-rule)] sm:grid-cols-3">
        {landmarks.map(({ number, name, detail }) => (
          <li key={number} className="flex items-start gap-2 bg-[var(--home-panel)] px-4 py-3 sm:px-3 xl:px-4">
            <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center border border-[var(--home-rule)] font-mono text-xs font-semibold text-[var(--home-accent)]">{number}</span>
            <span><span className="block text-sm font-semibold leading-6">{name}</span><span className="block text-sm leading-5 text-slate-300">{detail}</span></span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

export default function SellerAcquisitionHero({ campaignQuery = '', phone }: { campaignQuery?: string; phone?: string }) {
  return (
    <section aria-labelledby="seller-acquisition-title" className="py-9 sm:py-14 lg:py-20">
      <div className={`${styles.frame} grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-14`}>
        <div className="min-w-0">
          <p className={`${styles.label} mb-4 flex items-center gap-2`}>
            <MapPinned aria-hidden="true" size={19} /> Sunset, Texas and Nearby
          </p>
          <h1 id="seller-acquisition-title" className="max-w-[19ch] font-sans text-[clamp(2rem,4.6vw,4rem)] uppercase leading-[1.08] tracking-tight">
            Sell Your Home or Land in Sunset
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-200">
            If you’re selling a double-wide on acreage or a place with several buildings, tell us what’s there. We can talk through what to do before you list.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href={`/seller-plan${campaignQuery}#request`} className={`${styles.action} ${styles.primary} !min-h-14 text-center`}>
              Request My Free Seller Plan <ArrowRight aria-hidden="true" size={18} className="shrink-0" />
            </Link>
            {phone ? (
              <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="inline-flex min-h-12 items-center gap-2 font-semibold underline underline-offset-4">
                <Phone aria-hidden="true" size={18} /> Call About Selling
              </a>
            ) : (
              <a href="#sunset-property-example" className="inline-flex min-h-12 items-center font-semibold underline underline-offset-4 lg:hidden">See an Example Property</a>
            )}
          </div>
          <p className="mt-3 text-base text-slate-300">No account needed.</p>
        </div>
        <ExamplePropertyPlan />
      </div>
    </section>
  );
}
