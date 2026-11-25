import React from 'react';
import type { LandDetails } from '@/lib/data/landDetails';

export default function PropertyLandDetails({ details }: { details?: LandDetails }) {
  if (!details || !Object.values(details).some((value) => Array.isArray(value) ? value.length : value !== undefined)) return null;
  return (
    <section aria-label="Land and development details" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 sm:p-6">
      <h2 className="text-xl font-semibold text-slate-900">Land and development details</h2>
      <dl className="space-y-3">
        {details.marketed_acres !== undefined && <div><dt className="font-semibold">Marketed acreage</dt><dd>{details.marketed_acres.toLocaleString('en-US', { maximumFractionDigits: 6 })} acres</dd></div>}
        {details.surveyed_acres !== undefined && <div><dt className="font-semibold">Surveyed acreage</dt><dd>{details.surveyed_acres.toLocaleString('en-US', { maximumFractionDigits: 6 })} acres</dd></div>}
        {details.zoning && <div><dt className="font-semibold">Zoning</dt><dd className="whitespace-pre-line break-words">{details.zoning}</dd></div>}
        {details.development_status && <div><dt className="font-semibold">Development status</dt><dd className="whitespace-pre-line break-words">{details.development_status}</dd></div>}
        {details.constraints && <div><dt className="font-semibold">Constraints and due diligence</dt><dd className="whitespace-pre-line break-words">{details.constraints}</dd></div>}
      </dl>
      {details.documents.length > 0 && <div className="space-y-2"><h3 className="font-semibold">Supporting documents</h3><ul className="space-y-2">{details.documents.map((document, index) => <li key={`${document.url}-${index}`}><a href={document.url} className="break-words font-semibold text-[#275e60] underline">{document.label}</a></li>)}</ul></div>}
    </section>
  );
}
