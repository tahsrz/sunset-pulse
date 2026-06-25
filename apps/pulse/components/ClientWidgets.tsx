'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

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

  const focusedGameSurface =
    pathname?.startsWith('/value-guess') ||
    pathname?.startsWith('/location-guess') ||
    pathname?.startsWith('/retail-clash');

  if (focusedGameSurface) {
    return null;
  }

  const operatorSurface =
    pathname?.startsWith('/command-center') ||
    pathname?.startsWith('/jamie-chat') ||
    pathname?.startsWith('/admin/orchestrator');

  if (operatorSurface) {
    return (
      <>
        <FeedbackWidget />
        <DevPortal />
      </>
    );
  }

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
