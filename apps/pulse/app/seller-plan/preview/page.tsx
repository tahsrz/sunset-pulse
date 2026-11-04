import React from 'react';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import GuidedJourneyPrototype from '@/components/lead-capture/journey/GuidedJourneyPrototype';

export const metadata:Metadata={title:'Home Journey Preview | Sunset Pulse',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default function GuidedJourneyPreviewPage() {
  if(process.env.NODE_ENV!=='development') notFound();
  return <GuidedJourneyPrototype/>;
}
