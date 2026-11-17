'use client';

import { useState } from 'react';
import LeadCaptureForm from '@/components/LeadCaptureForm';
import TourRequestForm from './TourRequestForm';

const requestTypes = [
  { value: 'inquiry', label: 'Ask a question' },
  { value: 'showing', label: 'Request a showing' },
] as const;

export default function PropertySidebarForms({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const [kind, setKind] = useState<'inquiry' | 'showing'>('inquiry');
  const useTourCalendar = kind === 'showing' && /^[a-f0-9]{24}$/i.test(propertyId);

  return (
    <section aria-labelledby="listing-contact-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 id="listing-contact-heading" className="text-xl font-semibold !not-italic !normal-case text-slate-900">Request information</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Contact a Pulse agent about {propertyName}.</p>
      <div role="group" aria-label="Request type" className="mb-4 mt-4 grid grid-cols-2 gap-1 rounded-lg bg-[#eef4f5] p-1">
        {requestTypes.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
            className="min-h-10 rounded-md px-2 py-1.5 text-sm font-semibold text-slate-600 hover:text-[#245757] aria-pressed:bg-white aria-pressed:text-[#245757] aria-pressed:shadow-sm"
          >
            {label}
          </button>
        ))}
      </div>
      {useTourCalendar ? (
        <TourRequestForm propertyId={propertyId} propertyName={propertyName} />
      ) : (
        <LeadCaptureForm key={kind} propertyId={propertyId} propertyName={propertyName} kind={kind} />
      )}
    </section>
  );
}
