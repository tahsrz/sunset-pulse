'use client';

import React, { useEffect, useState } from 'react';
import Image, { type ImageProps } from 'next/image';

type SafePropertyImageProps = Omit<ImageProps, 'src'> & {
  src?: string | null;
  fallbackSrc?: string;
  fallbackAlt?: string;
};

const DEFAULT_FALLBACK = '/images/properties/rhome1.jpg';

export default function SafePropertyImage({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  fallbackAlt,
  alt,
  ...props
}: SafePropertyImageProps) {
  const sourceSrc = src ? normalizeImageSource(src, fallbackSrc) : null;
  const initialSrc = sourceSrc ?? fallbackSrc;
  const [currentSrc, setCurrentSrc] = useState(initialSrc);

  useEffect(() => {
    setCurrentSrc(initialSrc);
  }, [initialSrc]);

  const showingFallback = !sourceSrc || currentSrc === fallbackSrc || currentSrc !== sourceSrc;

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={showingFallback && fallbackAlt ? fallbackAlt : alt}
      onError={() => {
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
      }}
    />
  );
}

function normalizeImageSource(src: string | null | undefined, fallbackSrc: string) {
  if (!src) return fallbackSrc;
  if (/^https?:\/\//i.test(src) || src.startsWith('/')) return src;
  return `/${src}`;
}
