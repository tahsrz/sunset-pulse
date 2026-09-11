'use client';

import { Check, Copy, Pencil, RefreshCw } from 'lucide-react';
import React from 'react';
import { useMemo, useState } from 'react';

export type ListingReviewFacts = {
  isListingLike: boolean;
  confidence: number;
  extractedFields: string[];
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  price?: string;
  beds?: string;
  baths?: string;
  sqft?: string;
  propertyType?: string;
  status?: string;
  mlsId?: string;
  daysOnMarket?: string;
  hoaFee?: string;
  yearBuilt?: string;
  lotSize?: string;
  parking?: string;
  brokerage?: string;
  remarks?: string;
  features: string[];
  hooks: string[];
  warnings: string[];
  missingFields: string[];
};

type ListingDraft = Record<string, string>;
const fields = [
  ['address', 'Address'], ['price', 'Price'], ['beds', 'Beds'], ['baths', 'Baths'], ['sqft', 'Square feet'],
  ['propertyType', 'Property type'], ['status', 'Status'], ['mlsId', 'MLS'], ['daysOnMarket', 'Days on market'],
  ['hoaFee', 'HOA'], ['yearBuilt', 'Year built'], ['lotSize', 'Lot size'], ['parking', 'Parking'], ['brokerage', 'Brokerage'],
] as const;

export function CommandListingReview({
  listingFacts,
  sourceCommand,
  running,
  onApplyAndRerun,
}: {
  listingFacts: ListingReviewFacts;
  sourceCommand: string;
  running: boolean;
  onApplyAndRerun?: (command: string) => void;
}) {
  const initialDraft = useMemo(() => createDraft(listingFacts), [listingFacts]);
  const [draft, setDraft] = useState<ListingDraft>(initialDraft);
  const [editing, setEditing] = useState(false);
  const [variant, setVariant] = useState<'mls' | 'social' | 'buyer'>('mls');
  const [copied, setCopied] = useState(false);
  const copyDrafts = useMemo(() => buildCopyDrafts(listingFacts, draft), [draft, listingFacts]);
  const facts = fields.map(([key, label]) => ({ label, value: draft[key] })).filter((item) => item.value);

  if (!listingFacts.isListingLike) return null;
  const apply = () => onApplyAndRerun?.(buildApprovedListingCommand(draft));
  const copy = async () => {
    await navigator.clipboard?.writeText(copyDrafts[variant]);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return <section data-testid="extracted-listing" className="border border-emerald-200/20 bg-emerald-300/10 p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">Extracted Listing</p><p className="mt-1 text-xs leading-5 text-emerald-50/80">Review parsed facts before rerunning copy or carrying them into a listing package.</p></div><div className="flex shrink-0 gap-2 text-[10px] font-black uppercase tracking-[0.12em]"><span className="border border-emerald-100/20 bg-emerald-950/30 px-2 py-1 text-emerald-100">{listingFacts.confidence}% confidence</span><span className="border border-emerald-100/20 bg-emerald-950/30 px-2 py-1 text-emerald-100">{listingFacts.extractedFields.length} fields</span></div></div>{editing ? <form data-testid="listing-review-form" onSubmit={(event) => { event.preventDefault(); apply(); }} className="mt-3"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([key, label]) => <label key={key} className="grid gap-1"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/70">{label}</span><input aria-label={`Approved ${label}`} value={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} className="h-10 min-w-0 border border-emerald-100/20 bg-[#091b1c] px-3 text-sm text-slate-100 outline-none focus:border-emerald-100/60 focus:ring-2 focus:ring-emerald-100/20" /></label>)}</div><div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => { setDraft(initialDraft); setEditing(false); }} className="inline-flex min-h-9 items-center justify-center border border-white/10 px-3 text-xs font-black uppercase tracking-[0.12em] text-slate-200">Cancel</button><button type="submit" disabled={running || !onApplyAndRerun} className="inline-flex min-h-9 items-center justify-center gap-2 border border-emerald-200/30 bg-emerald-300 px-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={13} />Apply facts and rerun</button></div></form> : <><dl className="mt-3 grid gap-px overflow-hidden border border-emerald-100/15 bg-emerald-100/15 sm:grid-cols-2 lg:grid-cols-3">{facts.map((fact) => <div key={fact.label} className="min-w-0 bg-[#091b1c] px-3 py-2"><dt className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/70">{fact.label}</dt><dd className="mt-1 break-words text-xs leading-5 text-slate-100">{fact.value}</dd></div>)}</dl><div className="mt-3 flex justify-end"><button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-9 items-center justify-center gap-2 border border-emerald-100/25 px-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-50"><Pencil size={13} />Edit facts</button></div></>}{listingFacts.hooks.length ? <div data-testid="listing-hooks" className="mt-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">Likely hooks</p><div className="mt-2 flex flex-wrap gap-2">{listingFacts.hooks.map((hook) => <span key={hook} className="border border-emerald-100/20 bg-emerald-950/30 px-2 py-1 text-xs leading-5 text-emerald-50">{hook}</span>)}</div></div> : null}<div data-testid="listing-copy-package" className="mt-3 border border-cyan-200/20 bg-cyan-300/10 p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">Listing Package</p><button type="button" onClick={() => void copy()} className="inline-flex min-h-8 shrink-0 items-center justify-center gap-2 border border-cyan-100/30 px-3 text-xs font-black uppercase tracking-[0.1em] text-cyan-50">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : `Copy ${variant}`}</button></div><div role="tablist" aria-label="Listing package drafts" className="mt-3 grid grid-cols-3 border border-cyan-100/20 bg-[#091b1c]">{(['mls', 'social', 'buyer'] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={variant === item} onClick={() => setVariant(item)} className={`min-h-9 border-r border-cyan-100/15 px-2 text-[10px] font-black uppercase tracking-[0.1em] last:border-r-0 ${variant === item ? 'bg-cyan-200 text-slate-950' : 'text-slate-300'}`}>{item}</button>)}</div><textarea aria-label={`${variant} listing draft`} value={copyDrafts[variant]} readOnly className="mt-3 min-h-28 w-full resize-y border border-cyan-100/20 bg-[#091b1c] px-3 py-2 text-sm leading-6 text-slate-100" /><p className="mt-2 text-[10px] leading-4 text-slate-500">Source command retained for this run: {sourceCommand ? 'yes' : 'no'}</p></div>{listingFacts.warnings.length || listingFacts.missingFields.length ? <div data-testid="listing-validation" className="mt-3 border border-amber-200/20 bg-amber-300/10 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">Validation before publish</p>{listingFacts.missingFields.length ? <p className="mt-1 text-xs leading-5 text-amber-50">Missing: {listingFacts.missingFields.join(', ')}</p> : null}{listingFacts.warnings.map((warning) => <p key={warning} className="mt-1 text-xs leading-5 text-amber-50">{warning}</p>)}</div> : null}</section>;
}

function createDraft(facts: ListingReviewFacts): ListingDraft {
  return Object.fromEntries(fields.map(([key]) => [key, key === 'address' ? facts.address || [facts.city, facts.state, facts.zip].filter(Boolean).join(', ') : facts[key] || '']));
}

function buildApprovedListingCommand(draft: ListingDraft) {
  const lines = fields.map(([key, label]) => draft[key]?.trim() ? `${label}: ${draft[key].trim()}` : '').filter(Boolean);
  return ['Create a review-ready listing summary and draft marketing copy from the approved facts below.', 'Treat these approved facts as authoritative. Do not add unsupported claims.', '', 'APPROVED_LISTING_FACTS:', ...lines].join('\n');
}

function buildCopyDrafts(facts: ListingReviewFacts, draft: ListingDraft) {
  const value = (key: keyof ListingDraft) => draft[key] || facts[key as keyof ListingReviewFacts] || '';
  const subject = value('address') || [facts.city, facts.state, facts.zip].filter(Boolean).join(', ') || value('propertyType') || 'This property';
  const specs = [value('price') && `listed at ${value('price')}`, value('beds') && `${value('beds')} beds`, value('baths') && `${value('baths')} baths`, value('sqft') && `${value('sqft')} sqft`].filter(Boolean).join(', ');
  const highlights = facts.features.slice(0, 4).join(', ');
  const verified = highlights ? `Verified highlights include ${highlights}.` : '';
  return { mls: [`${subject}${specs ? ` is ${specs}` : ''}.`, value('status') ? `Status: ${value('status')}.` : '', verified, facts.remarks || ''].filter(Boolean).join(' '), social: [`Property spotlight: ${subject}.`, specs ? `Verified details: ${specs}.` : '', verified, 'Reach out for current availability and a closer look.'].filter(Boolean).join(' '), buyer: [`Take a closer look at ${subject}.`, specs ? `The approved listing details include ${specs}.` : '', verified, 'Reply for current availability or to plan a showing.'].filter(Boolean).join(' ') };
}
