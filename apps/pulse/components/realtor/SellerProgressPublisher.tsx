'use client';

import React, { useEffect, useState } from 'react';
import { sellerMilestoneLabels, sellerPublicationSchema, type SellerCaseResult } from '@/lib/realtor-workspace/sellerServiceContract';
import { SellerActionDrawer } from './SellerActionDrawer';

type Publication = SellerCaseResult['case'] extends infer Case
  ? Case extends { publication: infer Value } ? NonNullable<Value> : never
  : never;
type SavedCase = NonNullable<SellerCaseResult['case']>;
const inputClass = 'mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-sm';
const buttonClass = 'rounded-lg border border-cyan-300/30 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-50';
const emptyPublication: Publication = { summary: '', milestones: [], checklist: [], documents: [] };

export function SellerProgressPublisher({
  savedPublication,
  availableMilestones,
  checklist,
  documents,
  disabled,
  busy,
  saveBlocked,
  error,
  onClearError,
  onPublish,
}: {
  savedPublication: Publication | null;
  availableMilestones: SellerCaseResult['milestones'];
  checklist: SavedCase['checklist'];
  documents: SavedCase['documents'];
  disabled: boolean;
  busy: boolean;
  saveBlocked: boolean;
  error: string;
  onClearError: () => void;
  onPublish: (publication: Publication) => Promise<boolean>;
}) {
  const baseline = savedPublication || emptyPublication;
  const baselineKey = JSON.stringify(baseline);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Publication>(baseline);
  const [reviewing, setReviewing] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const dirty = JSON.stringify(draft) !== baselineKey;

  useEffect(() => {
    if (!open) {
      setDraft(baseline);
      setReviewing(false);
      setReviewed(false);
    }
  }, [open, baseline, baselineKey]);

  const close = () => {
    setOpen(false);
    setReviewing(false);
    setReviewed(false);
    onClearError();
  };
  const update = (next: Publication) => {
    setDraft(next);
    setReviewing(false);
    setReviewed(false);
    onClearError();
  };
  const publish = async () => {
    if (!reviewing || !reviewed) return false;
    const parsed = sellerPublicationSchema.safeParse(draft);
    if (!parsed.success) return false;
    const saved = await onPublish(parsed.data);
    if (saved) close();
    return saved;
  };
  const requestSaveFromClose = async () => {
    if (!reviewing) {
      setReviewing(true);
      setReviewed(false);
    }
    return false;
  };

  return <>
    <p className="text-xs text-slate-400">Only selected saved fields and the summary are shared. Private notes and conversations stay private. Review each document link before publishing. Changes require another review.</p>
    {savedPublication ? <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-100">Current client update</p><p className="mt-2 whitespace-pre-wrap text-sm">{savedPublication.summary || 'No summary added.'}</p><p className="mt-2 text-xs text-slate-400">{savedPublication.milestones.length} milestones · {savedPublication.checklist.length} checklist items · {savedPublication.documents.length} documents</p></div> : <p className="mt-3 text-sm text-slate-400">No client update has been published yet.</p>}
    <button type="button" className={`${buttonClass} mt-3`} disabled={disabled} onClick={() => { setOpen(true); onClearError(); }}>Review client update</button>
    {open ? <SellerActionDrawer titleId="seller-progress-title" title="Review client update" description="Choose the saved details a seller can see, then review the exact preview before publishing." unsavedDescription="These client update changes have not been published." dirty={dirty} busy={busy} saveBlocked={saveBlocked} error={error} onClose={close} onSave={requestSaveFromClose} onDiscard={() => { setDraft(baseline); setReviewing(false); setReviewed(false); }}>
      <div className="mt-5 space-y-4">
        {!reviewing ? <>
          <label className="block text-sm">Client summary<textarea maxLength={2000} rows={4} className={inputClass} value={draft.summary} disabled={disabled} onChange={(event) => update({ ...draft, summary: event.target.value })} /></label>
          <fieldset disabled={disabled} className="space-y-2"><legend className="text-sm font-semibold">Milestones to share</legend>{availableMilestones.map((milestone) => <label key={milestone} className="flex gap-2 text-sm"><input type="checkbox" checked={draft.milestones.includes(milestone)} onChange={(event) => update({ ...draft, milestones: event.target.checked ? [...draft.milestones, milestone] : draft.milestones.filter((row) => row !== milestone) })} />{sellerMilestoneLabels[milestone]}</label>)}{availableMilestones.length === 0 ? <p className="text-xs text-slate-400">No saved milestones to include.</p> : null}</fieldset>
          <fieldset disabled={disabled} className="space-y-2"><legend className="text-sm font-semibold">Checklist items to share</legend>{checklist.map((item) => <label key={item.id} className="flex gap-2 text-sm"><input type="checkbox" checked={draft.checklist.some((row) => row.id === item.id)} onChange={(event) => update({ ...draft, checklist: event.target.checked ? [...draft.checklist, item] : draft.checklist.filter((row) => row.id !== item.id) })} />{item.done ? '✓ ' : ''}{item.title}</label>)}{checklist.length === 0 ? <p className="text-xs text-slate-400">No saved checklist items to include.</p> : null}</fieldset>
          <fieldset disabled={disabled} className="space-y-2"><legend className="text-sm font-semibold">Documents to share</legend>{documents.map((document) => <label key={document.url} className="flex gap-2 text-sm"><input type="checkbox" checked={draft.documents.some((row) => row.url === document.url && row.label === document.label)} onChange={(event) => update({ ...draft, documents: event.target.checked ? [...draft.documents, document] : draft.documents.filter((row) => row.url !== document.url) })} /><span>{document.label}<span className="block break-all text-xs text-slate-400">{document.url}</span></span></label>)}{documents.length === 0 ? <p className="text-xs text-slate-400">No saved documents to include.</p> : null}</fieldset>
          <button type="button" className={buttonClass} disabled={disabled} onClick={() => { setReviewing(true); setReviewed(false); }}>Preview exact update</button>
        </> : <section aria-label="Client update preview" className="space-y-4 rounded-xl border border-cyan-200/20 bg-cyan-100/5 p-4">
          <h3 className="font-semibold">This is what the seller will see</h3>
          <p className="whitespace-pre-wrap text-sm">{draft.summary || 'No summary added.'}</p>
          {draft.milestones.length ? <div><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Milestones</h4><ul className="mt-1 list-inside list-disc text-sm">{draft.milestones.map((milestone) => <li key={milestone}>{sellerMilestoneLabels[milestone]}</li>)}</ul></div> : null}
          {draft.checklist.length ? <div><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preparation</h4><ul className="mt-1 list-inside list-disc text-sm">{draft.checklist.map((item) => <li key={item.id}>{item.done ? '✓ ' : ''}{item.title}</li>)}</ul></div> : null}
          {draft.documents.length ? <div><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Documents</h4><ul className="mt-1 space-y-1 text-sm">{draft.documents.map((document) => <li key={document.url}><a className="break-all text-cyan-200 underline" href={document.url} target="_blank" rel="noopener noreferrer">{document.label}</a></li>)}</ul></div> : null}
          <p className="text-xs text-slate-300">Private notes and conversations are not included. Document access depends on each link’s permissions.</p>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={reviewed} disabled={disabled} onChange={(event) => { setReviewed(event.target.checked); onClearError(); }} />I reviewed this exact client update and its document links.</label>
          <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={disabled || !reviewed} onClick={() => void publish()}>Publish reviewed update</button><button type="button" className="text-sm text-cyan-200 underline" disabled={disabled} onClick={() => { setReviewing(false); setReviewed(false); }}>Back to edit</button></div>
        </section>}
      </div>
    </SellerActionDrawer> : null}
  </>;
}
