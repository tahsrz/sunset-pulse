'use client';

import React, { useState } from 'react';

import Link from 'next/link';

import { Check, Copy, Pencil, RefreshCw } from 'lucide-react';

import { createListingReviewDraft, buildApprovedListingCommand, buildListingCopyDrafts, listingReviewFields, listingCopyVariants, type ListingFactsTrace, type ListingReviewDraft, type ListingReviewFieldKey, type ListingCopyVariant, type ListingCopyDrafts, type SavedListingIntake, type CanonicalListingComparison } from '@/lib/command-center/listingReviewHelpers';

export type { ListingReviewFacts } from '@/lib/command-center/listingReviewHelpers';

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function ListingReviewPanel({
  listingFacts,
  sourceCommand,
  onApplyAndRerun,
  running,
}: {
  listingFacts: ListingFactsTrace;
  sourceCommand: string;
  onApplyAndRerun: (draft: ListingReviewDraft) => void;
  running: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => createListingReviewDraft(listingFacts));
  const listingFactRows = [
    { label: 'Address', value: draft.address },
    { label: 'Price', value: draft.price },
    {
      label: 'Specs',
      value: [
        draft.beds ? `${draft.beds} beds` : '',
        draft.baths ? `${draft.baths} baths` : '',
        draft.sqft ? `${draft.sqft} sqft` : '',
      ].filter(Boolean).join(' | '),
    },
    { label: 'Status', value: draft.status },
    { label: 'Type', value: draft.propertyType },
    { label: 'MLS', value: draft.mlsId },
    { label: 'Days on market', value: draft.daysOnMarket },
    { label: 'HOA', value: draft.hoaFee },
    { label: 'Year built', value: draft.yearBuilt },
    { label: 'Lot', value: draft.lotSize },
    { label: 'Parking', value: draft.parking },
    { label: 'Brokerage', value: draft.brokerage },
  ].filter((fact) => Boolean(fact.value));

  return (
    <div data-testid="extracted-listing" className="border border-emerald-200/20 bg-emerald-300/10 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">Extracted Listing</p>
          <p className="mt-1 text-xs leading-5 text-emerald-50/80">Review parsed facts before publishing or sending copy.</p>
        </div>
        <div className="flex shrink-0 gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
          <span className="border border-emerald-100/20 bg-emerald-950/30 px-2 py-1 text-emerald-100">{listingFacts.confidence}% confidence</span>
          <span className="border border-emerald-100/20 bg-emerald-950/30 px-2 py-1 text-emerald-100">{listingFacts.extractedFields.length} fields</span>
        </div>
      </div>

      {editing ? (
        <form
          data-testid="listing-review-form"
          onSubmit={(event) => {
            event.preventDefault();
            onApplyAndRerun(draft);
          }}
          className="mt-3"
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {listingReviewFields.map((field) => (
              <label key={field.key} className={field.multiline ? 'grid gap-1 lg:col-span-3' : 'grid gap-1'}>
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/70">{field.label}</span>
                {field.multiline ? (
                  <textarea
                    aria-label={`Approved ${field.label}`}
                    value={draft[field.key]}
                    onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="min-h-20 w-full resize-y border border-emerald-100/20 bg-[#091b1c] px-3 py-2 text-sm leading-5 text-slate-100 outline-none focus:border-emerald-100/60 focus:ring-2 focus:ring-emerald-100/20"
                  />
                ) : (
                  <input
                    aria-label={`Approved ${field.label}`}
                    value={draft[field.key]}
                    onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="h-10 min-w-0 border border-emerald-100/20 bg-[#091b1c] px-3 text-sm text-slate-100 outline-none focus:border-emerald-100/60 focus:ring-2 focus:ring-emerald-100/20"
                  />
                )}
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(createListingReviewDraft(listingFacts));
                setEditing(false);
              }}
              className="inline-flex min-h-9 items-center justify-center border border-white/10 px-3 text-xs font-black uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={running}
              className="inline-flex min-h-9 items-center justify-center gap-2 border border-emerald-200/30 bg-emerald-300 px-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-70"
            >
              <RefreshCw size={13} />
              Apply facts and rerun
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="mt-3 grid gap-px overflow-hidden border border-emerald-100/15 bg-emerald-100/15 sm:grid-cols-2 lg:grid-cols-3">
            {listingFactRows.map((fact) => (
              <div key={fact.label} className="min-w-0 bg-[#091b1c] px-3 py-2">
                <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/70">{fact.label}</dt>
                <dd className="mt-1 break-words text-xs leading-5 text-slate-100">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex min-h-9 items-center justify-center gap-2 border border-emerald-100/25 px-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-50 transition hover:bg-emerald-100 hover:text-slate-950"
            >
              <Pencil size={13} />
              Edit facts
            </button>
          </div>
        </>
      )}

      {listingFacts.hooks.length ? (
        <div data-testid="listing-hooks" className="mt-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">Likely hooks</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {listingFacts.hooks.map((hook) => (
              <span key={hook} className="border border-emerald-100/20 bg-emerald-950/30 px-2 py-1 text-xs leading-5 text-emerald-50">{hook}</span>
            ))}
          </div>
        </div>
      ) : null}

      <ListingCopyPackage listingFacts={listingFacts} sourceCommand={sourceCommand} />

      {listingFacts.warnings.length || listingFacts.missingFields.length ? (
        <div data-testid="listing-validation" className="mt-3 border border-amber-200/20 bg-amber-300/10 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">Validation before publish</p>
          {listingFacts.missingFields.length ? <p className="mt-1 text-xs leading-5 text-amber-50">Missing: {listingFacts.missingFields.join(', ')}</p> : null}
          {listingFacts.warnings.map((warning) => <p key={warning} className="mt-1 text-xs leading-5 text-amber-50">{warning}</p>)}
        </div>
      ) : null}
    </div>
  );
}

function ListingCopyPackage({ listingFacts, sourceCommand }: { listingFacts: ListingFactsTrace; sourceCommand: string }) {
  const [activeVariant, setActiveVariant] = useState<ListingCopyVariant>('mls');
  const [drafts, setDrafts] = useState<ListingCopyDrafts>(() => buildListingCopyDrafts(listingFacts));
  const [copiedVariant, setCopiedVariant] = useState<ListingCopyVariant | null>(null);
  const [savedIntake, setSavedIntake] = useState<SavedListingIntake | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const activeConfig = listingCopyVariants.find((variant) => variant.id === activeVariant) || listingCopyVariants[0];
  const publishBlockers = [
    ...listingFacts.missingFields.map((field) => `Missing ${field}`),
    ...listingFacts.warnings,
  ];

  const copyDraft = async () => {
    await navigator.clipboard.writeText(drafts[activeVariant]);
    setCopiedVariant(activeVariant);
    window.setTimeout(() => setCopiedVariant(null), 1600);
  };

  const saveIntake = async (publishStatus: 'review' | 'ready') => {
    setSaving(true);
    setSaveError('');
    const snapshot = {
      sourceCommand: sourceCommand || buildApprovedListingCommand(createListingReviewDraft(listingFacts)),
      approvedFacts: listingFacts,
      drafts,
      publishStatus,
      warnings: listingFacts.warnings,
      missingFields: listingFacts.missingFields,
    };

    try {
      const response = await fetch(savedIntake
        ? `/api/command-center/listing-intakes/${savedIntake.intakeId}`
        : '/api/command-center/listing-intakes', {
        method: savedIntake ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedIntake ? { ...snapshot, expectedVersion: savedIntake.version } : snapshot),
      });
      const body = await safeJson(response);
      if (!response.ok) throw new Error(body?.message || 'Unable to save listing intake.');
      const intake = body?.data?.intake as SavedListingIntake | undefined;
      if (!intake?.intakeId) throw new Error('Listing intake save returned no id.');
      setSavedIntake(intake);
      const url = new URL(window.location.href);
      url.searchParams.set('intake', intake.intakeId);
      window.history.replaceState({}, '', url);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save listing intake.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section data-testid="listing-copy-package" className="mt-3 border border-cyan-200/20 bg-cyan-300/10 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">Listing Package</p>
        <button
          type="button"
          onClick={copyDraft}
          className="inline-flex min-h-8 shrink-0 items-center justify-center gap-2 border border-cyan-100/30 px-3 text-xs font-black uppercase tracking-[0.1em] text-cyan-50 transition hover:bg-cyan-100 hover:text-slate-950"
        >
          {copiedVariant === activeVariant ? <Check size={13} /> : <Copy size={13} />}
          {copiedVariant === activeVariant ? 'Copied' : `Copy ${activeConfig.label}`}
        </button>
      </div>
      <div role="tablist" aria-label="Listing package drafts" className="mt-3 grid grid-cols-3 border border-cyan-100/20 bg-[#091b1c]">
        {listingCopyVariants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            role="tab"
            aria-selected={activeVariant === variant.id}
            aria-controls={`listing-copy-${variant.id}`}
            onClick={() => setActiveVariant(variant.id)}
            className={`min-h-9 border-r border-cyan-100/15 px-2 text-[10px] font-black uppercase tracking-[0.1em] transition last:border-r-0 ${
              activeVariant === variant.id
                ? 'bg-cyan-200 text-slate-950'
                : 'text-slate-300 hover:bg-cyan-200/10 hover:text-white'
            }`}
          >
            {variant.label}
          </button>
        ))}
      </div>
      <textarea
        id={`listing-copy-${activeVariant}`}
        aria-label={activeConfig.ariaLabel}
        value={drafts[activeVariant]}
        onChange={(event) => setDrafts((current) => ({ ...current, [activeVariant]: event.target.value }))}
        className="mt-3 min-h-32 w-full resize-y border border-cyan-100/20 bg-[#091b1c] px-3 py-2 text-sm leading-6 text-slate-100 outline-none focus:border-cyan-100/60 focus:ring-2 focus:ring-cyan-100/20"
      />
      <div className="mt-3 flex flex-col gap-2 border-t border-cyan-100/15 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-xs leading-5 text-cyan-50/80">
          {savedIntake ? (
            <Link href={`/command-center?intake=${savedIntake.intakeId}`} className="font-bold text-cyan-100 underline decoration-cyan-100/40 underline-offset-2">
              Saved intake v{savedIntake.version} / {savedIntake.publishStatus}
            </Link>
          ) : (
            <span>{publishBlockers.length ? `${publishBlockers.length} validation item${publishBlockers.length === 1 ? '' : 's'} remain` : 'Ready for review'}</span>
          )}
          {saveError ? <p className="mt-1 text-rose-100">{saveError}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveIntake('review')}
            className="inline-flex min-h-9 items-center justify-center border border-cyan-100/30 px-3 text-xs font-black uppercase tracking-[0.1em] text-cyan-50 transition hover:bg-cyan-100 hover:text-slate-950 disabled:cursor-wait disabled:opacity-70"
          >
            {saving ? 'Saving' : savedIntake ? 'Update Intake' : 'Save Intake'}
          </button>
          <button
            type="button"
            disabled={saving || publishBlockers.length > 0}
            onClick={() => void saveIntake('ready')}
            className="inline-flex min-h-9 items-center justify-center border border-emerald-100/30 px-3 text-xs font-black uppercase tracking-[0.1em] text-emerald-50 transition hover:bg-emerald-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Mark Ready
          </button>
        </div>
      </div>
      {savedIntake ? (
        <CanonicalListingHandoff
          listingFacts={listingFacts}
          savedIntake={savedIntake}
          onIntakeChanged={setSavedIntake}
        />
      ) : null}
    </section>
  );
}

function CanonicalListingHandoff({
  listingFacts,
  savedIntake,
  onIntakeChanged,
}: {
  listingFacts: ListingFactsTrace;
  savedIntake: SavedListingIntake;
  onIntakeChanged: (intake: SavedListingIntake) => void;
}) {
  const [propertyReference, setPropertyReference] = useState(listingFacts.mlsId || '');
  const [comparison, setComparison] = useState<CanonicalListingComparison | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const compare = async () => {
    const reference = propertyReference.trim();
    if (!reference) {
      setError('Enter the canonical listing ID or MLS number to compare it.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/command-center/listing-intakes/${savedIntake.intakeId}/property-link?property=${encodeURIComponent(reference)}`);
      const body = await safeJson(response);
      if (!response.ok) throw new Error(body?.message || 'Unable to compare the canonical listing.');
      const nextComparison = body?.data?.comparison as CanonicalListingComparison | undefined;
      if (!nextComparison?.property?.id) throw new Error('The comparison returned no canonical listing.');
      setComparison(nextComparison);
      setSelectedFields(nextComparison.differences.filter((difference) => difference.differs).map((difference) => difference.field));
    } catch (caught) {
      setComparison(null);
      setSelectedFields([]);
      setError(caught instanceof Error ? caught.message : 'Unable to compare the canonical listing.');
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (field: string) => {
    setSelectedFields((current) => current.includes(field)
      ? current.filter((value) => value !== field)
      : [...current, field]);
  };

  const applySelectedFields = async () => {
    if (!comparison || !selectedFields.length) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/command-center/listing-intakes/${savedIntake.intakeId}/property-link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: comparison.property.id,
          expectedPropertyLastUpdated: comparison.property.lastUpdated,
          expectedIntakeVersion: savedIntake.version,
          fields: selectedFields,
        }),
      });
      const body = await safeJson(response);
      if (!response.ok) throw new Error(body?.message || 'Unable to apply the selected fields.');
      const intake = body?.data?.intake as SavedListingIntake | undefined;
      if (!intake?.intakeId) throw new Error('The canonical update completed without a refreshed intake.');
      onIntakeChanged(intake);
      setComparison(null);
      setSelectedFields([]);
      setNotice('Selected fields applied to the canonical listing and recorded in the intake audit.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to apply the selected fields.');
    } finally {
      setLoading(false);
    }
  };

  const changedFields = comparison?.differences.filter((difference) => difference.differs) || [];

  return (
    <section data-testid="canonical-listing-handoff" className="mt-3 border-t border-cyan-100/15 pt-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">Canonical Listing Handoff</p>
        <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${savedIntake.publishStatus === 'ready' ? 'text-emerald-100' : 'text-amber-100'}`}>
          {savedIntake.publishStatus === 'ready' ? 'Ready to apply' : 'Mark intake ready to apply'}
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          aria-label="Canonical listing ID or MLS number"
          value={propertyReference}
          onChange={(event) => setPropertyReference(event.target.value)}
          placeholder="Canonical listing ID or MLS number"
          className="min-h-9 min-w-0 flex-1 border border-cyan-100/20 bg-[#091b1c] px-3 text-sm text-slate-100 outline-none focus:border-cyan-100/60 focus:ring-2 focus:ring-cyan-100/20"
        />
        <button
          type="button"
          onClick={() => void compare()}
          disabled={loading}
          className="inline-flex min-h-9 shrink-0 items-center justify-center border border-cyan-100/30 px-3 text-xs font-black uppercase tracking-[0.1em] text-cyan-50 transition hover:bg-cyan-100 hover:text-slate-950 disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? 'Working' : 'Compare'}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs leading-5 text-rose-100">{error}</p> : null}
      {notice ? <p className="mt-2 text-xs leading-5 text-emerald-100">{notice}</p> : null}
      {comparison ? (
        <div className="mt-3 border border-cyan-100/20 bg-[#091b1c]">
          <div className="border-b border-cyan-100/15 px-3 py-2 text-xs text-cyan-50/80">
            {comparison.property.name || 'Canonical listing'}{comparison.property.mlsId ? ` / MLS ${comparison.property.mlsId}` : ''}
          </div>
          {changedFields.length ? (
            <div className="divide-y divide-cyan-100/10">
              {changedFields.map((difference) => (
                <label key={difference.field} className="grid cursor-pointer gap-2 px-3 py-2 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
                  <input
                    type="checkbox"
                    aria-label={`Apply ${difference.label}`}
                    checked={selectedFields.includes(difference.field)}
                    onChange={() => toggleField(difference.field)}
                    className="mt-1 h-4 w-4 accent-cyan-200"
                  />
                  <span className="min-w-0 text-xs leading-5 text-cyan-50">
                    <span className="block font-black uppercase tracking-[0.08em] text-cyan-100">{difference.label}</span>
                    <span className="block break-words text-slate-300">Intake: {difference.intakeValue || 'Not supplied'}</span>
                  </span>
                  <span className="min-w-0 break-words text-xs leading-5 text-slate-400">Canonical: {difference.canonicalValue || 'Not supplied'}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="px-3 py-3 text-xs leading-5 text-emerald-100">The approved intake already matches the supported canonical fields.</p>
          )}
          {changedFields.length ? (
            <div className="flex flex-col gap-2 border-t border-cyan-100/15 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-cyan-50/70">Only checked differences are applied. The canonical row is rechecked before the update.</p>
              <button
                type="button"
                disabled={loading || savedIntake.publishStatus !== 'ready' || !selectedFields.length}
                onClick={() => void applySelectedFields()}
                className="inline-flex min-h-9 shrink-0 items-center justify-center border border-emerald-100/30 px-3 text-xs font-black uppercase tracking-[0.1em] text-emerald-50 transition hover:bg-emerald-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Apply Selected ({selectedFields.length})
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function CommandListingReview({ onApplyAndRerun, ...props }: { listingFacts: ListingFactsTrace; sourceCommand: string; running: boolean; onApplyAndRerun?: (command: string) => void }) {
  if (!props.listingFacts.isListingLike) return null;
  return <ListingReviewPanel {...props} running={props.running || !onApplyAndRerun} onApplyAndRerun={(draft) => onApplyAndRerun?.(buildApprovedListingCommand(draft))} />;
}
