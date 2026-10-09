'use client';

import React, { useState } from 'react';
import type { PrivateCmaReview } from '@/lib/marketing/privateCmaReviewSchema';

type FactsDraft = {
  bedrooms: string;
  bathrooms: string;
  livingAreaSqFt: string;
  lotAreaSqFt: string;
  yearBuilt: string;
};

type ComparableDraft = {
  draftId: string;
  soldAt: string;
  salePriceUsd: string;
  facts: FactsDraft;
  sourceType: 'mls' | 'public-record' | 'seller-provided' | 'other';
  recordReference: string;
  usagePermission: 'internal-review-authorized' | 'restricted' | 'unknown';
  permissionEvidenceRef: string;
  adjustmentAmountUsd: string;
  adjustmentRationale: string;
};

type ReviewPayload = {
  expectedPriorReviewId: string | null;
  status: 'draft' | 'reviewed';
  subject: { regionLabel: string; facts: Record<keyof FactsDraft, number | null> };
  comparables: Array<Record<string, unknown>>;
  suggestedRangeUsd: { low: number; target: number; high: number };
  methodologyNote: string | null;
};

type ReviewResponse = {
  ok: boolean;
  actorUserId?: string;
  consentEvidenceRef?: string | null;
  reviews?: PrivateCmaReview[];
  review?: PrivateCmaReview;
  error?: string;
};

const emptyFacts: FactsDraft = { bedrooms: '', bathrooms: '', livingAreaSqFt: '', lotAreaSqFt: '', yearBuilt: '' };

function emptyComparable(): ComparableDraft {
  return {
    draftId: crypto.randomUUID(),
    soldAt: '',
    salePriceUsd: '',
    facts: { ...emptyFacts },
    sourceType: 'other',
    recordReference: '',
    usagePermission: 'unknown',
    permissionEvidenceRef: '',
    adjustmentAmountUsd: '',
    adjustmentRationale: '',
  };
}

function factsToPayload(facts: FactsDraft) {
  return Object.fromEntries(Object.entries(facts).map(([key, value]) => [key, value.trim() === '' ? null : Number(value)])) as Record<keyof FactsDraft, number | null>;
}

function comparableFromReview(review: PrivateCmaReview): ComparableDraft[] {
  return review.comparables.map((comparable) => ({
    draftId: comparable.comparableId,
    soldAt: comparable.soldAt,
    salePriceUsd: String(comparable.salePriceUsd),
    facts: Object.fromEntries(Object.entries(comparable.facts).map(([key, value]) => [key, value == null ? '' : String(value)])) as FactsDraft,
    sourceType: comparable.source.sourceType,
    recordReference: comparable.source.recordReference,
    usagePermission: comparable.source.usagePermission,
    permissionEvidenceRef: comparable.source.permissionEvidenceRef,
    adjustmentAmountUsd: comparable.adjustments.length ? String(comparable.adjustments.reduce((sum, adjustment) => sum + adjustment.amountUsd, 0)) : '',
    adjustmentRationale: comparable.adjustments.map((adjustment) => `${adjustment.category}: ${adjustment.rationale}`).join('\n'),
  }));
}

export default function CmaReviewPanel({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [actorUserId, setActorUserId] = useState('');
  const [consentEvidenceRef, setConsentEvidenceRef] = useState('');
  const [reviews, setReviews] = useState<PrivateCmaReview[]>([]);
  const [regionLabel, setRegionLabel] = useState('');
  const [subjectFacts, setSubjectFacts] = useState<FactsDraft>({ ...emptyFacts });
  const [comparables, setComparables] = useState<ComparableDraft[]>([emptyComparable()]);
  const [range, setRange] = useState({ low: '', target: '', high: '' });
  const [methodologyNote, setMethodologyNote] = useState('');
  const [feedback, setFeedback] = useState('');

  const endpoint = `/api/admin/agent-leads/${encodeURIComponent(leadId)}/cma-reviews`;

  async function loadReviews() {
    setOpen(true);
    setFeedback('');
    if (loaded) return;
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const result = await response.json() as ReviewResponse;
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'Private CMA reviews are unavailable.');
      setActorUserId(result.actorUserId || '');
      setConsentEvidenceRef(result.consentEvidenceRef || '');
      setReviews(result.reviews || []);
      const latest = result.reviews?.at(-1);
      if (latest) {
        setRegionLabel(latest.subject.regionLabel);
        setSubjectFacts(Object.fromEntries(Object.entries(latest.subject.facts).map(([key, value]) => [key, value == null ? '' : String(value)])) as FactsDraft);
        setComparables(comparableFromReview(latest));
        setRange({ low: String(latest.suggestedRangeUsd.low), target: String(latest.suggestedRangeUsd.target), high: String(latest.suggestedRangeUsd.high) });
        setMethodologyNote(latest.review.methodologyNote || '');
      }
      setLoaded(true);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Private CMA reviews are unavailable.');
    } finally {
      setLoading(false);
    }
  }

  function updateComparable(index: number, field: keyof ComparableDraft, value: string) {
    setComparables((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  function updateComparableFact(index: number, field: keyof FactsDraft, value: string) {
    setComparables((current) => current.map((item, itemIndex) => itemIndex === index
      ? { ...item, facts: { ...item.facts, [field]: value } }
      : item));
  }

  function buildPayload(status: 'draft' | 'reviewed'): ReviewPayload {
    return {
      expectedPriorReviewId: reviews.at(-1)?.reviewId || null,
      status,
      subject: { regionLabel, facts: factsToPayload(subjectFacts) },
      comparables: comparables.map((comparable) => {
        const amount = comparable.adjustmentAmountUsd.trim() === '' ? 0 : Number(comparable.adjustmentAmountUsd);
        const adjustments = comparable.adjustmentAmountUsd.trim() === '' ? [] : [{
          category: 'other',
          amountUsd: amount,
          rationale: comparable.adjustmentRationale,
        }];
        return {
          comparableId: crypto.randomUUID(),
          soldAt: comparable.soldAt,
          salePriceUsd: Number(comparable.salePriceUsd),
          facts: factsToPayload(comparable.facts),
          source: {
            sourceType: comparable.sourceType,
            recordReference: comparable.recordReference,
            retrievedAt: new Date().toISOString(),
            usagePermission: comparable.usagePermission,
            permissionEvidenceRef: comparable.permissionEvidenceRef,
          },
          adjustments,
          adjustedPriceUsd: Number(comparable.salePriceUsd) + amount,
        };
      }),
      suggestedRangeUsd: { low: Number(range.low), target: Number(range.target), high: Number(range.high) },
      methodologyNote: status === 'reviewed' ? methodologyNote : null,
    };
  }

  async function saveReview(status: 'draft' | 'reviewed') {
    if (status === 'reviewed' && !window.confirm('Mark this exact private CMA revision as human-reviewed? It will remain private and cannot be edited.')) return;
    setSaving(true);
    setFeedback('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(buildPayload(status)),
      });
      const result = await response.json() as ReviewResponse;
      if (!response.ok || result.ok !== true || !result.review) throw new Error(result.error || 'The private CMA review could not be saved.');
      setReviews((current) => [...current, result.review!]);
      setFeedback(`${status === 'reviewed' ? 'Reviewed' : 'Draft'} revision ${result.review.revision} saved privately.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The private CMA review could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  const addComparable = () => setComparables((current) => current.length >= 12 ? current : [...current, emptyComparable()]);
  const removeComparable = (index: number) => setComparables((current) => current.length <= 1 ? current : current.filter((_, itemIndex) => itemIndex !== index));

  return (
    <section className="mt-4 rounded-xl border border-cyan-200/15 bg-slate-900/70 p-4" aria-labelledby={`cma-review-${leadId}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 id={`cma-review-${leadId}`} className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">Private CMA review</h4>
          <p className="mt-1 text-xs text-slate-400">Human-entered evidence only. No automatic pricing, external lookup, or publication.</p>
        </div>
        <button type="button" onClick={open ? () => setOpen(false) : loadReviews} aria-expanded={open} className="rounded-lg border border-cyan-200/20 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-200/10">
          {open ? 'Hide review' : 'Open review workspace'}
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
          {loading ? <p role="status" className="text-sm text-slate-300">Loading private reviews…</p> : null}
          {!loading && loaded ? (
            <>
              {reviews.length ? (
                <ol className="space-y-2" aria-label="Saved private CMA revisions">
                  {reviews.map((review) => (
                    <li key={review.reviewId} className="rounded-lg border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
                      <p className="font-bold text-white">Revision {review.revision} · {review.status === 'reviewed' ? 'Human reviewed' : 'Draft'} · Private only</p>
                      <p className="mt-1">{review.subject.regionLabel} · {review.comparables.length} human-entered comparable{review.comparables.length === 1 ? '' : 's'} · expires {new Date(review.expiresAt).toLocaleDateString()}</p>
                      {review.supersedesReviewId ? <p className="mt-1 break-all text-[10px] text-slate-500">Supersedes {review.supersedesReviewId}</p> : null}
                    </li>
                  ))}
                </ol>
              ) : <p className="text-xs text-slate-400">No private review revisions yet.</p>}

              <p className="text-xs text-slate-400">{reviews.length ? 'Saving creates a new immutable revision linked to the latest one.' : 'Start with a draft. Unknown or restricted source permission cannot be marked reviewed.'}</p>
              <form onSubmit={(event) => { event.preventDefault(); void saveReview('draft'); }} className="space-y-4">
                <fieldset className="grid gap-3 rounded-lg border border-white/10 p-3 sm:grid-cols-2">
                  <legend className="px-1 text-xs font-bold text-slate-200">Subject facts (optional when unknown)</legend>
                  <label className="text-xs text-slate-300">Area / scope label
                    <input required minLength={2} maxLength={120} value={regionLabel} onChange={(event) => setRegionLabel(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
                  </label>
                  {(['bedrooms', 'bathrooms', 'livingAreaSqFt', 'lotAreaSqFt', 'yearBuilt'] as const).map((field) => (
                    <label key={field} className="text-xs capitalize text-slate-300">{field.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}
                      <input type="number" min={field === 'yearBuilt' ? 1600 : field.endsWith('SqFt') ? 1 : 0} max={field === 'yearBuilt' ? 2200 : field === 'bedrooms' ? 30 : field === 'bathrooms' ? 40 : undefined} value={subjectFacts[field]} onChange={(event) => setSubjectFacts((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
                    </label>
                  ))}
                </fieldset>

                {comparables.map((comparable, index) => (
                  <fieldset key={comparable.draftId} className="grid gap-3 rounded-lg border border-white/10 p-3 sm:grid-cols-2">
                    <legend className="px-1 text-xs font-bold text-slate-200">Human-selected comparable {index + 1}</legend>
                    <label className="text-xs text-slate-300">Sale date
                      <input required type="date" value={comparable.soldAt} onChange={(event) => updateComparable(index, 'soldAt', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
                    </label>
                    <label className="text-xs text-slate-300">Recorded sale price (USD)
                      <input required type="number" min={1} step={1} value={comparable.salePriceUsd} onChange={(event) => updateComparable(index, 'salePriceUsd', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
                    </label>
                    {(['bedrooms', 'bathrooms', 'livingAreaSqFt', 'lotAreaSqFt', 'yearBuilt'] as const).map((field) => (
                      <label key={field} className="text-xs capitalize text-slate-300">Comparable {field.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}
                        <input type="number" min={field === 'yearBuilt' ? 1600 : field.endsWith('SqFt') ? 1 : 0} max={field === 'yearBuilt' ? 2200 : field === 'bedrooms' ? 30 : field === 'bathrooms' ? 40 : undefined} value={comparable.facts[field]} onChange={(event) => updateComparableFact(index, field, event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
                      </label>
                    ))}
                    <label className="text-xs text-slate-300">Source type
                      <select value={comparable.sourceType} onChange={(event) => updateComparable(index, 'sourceType', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white">
                        <option value="mls">MLS</option><option value="public-record">Public record</option><option value="seller-provided">Seller provided</option><option value="other">Other</option>
                      </select>
                    </label>
                    <label className="text-xs text-slate-300">Source record reference
                      <input required minLength={3} maxLength={120} value={comparable.recordReference} onChange={(event) => updateComparable(index, 'recordReference', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
                    </label>
                    <label className="text-xs text-slate-300">Use permission
                      <select value={comparable.usagePermission} onChange={(event) => updateComparable(index, 'usagePermission', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white">
                        <option value="unknown">Unknown — draft only</option><option value="restricted">Restricted — draft only</option><option value="internal-review-authorized">Authorized for private review</option>
                      </select>
                    </label>
                    <label className="text-xs text-slate-300">Permission evidence reference
                      <input required minLength={8} maxLength={160} value={comparable.permissionEvidenceRef} onChange={(event) => updateComparable(index, 'permissionEvidenceRef', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
                    </label>
                    <label className="text-xs text-slate-300">Net adjustment (USD; optional)
                      <input type="number" step={1} value={comparable.adjustmentAmountUsd} onChange={(event) => updateComparable(index, 'adjustmentAmountUsd', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
                    </label>
                    <label className="text-xs text-slate-300 sm:col-span-2">Adjustment rationale (required when an adjustment is entered)
                      <textarea maxLength={400} value={comparable.adjustmentRationale} onChange={(event) => updateComparable(index, 'adjustmentRationale', event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-sm text-white" />
                    </label>
                    {comparables.length > 1 ? <button type="button" onClick={() => removeComparable(index)} className="justify-self-start text-xs font-bold text-rose-200">Remove comparable</button> : null}
                  </fieldset>
                ))}
                <button type="button" disabled={comparables.length >= 12} onClick={addComparable} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-50">Add another comparable</button>

                <fieldset className="grid gap-3 rounded-lg border border-white/10 p-3 sm:grid-cols-3">
                  <legend className="px-1 text-xs font-bold text-slate-200">Human-entered suggested range (USD)</legend>
                  {(['low', 'target', 'high'] as const).map((field) => (
                    <label key={field} className="text-xs capitalize text-slate-300">{field}
                      <input required type="number" min={1} step={1} value={range[field]} onChange={(event) => setRange((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white" />
                    </label>
                  ))}
                </fieldset>

                <label className="block text-xs text-slate-300">Human methodology note (required to mark reviewed)
                  <textarea maxLength={800} minLength={20} value={methodologyNote} onChange={(event) => setMethodologyNote(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-sm text-white" />
                </label>
                {consentEvidenceRef ? <p className="break-all text-[10px] text-slate-500">Seller consent evidence: {consentEvidenceRef}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={saving || !actorUserId} className="rounded-lg border border-cyan-200/25 px-4 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50">{saving ? 'Saving…' : 'Save private draft'}</button>
                  <button type="button" disabled={saving || !actorUserId || !methodologyNote.trim()} onClick={(event) => { event.preventDefault(); if (event.currentTarget.form?.reportValidity()) void saveReview('reviewed'); }} className="rounded-lg bg-cyan-200 px-4 py-2 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">Mark human-reviewed</button>
                </div>
              </form>
              <p role="status" aria-live="polite" className="text-xs text-cyan-100">{feedback}</p>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
