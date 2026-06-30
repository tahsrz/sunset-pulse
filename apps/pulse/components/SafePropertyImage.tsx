'use client';

import { useEffect, useState } from 'react';
import Image, { type ImageProps } from 'next/image';

type SafePropertyImageProps = Omit<ImageProps, 'src'> & {
  src?: string | null;
  fallbackSrc?: string;
};

const DEFAULT_FALLBACK = '/images/properties/rhome1.jpg';

export default function SafePropertyImage({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  alt,
  ...props
}: SafePropertyImageProps) {
  const normalizedSrc = normalizeImageSource(src, fallbackSrc);
  const [currentSrc, setCurrentSrc] = useState(normalizedSrc);

  useEffect(() => {
    setCurrentSrc(normalizedSrc);
  }, [normalizedSrc]);

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={() => setCurrentSrc(fallbackSrc)}
    />
  );
}

function normalizeImageSource(src: string | null | undefined, fallbackSrc: string) {
  if (!src) return fallbackSrc;
  if (/^https?:\/\//i.test(src) || src.startsWith('/')) return src;
  return `/${src}`;
}
