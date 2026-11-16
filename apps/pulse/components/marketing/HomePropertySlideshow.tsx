'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';

export type HomePropertySlide = {
  id: string;
  name: string;
  locality: string;
  photos: string[];
  href: string;
  price?: number | null;
  monthly?: boolean;
  credit?: string;
  rendering?: boolean;
};

const slideDuration = 6000;
const photoTimeout = 8000;
const dollarPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
const controlClass = 'inline-flex size-11 items-center justify-center rounded-full border border-white/25 text-white enabled:hover:bg-white/10 disabled:opacity-40';

type PhotoSelection = { index: number; photoIndex: number; direction: 1 | -1; wrap: boolean };
type SlideshowView = {
  shown: PhotoSelection | null;
  pending: PhotoSelection | null;
  unavailable: Set<number>;
};

function findNextPhoto(length: number, from: number, direction: 1 | -1, wrap: boolean, unavailable: Set<number>, shown?: number): PhotoSelection | null {
  for (let step = 1; step <= length; step++) {
    const position = from + step * direction;
    if (!wrap && (position < 0 || position >= length)) return null;
    const index = (position + length) % length;
    if (index === shown) return null;
    if (!unavailable.has(index)) return { index, photoIndex: 0, direction, wrap };
  }
  return null;
}

function skipFailedPhoto(view: SlideshowView, photo: PhotoSelection, slides: HomePropertySlide[]): SlideshowView {
  if (view.pending !== photo) return view;
  if (photo.photoIndex + 1 < slides[photo.index].photos.length) {
    return { ...view, pending: { ...photo, photoIndex: photo.photoIndex + 1 } };
  }
  const unavailable = new Set(view.unavailable).add(photo.index);
  return {
    ...view,
    unavailable,
    pending: findNextPhoto(slides.length, photo.index, photo.direction, photo.wrap, unavailable, view.shown?.index),
  };
}

export default function HomePropertySlideshow({ slides }: { slides: HomePropertySlide[] }) {
  const [view, setView] = useState<SlideshowView>(() => ({
    shown: null,
    pending: slides.length ? { index: 0, photoIndex: 0, direction: 1, wrap: false } : null,
    unavailable: new Set(),
  }));
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);
  const { shown, pending, unavailable } = view;
  const slide = shown ? slides[shown.index] : null;
  const following = shown ? findNextPhoto(slides.length, shown.index, 1, false, unavailable) : null;
  const isPlaying = playing && Boolean(following);
  const availableCount = slides.length - unavailable.size;

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
    if (!pending) return;
    const timer = window.setTimeout(() => setView((current) => skipFailedPhoto(current, pending, slides)), photoTimeout);
    return () => window.clearTimeout(timer);
  }, [pending, slides]);

  useEffect(() => {
    if (!playing || hovering || pending || !shown) return;
    const next = findNextPhoto(slides.length, shown.index, 1, false, unavailable);
    if (!next) return;
    const timer = window.setTimeout(() => setView((current) => ({ ...current, pending: next })), slideDuration);
    return () => window.clearTimeout(timer);
  }, [hovering, pending, playing, shown, slides.length, unavailable]);

  if (!slide && !pending) {
    return (
      <div className="grid min-h-40 place-items-center border-t border-white/10 bg-[#0a2029] lg:border-l lg:border-t-0">
        <Link href="/properties" className="inline-flex min-h-11 items-center gap-2 font-bold text-teal-100 underline underline-offset-4">
          Browse available homes <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
    );
  }

  function stepBy(direction: 1 | -1) {
    setPlaying(false);
    setView((current) => {
      if (current.pending || !current.shown) return current;
      const index = current.shown.index;
      const next = findNextPhoto(slides.length, index, direction, true, current.unavailable, index);
      return next ? { ...current, pending: next } : current;
    });
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
        {[shown, pending].map((photo) => {
          if (!photo) return null;
          const property = slides[photo.index];
          return (
            <Image
              key={`${property.id}:${photo.photoIndex}`}
              src={property.photos[photo.photoIndex]}
              alt={photo === shown ? `${property.rendering ? 'Exterior rendering' : 'Photo'} of ${property.name}` : ''}
              fill
              unoptimized
              loading="eager"
              onLoad={(event) => {
                if (event.currentTarget.naturalWidth > 0) {
                  setView((current) => current.pending === photo ? { ...current, shown: photo, pending: null } : current);
                } else {
                  setView((current) => skipFailedPhoto(current, photo, slides));
                }
              }}
              onError={() => setView((current) => skipFailedPhoto(current, photo, slides))}
              className={photo === shown ? 'object-cover' : 'invisible object-cover'}
            />
          );
        })}
        {slide ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            <div className="relative flex w-full min-w-0 flex-col items-start p-4 sm:p-6" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
              {slide.price != null && slide.price > 0 ? (
                <p className="mb-5 rounded-md bg-slate-950/90 px-3 py-1.5 text-lg font-bold tabular-nums text-white">
                  <span className="sr-only">{slide.monthly ? 'Monthly rent ' : 'Listing price '}</span>{dollarPrice.format(slide.price)}{slide.monthly ? '/mo' : ''}
                </p>
              ) : null}
              <div className="mt-auto">
                <Link href={slide.href} className="inline-block max-w-full break-words rounded font-bold text-white hover:underline sm:text-lg">
                  {slide.name}
                </Link>
                {slide.locality ? <p className="mt-0.5 text-sm text-slate-200">{slide.locality}</p> : null}
                {slide.rendering ? <p className="mt-1 text-xs text-slate-300">Exterior rendering</p> : null}
                {slide.credit ? <p className="mt-1 text-xs text-slate-300">{slide.credit}</p> : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
      {shown && availableCount > 1 ? (
        <div className="flex items-center justify-between gap-2 border-t border-white/15 px-4 py-2 sm:px-6">
          <span className="text-sm font-semibold tabular-nums text-slate-200"><span className="sr-only">Property </span>{shown.index + 1 - [...unavailable].filter((index) => index < shown.index).length} of {availableCount}</span>
          <div className="flex gap-2">
            <button type="button" aria-label="Previous property" aria-disabled={Boolean(pending)} onClick={() => stepBy(-1)} className={controlClass}>
              <ArrowLeft aria-hidden="true" size={18} />
            </button>
            <button type="button" aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'} disabled={!following} onClick={() => setPlaying(!playing)} className={controlClass}>
              {isPlaying ? <Pause aria-hidden="true" size={17} /> : <Play aria-hidden="true" size={17} />}
            </button>
            <button type="button" aria-label="Next property" aria-disabled={Boolean(pending)} onClick={() => stepBy(1)} className={controlClass}>
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
