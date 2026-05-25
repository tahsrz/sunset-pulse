'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const JamieChat = dynamic(() => import('@/components/JamieChat'), { ssr: false });
const FeedbackWidget = dynamic(() => import('@/components/FeedbackWidget'), { ssr: false });
const DevPortal = dynamic(() => import('@/components/DevPortal'), { ssr: false });
const JamieInsightsLoginToast = dynamic(() => import('@/components/JamieInsightsLoginToast'), { ssr: false });
const JamiePulseOverlay = dynamic(() => import('@/components/JamiePulseOverlay'), { ssr: false });

export default function ClientWidgets() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

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
