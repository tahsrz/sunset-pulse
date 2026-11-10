import React from 'react';
import { choiceQuestions, factLabels, type FactField } from '@/lib/marketing/guidedJourney';
import type { OwnerJourneyIntake } from '@/lib/sites/sellerJourneyIntakeContext';

const numberFormat = new Intl.NumberFormat('en-US');
const factFields = Object.keys(factLabels) as FactField[];

export function SellerIntakeSummary({ intake }: { intake: OwnerJourneyIntake }) {
  const { address, homeFacts, sellingWindow, sellingPreference } = intake;
  const locality = [address.city, address.region].filter(Boolean).join(', ');
  const timing = sellingWindow.state === 'answered'
    ? choiceQuestions['selling-window'].options.find((option) => option.value === sellingWindow.value)?.label
    : null;
  const priority = sellingPreference.state === 'answered'
    ? choiceQuestions['selling-preference'].options.find((option) => option.value === sellingPreference.value)?.label
    : null;

  return (
    <section aria-label="Seller Request Details" className="fieldbook-record rounded-xl border border-white/15 p-5">
      <h2 className="text-lg font-semibold italic">Seller Request Details</h2>
      <p className="mt-2 text-sm">{address.line1}</p>
      {locality || address.postalCode ? <p className="text-sm text-slate-300">{[locality, address.postalCode].filter(Boolean).join(' ')}</p> : null}
      <p className="mt-2 text-sm text-slate-400">The seller confirmed this address and provided the details below.</p>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        {factFields.map((field) => {
          const answer = homeFacts[field];
          const value = answer.state === 'answered'
            ? field === 'yearBuilt' ? String(answer.value) : numberFormat.format(answer.value)
            : 'Not Provided';
          return <div key={field}><dt className="text-slate-400">{factLabels[field]}</dt><dd>{value}</dd></div>;
        })}
        <div><dt className="text-slate-400">Selling Timeline</dt><dd>{timing ?? 'Not Provided'}</dd></div>
        <div><dt className="text-slate-400">First Priority</dt><dd>{priority ?? 'Not Provided'}</dd></div>
      </dl>
    </section>
  );
}
