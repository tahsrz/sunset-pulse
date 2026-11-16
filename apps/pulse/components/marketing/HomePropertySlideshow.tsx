'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';

export type HomePropertySlide = {
  id: string;
  name: string;
  locality: string;
  photo: string;
  href: string;
  price?: number | null;
  credit?: string;
};

const slideDuration = 6000;
const dollarPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
const controlClass = 'inline-flex size-11 items-center justify-center rounded-full border border-white/25 text-white enabled:hover:bg-white/10 disabled:opacity-40';

export default function HomePropertySlideshow({ slides }: { slides: HomePropertySlide[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const canGoBack = index > 0;
  const canAdvance = index < slides.length - 1;
  const isPlaying = playing && canAdvance;
  const slide = slides[index];

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function honorMotionPreference() {
      if (motion.matches) setPlaying(false);
    }
    honorMotionPreference();
    motion.addEventListener('change', honorMotionPreference);
    return () => motion.removeEventListener('change', honorMotionPreference);
  }, []);

  useEffect(() => {
    if (!playing || hovering || !canAdvance) return;
    const timer = window.setTimeout(() => setIndex(index + 1), slideDuration);
    return () => window.clearTimeout(timer);
  }, [canAdvance, hovering, index, playing]);

  if (!slide) {
    return (
      <div className="grid min-h-40 place-items-center border-t border-white/10 bg-[#0a2029] lg:border-l lg:border-t-0">
        <Link href="/properties" className="inline-flex min-h-11 items-center gap-2 font-bold text-teal-100 underline underline-offset-4">
          Browse available homes <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
    );
  }

  function stepBy(offset: number) {
    setPlaying(false);
    setFailedPhoto(undefined);
    setIndex((current) => Math.min(slides.length - 1, Math.max(0, current + offset)));
  }

  return (
    <div
      role="region"
      aria-roledescription="slideshow"
      aria-label="Featured properties"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={(event) => {
        if (event.target.matches(':focus-visible') && !event.currentTarget.contains(event.relatedTarget)) setPlaying(false);
      }}
      className="overflow-hidden bg-[#0a2029]"
    >
      <div className="relative isolate flex min-h-[250px] sm:min-h-[320px]">
        {failedPhoto !== slide.photo && (
          <Image
            key={slide.id}
            src={slide.photo}
            alt={`Photo of ${slide.name}`}
            fill
            unoptimized
            loading="eager"
            onError={() => setFailedPhoto(slide.photo)}
            className="object-cover"
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="relative flex w-full min-w-0 flex-col items-start p-4 sm:p-6" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
          {slide.price != null && slide.price > 0 ? (
            <p className="mb-5 rounded-md bg-slate-950/90 px-3 py-1.5 text-lg font-bold tabular-nums text-white">
              <span className="sr-only">Listing price </span>{dollarPrice.format(slide.price)}
            </p>
          ) : null}
          <div className="mt-auto">
            <Link href={slide.href} className="inline-block max-w-full break-words rounded font-bold text-white hover:underline sm:text-lg">
              {slide.name}
            </Link>
            {slide.locality ? <p className="mt-0.5 text-sm text-slate-200">{slide.locality}</p> : null}
            {slide.credit ? <p className="mt-1 text-xs text-slate-300">{slide.credit}</p> : null}
          </div>
        </div>
      </div>
      {slides.length > 1 ? (
        <div className="flex items-center justify-between gap-2 border-t border-white/15 px-4 py-2 sm:px-6">
          <span className="text-sm font-semibold tabular-nums text-slate-200"><span className="sr-only">Property </span>{index + 1} of {slides.length}</span>
          <div className="flex gap-2">
            <button type="button" aria-label="Previous property" disabled={!canGoBack} onClick={() => stepBy(-1)} className={controlClass}>
              <ArrowLeft aria-hidden="true" size={18} />
            </button>
            <button type="button" aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'} disabled={!canAdvance} onClick={() => setPlaying(!playing)} className={controlClass}>
              {isPlaying ? <Pause aria-hidden="true" size={17} /> : <Play aria-hidden="true" size={17} />}
            </button>
            <button type="button" aria-label="Next property" disabled={!canAdvance} onClick={() => stepBy(1)} className={controlClass}>
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
