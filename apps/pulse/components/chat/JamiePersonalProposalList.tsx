'use client';

import React, { useRef, useState } from 'react';
import { jamiePersonalProposalSchema, personalProposalEndpoint, type JamiePersonalProposal } from '@/lib/ai/jamiePersonalContract';

type EditableInput = Record<string, string | boolean>;

const fieldsByKind: Record<JamiePersonalProposal['kind'], string[]> = {
  planner_proposal: ['kind', 'title', 'propertyId', 'dueDate', 'localTime', 'recurrence', 'endsOn', 'reminderOffsetsDays', 'expectedAmountCents', 'notes'],
  financial_proposal: ['kind', 'mode', 'amountCents', 'date', 'deductions', 'confirmNoDeductions', 'category', 'payee', 'note', 'label', 'closingReference', 'memo'],
  goal_proposal: ['metric', 'target', 'year'],
};

const choices: Record<string, string[]> = {
  kind: ['bill', 'professional_deadline', 'appointment', 'follow_up', 'task', 'weekly_review', 'commission', 'expense', 'expected_income'],
  mode: ['gross', 'net_deposit'],
  category: ['broker_dues', 'mls', 'association', 'education', 'license', 'insurance', 'marketing', 'software', 'other'],
  metric: ['net_income', 'closings', 'weekly_reviews'],
};

function initialInput(proposal: JamiePersonalProposal): EditableInput {
  const fields = proposal.editableFields;
  const values: Record<string, unknown> = { ...fields };
  if (proposal.kind === 'planner_proposal') {
    const due = fields.due && typeof fields.due === 'object' ? fields.due as Record<string, unknown> : {};
    const property = fields.property && typeof fields.property === 'object' ? fields.property as Record<string, unknown> : {};
    Object.assign(values, {
      dueDate: due.anchorDate, localTime: due.localTime, recurrence: due.recurrence,
      endsOn: due.endsOn, reminderOffsetsDays: due.reminderOffsetsDays,
      propertyId: property.propertyId,
    });
  }
  return Object.fromEntries(fieldsByKind[proposal.kind].map((field) => {
    const value = values[field];
    if (field === 'confirmNoDeductions') return [field, value === true];
    if (field === 'recurrence' || field === 'deductions' || field === 'reminderOffsetsDays') return [field, value == null ? '' : JSON.stringify(value)];
    return [field, value == null ? '' : String(value)];
  }));
}

function proposalInput(proposal: JamiePersonalProposal, fields: EditableInput) {
  const output: Record<string, unknown> = {};
  for (const field of fieldsByKind[proposal.kind]) {
    const value = fields[field];
    if (field === 'confirmNoDeductions') { if (value) output[field] = true; continue; }
    if (typeof value !== 'string' || value === '') continue;
    if (['amountCents', 'expectedAmountCents', 'target', 'year'].includes(field)) output[field] = Number(value);
    else if (['recurrence', 'deductions', 'reminderOffsetsDays'].includes(field)) output[field] = JSON.parse(value);
    else output[field] = value;
  }
  if (proposal.kind === 'planner_proposal') {
    delete output.recurrence;
    delete output.reminderOffsetsDays;
    output.recurrence = fields.recurrence ? JSON.parse(String(fields.recurrence)) : undefined;
    output.reminderOffsetsDays = fields.reminderOffsetsDays ? JSON.parse(String(fields.reminderOffsetsDays)) : undefined;
  }
  return output;
}

function fieldLabel(field: string) {
  return field.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}

export function JamiePersonalProposalList({ proposals }: { proposals: JamiePersonalProposal[] }) {
  const requestKeys = useRef(new Map<string, string>());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusById, setStatusById] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, EditableInput>>({});
  const [activeProposals, setActiveProposals] = useState<Record<string, JamiePersonalProposal>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const visibleProposals = proposals.filter((proposal) => !dismissed.has(proposal.proposalId)).map((source) => ({
    sourceId: source.proposalId,
    proposal: activeProposals[source.proposalId] || source,
  }));
  if (!visibleProposals.length) return null;

  const confirm = async (proposal: JamiePersonalProposal) => {
    if (!proposal.apiPayload || proposal.missingFields.length) return;
    const requestKey = requestKeys.current.get(proposal.proposalId) || crypto.randomUUID();
    requestKeys.current.set(proposal.proposalId, requestKey);
    setBusyId(proposal.proposalId);
    setStatusById((current) => ({ ...current, [proposal.proposalId]: '' }));
    try {
      const endpoint = personalProposalEndpoint[proposal.kind];
      const payload = proposal.kind === 'planner_proposal'
        ? { ...proposal.apiPayload, item: { ...(proposal.apiPayload.item as Record<string, unknown>), requestKey } }
        : { ...proposal.apiPayload, requestKey };
      const response = await fetch(endpoint, {
        method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) throw new Error(result?.error || 'This draft changed. Reprepare it before saving.');
      requestKeys.current.delete(proposal.proposalId);
      setStatusById((current) => ({ ...current, [proposal.proposalId]: 'Saved after your confirmation.' }));
    } catch (error) {
      setStatusById((current) => ({ ...current, [proposal.proposalId]: error instanceof Error ? error.message : 'Could not save this draft.' }));
    } finally { setBusyId(null); }
  };

  const reprepare = async (proposal: JamiePersonalProposal, sourceId: string) => {
    const fields = drafts[sourceId] || initialInput(proposal);
    setBusyId(sourceId);
    setStatusById((current) => ({ ...current, [sourceId]: '' }));
    try {
      const response = await fetch('/api/realtor/jamie/proposals', {
        method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: proposal.kind.replace('_proposal', ''), input: proposalInput(proposal, fields) }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) throw new Error(result?.error || 'Could not re-prepare this draft.');
      const prepared = jamiePersonalProposalSchema.parse(result.result);
      requestKeys.current.delete(proposal.proposalId);
      setActiveProposals((current) => ({ ...current, [sourceId]: prepared }));
      setDrafts((current) => ({ ...current, [sourceId]: initialInput(prepared) }));
      setStatusById((current) => ({ ...current, [sourceId]: 'Updated draft is ready for review. Nothing has been saved.' }));
    } catch (error) {
      setStatusById((current) => ({ ...current, [sourceId]: error instanceof Error ? error.message : 'Could not re-prepare this draft.' }));
    } finally { setBusyId(null); }
  };

  return <div className="mt-3 space-y-2">
    {visibleProposals.map(({ proposal, sourceId }) => <section key={sourceId} className="rounded-xl border border-cyan-200/20 bg-slate-950/75 p-3" aria-label={`${labelFor(proposal.kind)} draft`}>
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-xs font-bold text-cyan-100">{labelFor(proposal.kind)}</h3><p className="mt-1 text-[11px] leading-5 text-slate-300">{proposal.confirmation}</p></div><button type="button" onClick={() => { requestKeys.current.delete(proposal.proposalId); setDismissed((current) => new Set(current).add(proposal.proposalId)); }} className="rounded border border-white/10 px-2 py-1 text-[10px] text-slate-400">Discard</button></div>
      {proposal.missingFields.length ? <div className="mt-3"><p className="text-[11px] font-semibold text-amber-100">Still needed</p><ul className="mt-1 list-disc pl-5 text-[11px] text-amber-100/80">{proposal.missingFields.map((field) => <li key={field}>{field}</li>)}</ul></div> : <p className="mt-3 text-[11px] text-emerald-100">Ready for your review. Confirming saves this item to your private workspace.</p>}
      <details className="mt-3 rounded-lg border border-white/10 p-2">
        <summary className="cursor-pointer text-[11px] font-semibold text-slate-200">Edit draft fields</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {fieldsByKind[proposal.kind].map((field) => {
            const values = drafts[sourceId] || initialInput(proposal);
            const update = (value: string | boolean) => setDrafts((current) => ({ ...current, [sourceId]: { ...(current[sourceId] || initialInput(proposal)), [field]: value } }));
            if (field === 'confirmNoDeductions') return <label key={field} className="flex items-center gap-2 text-[11px] text-slate-200"><input type="checkbox" checked={Boolean(values[field])} onChange={(event) => update(event.target.checked)} /> Confirm zero deductions</label>;
            if (field === 'deductions' && !values[field]) return null;
            const value = String(values[field] ?? '');
            return <label key={field} className="grid gap-1 text-[10px] text-slate-300">{fieldLabel(field)}
              {choices[field] ? <select value={value} onChange={(event) => update(event.target.value)} className="rounded bg-slate-900 px-2 py-1.5 text-xs">{!value ? <option value="">Choose…</option> : null}{choices[field].map((choice) => <option key={choice} value={choice}>{choice.replaceAll('_', ' ')}</option>)}</select>
                : <input type={['amountCents', 'expectedAmountCents', 'target', 'year'].includes(field) ? 'number' : field.toLowerCase().includes('date') || field === 'endsOn' ? 'date' : 'text'} value={value} onChange={(event) => update(event.target.value)} className="rounded bg-slate-900 px-2 py-1.5 text-xs" />}
            </label>;
          })}
        </div>
        <button type="button" disabled={busyId !== null} onClick={() => void reprepare(proposal, sourceId)} className="mt-3 rounded-lg border border-cyan-200/30 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-50">{busyId === sourceId ? 'Preparing…' : 'Re-prepare draft'}</button>
      </details>
      {(statusById[sourceId] || statusById[proposal.proposalId]) ? <p role="status" className="mt-2 text-[11px] text-cyan-100">{statusById[proposal.proposalId] || statusById[sourceId]}</p> : null}
      {proposal.apiPayload && !proposal.missingFields.length && !statusById[proposal.proposalId]?.startsWith('Saved') ? <button type="button" disabled={busyId !== null} onClick={() => void confirm(proposal)} className="mt-3 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">{busyId === proposal.proposalId ? 'Saving…' : 'Confirm and save'}</button> : null}
    </section>)}
  </div>;
}

function labelFor(kind: JamiePersonalProposal['kind']) {
  return ({ planner_proposal: 'Planner', financial_proposal: 'Financial record', goal_proposal: 'Goal' } as const)[kind];
}
