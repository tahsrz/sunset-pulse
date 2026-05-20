'use client';

import React from 'react';
import { FaNewspaper, FaSeedling, FaStore, FaTrain } from 'react-icons/fa';
import { ATLAS_PULSE_STAGES, getTexasPlaceHistory } from '@/lib/tah/texasPlaceHistory';

const historyIcons = [<FaStore key="store" />, <FaNewspaper key="newspaper" />, <FaTrain key="train" />, <FaSeedling key="seedling" />];

type SunsetHistorySectionProps = {
  slug?: string;
};

const SunsetHistorySection = ({ slug = 'sunset' }: SunsetHistorySectionProps) => {
  const entry = getTexasPlaceHistory(slug);

  if (!entry) return null;

  const completedStages = new Set(entry.atlasPulse.completedStages);

  return (
    <section className="waterlily-section py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.5em] text-amber-200">
              {entry.name}
            </p>
            <h2 className="waterlily-heading mb-6 text-4xl font-black uppercase italic tracking-tighter md:text-5xl">
              {entry.headline}
            </h2>
            <p className="max-w-xl text-base leading-8 text-teal-50/72">
              {entry.summary}
            </p>
            <p className="mt-5 max-w-xl text-sm leading-7 text-teal-100/55">
              {entry.detail}
            </p>
            <div className="mt-7 rounded-lg border border-amber-200/15 bg-black/18 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100/70">
                  Atlas Pulse
                </p>
                <span className="font-mono text-xs text-amber-100">
                  {entry.atlasPulse.bindingStrength}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-amber-200"
                  style={{ width: `${entry.atlasPulse.bindingStrength}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {ATLAS_PULSE_STAGES.map(stage => (
                  <span
                    key={stage.id}
                    className={`rounded border px-2 py-2 text-center text-[9px] font-black uppercase tracking-[0.12em] ${
                      completedStages.has(stage.id)
                        ? 'border-amber-200/40 bg-amber-200/15 text-amber-100'
                        : 'border-white/10 bg-white/[0.03] text-teal-50/35'
                    }`}
                  >
                    {stage.label}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs leading-6 text-teal-50/62">
                {entry.atlasPulse.physicalAnchor} is currently strongest against {entry.tah.cartridgeName}.
              </p>
              <p className="mt-2 font-mono text-[11px] text-teal-50/45">
                {entry.tah.querySeed}
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-[0.2em]">
              {entry.sources.map(source => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-teal-200/15 px-4 py-2 text-teal-100/65 transition hover:border-teal-200/40 hover:text-white"
                >
                  {source.label}
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {entry.milestones.map((item, index) => (
              <article key={item.title} className="waterlily-card rounded-lg p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-300/15 text-amber-200">
                    {historyIcons[index % historyIcons.length]}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-100/45">
                    {item.label}
                  </span>
                </div>
                <h3 className="mb-3 text-lg font-black uppercase tracking-tight text-white">
                  {item.title}
                </h3>
                <p className="text-sm leading-7 text-teal-50/62">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SunsetHistorySection;
