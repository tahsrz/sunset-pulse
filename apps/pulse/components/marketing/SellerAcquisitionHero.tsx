import React from 'react';
import Link from 'next/link';
import { ArrowRight, MapPinned, Phone } from 'lucide-react';
import styles from '@/app/home.module.css';

const landmarks = [
  { number: 1, name: 'Double-wide', detail: '3 bedrooms · 2 baths', x: 164, y: 114 },
  { number: 2, name: 'Workshop', x: 298, y: 137 },
  { number: 3, name: 'Driveway', x: 242, y: 217 },
];

function ExamplePropertySketch() {
  return (
    <figure id="sunset-property-example" aria-labelledby="sunset-example-title" tabIndex={-1} className="m-0 min-w-0 scroll-mt-28 overflow-hidden border border-slate-300 bg-[#fdfbf6]">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-4 font-mono text-sm sm:px-6">
        <span id="sunset-example-title" className="font-semibold text-[#283a2f]">An Example Property</span>
        <span className="font-medium tabular-nums text-[#49584b]">2.5 acres</span>
      </figcaption>
      <svg viewBox="0 0 520 280" aria-hidden="true" className="block h-auto w-full border-y border-slate-300">
        <defs>
          <pattern id="sunset-sketch-paper" width="15" height="15" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r=".65" fill="#667356" opacity=".26" />
          </pattern>
        </defs>
        <path fill="#e3e5cf" d="M0 0h520v280H0z" />
        <path fill="url(#sunset-sketch-paper)" d="M0 0h520v280H0z" />
        <g fill="none" stroke="#798260" strokeWidth="1.2" opacity=".34">
          <path d="M-18 112C102 86 124 18 228 2S397 45 540-14" />
          <path d="M-18 130C108 103 136 32 232 18S412 65 540 1" />
          <path d="M-18 148C106 124 149 50 240 35S414 84 540 17" />
          <path d="M340 274c-9-69 44-101 102-110s71-47 90-68" />
          <path d="M363 276c-7-50 35-79 88-88s63-37 83-60" />
          <path d="M386 281c-1-39 25-63 76-72s58-27 74-41" />
        </g>
        <path d="M0 248C184 219 342 243 520 231v49H0Z" fill="#c9bc9e" />
        <path d="M0 257c167-28 348-4 520-19" fill="none" stroke="#f5f1e0" strokeWidth="2" strokeDasharray="9 8" />
        <path d="m84 82 300-25 37 141-320 24z" fill="#d1d9b8" fillOpacity=".66" stroke="#536449" strokeWidth="2" strokeDasharray="6 5" />
        <path d="M251 242c-7-26-10-48-37-64l-41-24m41 24 65-16" fill="none" stroke="#a88e66" strokeWidth="12" strokeLinecap="round" />
        <path d="M251 242c-7-26-10-48-37-64l-41-24m41 24 65-16" fill="none" stroke="#e9dabb" strokeWidth="8" strokeLinecap="round" />
        <g stroke="#5b4e3e" strokeWidth="1.7">
          <path d="m131 125 68-8 5 38-68 8z" fill="#f9f1db" />
          <path d="m126 128 36-20 40 11-1 12-72 9z" fill="#bb795b" />
          <path d="m267 147 53-7 4 30-53 6z" fill="#b6a080" />
          <path d="m263 146 25-14 34 6 1 10-59 8z" fill="#766952" />
        </g>
        <g fill="#7e9569" stroke="#e6ead6" strokeWidth="2">
          <circle cx="67" cy="166" r="13" /><circle cx="83" cy="180" r="10" />
          <circle cx="350" cy="98" r="13" /><circle cx="369" cy="110" r="11" />
          <circle cx="351" cy="120" r="9" /><circle cx="112" cy="194" r="9" />
        </g>
        {landmarks.map(({ number, x, y }) => (
          <g key={number} transform={`translate(${x} ${y})`}>
            <path d="M0 16 8 7H-8Z" fill="#273c32" />
            <circle cy="-3" r="13" fill="#273c32" stroke="#fdfbf3" strokeWidth="2" />
            <text y="1" textAnchor="middle" fill="#fffdf4" fontSize="12" fontWeight="700">{number}</text>
          </g>
        ))}
      </svg>
      <ol className="grid gap-px bg-slate-300 sm:grid-cols-3">
        {landmarks.map(({ number, name, detail }) => (
          <li key={number} className="flex items-start gap-2 bg-[#fdfbf6] px-4 py-3 text-[#283a2f] sm:px-5">
            <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-sm border border-[#a9b5a6] font-mono text-xs font-bold">{number}</span>
            <span><span className="block font-semibold leading-6">{name}</span>{detail ? <span className="block text-sm text-[#49584b]">{detail}</span> : null}</span>
          </li>
        ))}
      </ol>
      <p className="border-t border-slate-300 px-5 py-3 text-sm text-[#49584b] sm:px-6">A sketch helps someone find the driveway and tell the buildings apart.</p>
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
          <p className="mt-3 text-base text-slate-300">No account needed. It’s fine if you’re just thinking about selling.</p>
        </div>
        <ExamplePropertySketch />
      </div>
    </section>
  );
}
