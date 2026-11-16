'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Pause, Play } from 'lucide-react';

export type HomePropertySlide = {
  id: string;
  name: string;
  locality: string;
  photo: string;
  href: string;
  credit?: string;
};

const slideDuration = 6000;
const controlClass = 'inline-flex size-11 items-center justify-center rounded-full border border-white/25 bg-slate-950/80 text-white hover:bg-slate-800';

export default function HomePropertySlideshow({ slides }: { slides: HomePropertySlide[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const canAdvance = index < slides.length - 1;
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
      className="relative isolate flex min-h-[250px] items-end overflow-hidden bg-[#0a2029] sm:min-h-[320px]"
    >
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
      <div className="relative w-full min-w-0 p-4 pr-28 sm:p-6 sm:pr-32" aria-live={playing && canAdvance ? 'off' : 'polite'}>
        <Link href={slide.href} className="inline-block max-w-full break-words rounded font-bold text-white hover:underline sm:text-lg">
          {slide.name}
        </Link>
        {slide.locality ? <p className="mt-0.5 text-sm text-slate-200">{slide.locality}</p> : null}
        {slide.credit ? <p className="mt-1 text-xs text-slate-300">{slide.credit}</p> : null}
      </div>
      {slides.length > 1 ? (
        <div className="absolute bottom-3 right-3 flex gap-1 sm:bottom-5 sm:right-5">
          <button
            type="button"
            aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
            disabled={!canAdvance}
            onClick={() => setPlaying(!playing)}
            className={`${controlClass} disabled:opacity-50`}
          >
            {playing ? <Pause aria-hidden="true" size={17} /> : <Play aria-hidden="true" size={17} />}
          </button>
          <button
            type="button"
            aria-label="Next property"
            disabled={!canAdvance}
            onClick={() => {
              setPlaying(false);
              setIndex(index + 1);
            }}
            className={`${controlClass} disabled:opacity-50`}
          >
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
