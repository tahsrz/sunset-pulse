'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { isFocusedGameSurface, isLightweightGlobalSurface, isOperatorSurface } from '@/lib/navigation/focusedSurfaces';

const JamieChat = dynamic(() => import('@/components/JamieChat'), { ssr: false });
const FeedbackWidget = dynamic(() => import('@/components/FeedbackWidget'), { ssr: false });
const DevPortal = dynamic(() => import('@/components/DevPortal'), { ssr: false });
const JamieInsightsLoginToast = dynamic(() => import('@/components/JamieInsightsLoginToast'), { ssr: false });
const JamiePulseOverlay = dynamic(() => import('@/components/JamiePulseOverlay'), { ssr: false });

export default function ClientWidgets() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (isFocusedGameSurface(pathname)) {
    return null;
  }

  if (isOperatorSurface(pathname)) {
    return (
      <>
        <FeedbackWidget />
        <DevPortal />
      </>
    );
  }

  if (isLightweightGlobalSurface(pathname)) return null;

  return (
    <>
      <JamieChat />
      <FeedbackWidget />
      <DevPortal />
      <JamieInsightsLoginToast />
      <JamiePulseOverlay />
    </>
  );
}
