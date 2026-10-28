import React, { Suspense } from 'react';
import { PublicConsultationRequest } from '@/components/scheduling/PublicConsultationRequest';

export default function SchedulePage() {
  return <Suspense fallback={<p role="status" className="p-8">Opening consultation request…</p>}><PublicConsultationRequest /></Suspense>;
}
