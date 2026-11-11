'use client';

import React from 'react';
import Image from 'next/image';
import { FaNewspaper, FaSeedling, FaStore, FaTrain } from 'react-icons/fa';
import { ATLAS_PULSE_STAGES, getTexasPlaceHistory } from '@/lib/tah/texasPlaceHistory';

import styles from '@/app/home.module.css';

const historyIcons = [<FaStore key="store" />, <FaNewspaper key="newspaper" />, <FaTrain key="train" />, <FaSeedling key="seedling" />];

type SunsetHistorySectionProps = {
  slug?: string;
  editorial?: boolean;
};

const SunsetHistorySection = ({ slug = 'sunset', editorial = false }: SunsetHistorySectionProps) => {
  const entry = getTexasPlaceHistory(slug);

  if (!entry) return null;

  const completedStages = new Set(entry.atlasPulse.completedStages);

  return (
    <section className={editorial ? styles.section : "waterlily-section py-16 text-white sm:py-20"}>
      <div className={editorial ? styles.frame : "mx-auto max-w-7xl px-6"}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className={editorial ? "min-w-0 lg:col-span-2" : "min-w-0"}>
            <p className={`mb-4 ${editorial ? `${styles.label} text-center` : "text-xs text-amber-200"}`}>
              {entry.name}
            </p>
            <h2 className={`mb-6 ${editorial ? `${styles.editorial} mx-auto max-w-4xl text-center text-3xl sm:text-4xl md:text-5xl` : "waterlily-heading text-4xl font-black italic tracking-tighter md:text-5xl"}`}>
              {entry.headline}
            </h2>
            <div className={editorial ? "mx-auto grid max-w-4xl gap-4 text-base leading-7 text-slate-300 md:grid-cols-2 md:gap-8" : undefined}>
              <p className={editorial ? undefined : "max-w-xl text-base leading-8 text-slate-200"}>
                {entry.summary}
              </p>
              <p className={editorial ? undefined : "mt-5 max-w-xl text-sm leading-7 text-slate-300"}>
                {entry.detail}
              </p>
            </div>
          </div>

          <div className={`min-w-0 sm:grid-cols-2 ${editorial ? `${styles.grid} lg:col-span-2 lg:grid-cols-4` : "grid gap-4"}`}>
            {entry.milestones.map((item, index) => (
              <article key={item.title} className={`min-w-0 p-5 ${editorial ? "xl:p-6" : "waterlily-card rounded-2xl sm:p-6"}`}>
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded border border-slate-600 text-slate-300">
                    {historyIcons[index % historyIcons.length]}
                  </div>
                  <span className={editorial ? `${styles.label} !normal-case` : "text-xs font-semibold text-slate-300"}>
                    {item.label}
                  </span>
                </div>
                <h3 className="mb-3 text-base font-semibold leading-6 text-white">
                  {item.title}
                </h3>
                <p className="text-sm leading-7 text-slate-300">
                  {item.body}
                </p>
              </article>
            ))}
          </div>

            {/* Sunset Gas & Grill History Section */}
            <div className={`grid min-w-0 gap-6 p-6 sm:p-8 lg:col-span-2 lg:grid-cols-2 ${editorial ? styles.panel : "rounded-2xl border border-white/15 bg-black/10"}`}>
              <div className="flex items-center gap-3 lg:col-span-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded border border-slate-600 text-slate-300">
                  <FaStore className="text-lg" />
                </div>
                <div>
                  <span className={editorial ? styles.label : "text-xs text-slate-300"}>Community landmark</span>
                  <h3 className={`text-2xl text-white ${editorial ? styles.editorial : "font-bold"}`}>{entry.landmark.name}</h3>
                </div>
              </div>

              <Image
                src="/images/grill/sunset-gas-grill-storefront.webp"
                alt={entry.landmark.imageAlt}
                width={1275}
                height={389}
                sizes="(min-width: 1280px) 560px, (min-width: 1024px) calc(50vw - 76px), (min-width: 640px) calc(100vw - 112px), calc(100vw - 88px)"
                className="block h-auto w-full self-start border border-white/10"
              />
              <div className="min-w-0">
              <p className="text-sm leading-7 text-slate-200">
                {entry.landmark.description}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
                <span className="font-mono text-xs text-slate-300">📍 {entry.landmark.address}</span>
                <a 
                  href="/grill"
                  className={editorial ? styles.action : "inline-flex min-h-11 items-center gap-1.5 text-xs text-slate-300"}
                >
                  Visit Grill Menu <span className="text-xs">→</span>
                </a>
              </div>
              </div>
            </div>

            <div className={`min-w-0 p-5 lg:col-span-2 ${editorial ? styles.panel : "rounded-2xl border border-white/15 bg-black/20"}`}>
              <div className="flex items-center justify-between gap-4">
                <p className={editorial ? styles.label : "text-xs text-slate-300"}>
                  Atlas Pulse
                </p>
                <span className="font-mono text-xs text-slate-200">
                  {entry.atlasPulse.bindingStrength}%
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden bg-white/15">
                <div
                  className="h-full bg-[#a7c5a7]"
                  style={{ width: `${entry.atlasPulse.bindingStrength}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {ATLAS_PULSE_STAGES.map(stage => (
                  <span
                    key={stage.id}
                    className={`rounded border px-2 py-2 text-center font-mono text-[11px] ${
                      completedStages.has(stage.id)
                        ? 'border-[#a7c5a7]/50 bg-[#a7c5a7]/10 text-[#d5e7d5]'
                        : 'border-white/15 text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs leading-6 text-slate-300">
                {entry.atlasPulse.physicalAnchor} is currently strongest against {entry.tah.cartridgeName}.
              </p>
              <p className="mt-2 font-mono text-xs text-slate-400">
                {entry.tah.querySeed}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-semibold lg:col-span-2">
              {entry.sources.map(source => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className={editorial ? styles.action : "rounded border border-white/15 px-4 py-2 text-slate-300 hover:text-white"}
                >
                  {source.label}
                </a>
              ))}
            </div>
        </div>
      </div>
    </section>
  );
};

export default SunsetHistorySection;
