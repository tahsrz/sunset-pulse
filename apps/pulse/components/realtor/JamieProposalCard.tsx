'use client';

import React, { useRef, useState } from 'react';
import { formatUsdCents, parseUsdToCents } from '@/lib/realtor-workspace/money';

type ProposalKind = 'planner' | 'financial' | 'goal';
type PropertyOption = { id: string; label: string; propertyKind: 'residential' | 'land'; status: 'active' | 'archived' };
type Proposal = {
  kind: string;
  editableFields: Record<string, unknown>;
  missingFields: string[];
  preview: Record<string, unknown> | null;
  targetRevision: number | null;
  apiPayload: Record<string, any> | null;
  confirmation: string;
};
type Props = {
  kind: ProposalKind;
  timeZone?: string;
  properties?: PropertyOption[];
  busy: boolean;
  submit: (url: string, method: 'POST' | 'PATCH', value: unknown, success: string) => Promise<boolean>;
};

const inputClass = 'w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-cyan-300 focus:outline-none';
const quietButton = 'rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50';
const buttonClass = 'rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-50';
const key = () => crypto.randomUUID();
function usdDraftToCents(value: string) {
  try { return parseUsdToCents(value); } catch { return undefined; }
}

function localDate(timeZone?: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (name: string) => parts.find((value) => value.type === name)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function initialInput(kind: ProposalKind, timeZone?: string) {
  if (kind === 'planner') return { kind: 'bill', title: '', dueDate: localDate(timeZone), recurrence: { frequency: 'monthly', interval: 1 }, reminderOffsetsDays: [3, 1], propertyId: null };
  if (kind === 'financial') return { kind: 'commission', mode: 'gross', amountCents: undefined, date: localDate(timeZone), deductions: undefined, category: 'other' };
  return { metric: 'net_income', year: new Date().getFullYear(), target: undefined };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-300">{label}<span className="mt-1 block">{children}</span></label>;
}

export function JamieProposalCard({ kind, timeZone, properties = [], busy, submit }: Props) {
  const [input, setInput] = useState<Record<string, any>>(() => initialInput(kind, timeZone));
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(input);
  inputRef.current = input;

  const update = (name: string, value: unknown) => {
    setProposal(null);
    setInput((current) => ({ ...current, [name]: value }));
  };
  const prepare = async () => {
    setWorking(true); setError('');
    const requestedInput = input;
    try {
      const requestInput = { ...input };
      delete requestInput.amount;
      delete requestInput.deductionAmount;
      delete requestInput.targetDisplay;
      const response = await fetch('/api/realtor/jamie/proposals', {
        method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, input: requestInput }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.error || 'Could not prepare this proposal.');
      if (inputRef.current === requestedInput) setProposal(body.result as Proposal);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not prepare this proposal.'); }
    finally { setWorking(false); }
  };

  const confirm = async () => {
    if (!proposal?.apiPayload || proposal.missingFields.length) return;
    let url: string;
    let payload: Record<string, any>;
    let success: string;
    if (kind === 'planner') {
      url = '/api/realtor/planner';
      payload = { ...proposal.apiPayload, item: { ...proposal.apiPayload.item, requestKey: key() } };
      success = 'Jamie’s planner proposal saved.';
    } else if (kind === 'financial') {
      url = '/api/realtor/financial-records'; payload = { ...proposal.apiPayload, requestKey: key() };
      success = 'Jamie’s financial proposal saved.';
    } else {
      url = '/api/realtor/goals'; payload = { ...proposal.apiPayload, requestKey: key() };
      success = 'Jamie’s goal proposal saved.';
    }
    if (await submit(url, 'POST', payload, success)) setProposal(null);
  };

  return <section aria-labelledby={`jamie-proposal-${kind}`} className="rounded-2xl border border-cyan-200/20 bg-cyan-950/20 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id={`jamie-proposal-${kind}`} className="font-bold text-cyan-100">Work it through with Jamie</h2>
        <p className="mt-1 text-xs leading-5 text-slate-400">Prepare a structured draft together. Nothing is saved until you review and confirm it.</p></div>
      {proposal ? <button type="button" className={quietButton} onClick={() => setProposal(null)}>Discard draft</button> : null}
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {kind === 'planner' ? <>
        <Field label="Item type"><select className={inputClass} value={input.kind} onChange={(event) => update('kind', event.target.value)}>{['bill','professional_deadline','appointment','follow_up','task','weekly_review'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></Field>
        <Field label="What needs scheduling?"><input className={inputClass} maxLength={160} value={input.title} onChange={(event) => update('title', event.target.value)} placeholder="Broker dues" /></Field>
        <Field label="First due date"><input className={inputClass} type="date" value={input.dueDate} onChange={(event) => update('dueDate', event.target.value)} /></Field>
        <Field label="Repeats"><select className={inputClass} value={input.recurrence.frequency === 'monthly' && input.recurrence.interval === 3 ? 'quarterly' : input.recurrence.frequency} onChange={(event) => update('recurrence', event.target.value === 'once' ? { frequency: 'once' } : event.target.value === 'quarterly' ? { frequency: 'monthly', interval: 3 } : { frequency: event.target.value, interval: 1 })}><option value="once">One time</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></Field>
        <Field label="Related shortlist property (optional)"><select className={inputClass} value={input.propertyId || ''} onChange={(event) => update('propertyId', event.target.value || null)}><option value="">No property link</option>{properties.filter((property) => property.status === 'active').map((property) => <option key={property.id} value={property.id}>{property.label}</option>)}</select></Field>
        {input.kind === 'bill' ? <Field label="Expected amount (USD)"><input className={inputClass} inputMode="decimal" value={input.amount || ''} onChange={(event) => { const amount = event.target.value; setProposal(null); setInput((current) => ({ ...current, amount, expectedAmountCents: amount ? usdDraftToCents(amount) ?? null : null })); }} placeholder="150.00" /></Field> : null}
      </> : null}
      {kind === 'financial' ? <>
        <Field label="Record type"><select className={inputClass} value={input.kind} onChange={(event) => { setInput({ ...initialInput('financial', timeZone), kind: event.target.value }); setProposal(null); }}><option value="commission">Commission received</option><option value="expense">Paid business expense</option><option value="expected_income">Expected income</option></select></Field>
        {input.kind === 'commission' ? <Field label="Amount represents"><select className={inputClass} value={input.mode} onChange={(event) => update('mode', event.target.value)}><option value="gross">Gross before deductions</option><option value="net_deposit">Deposit received</option></select></Field> : null}
        <Field label={input.kind === 'expense' ? 'Amount paid (USD)' : input.kind === 'expected_income' ? 'Expected take-home (USD)' : input.mode === 'gross' ? 'Gross commission (USD)' : 'Deposit received (USD)'}><input className={inputClass} inputMode="decimal" value={input.amount || ''} onChange={(event) => { const amount = event.target.value; setProposal(null); setInput((current) => ({ ...current, amount, amountCents: amount ? usdDraftToCents(amount) : undefined })); }} placeholder="850.00" /></Field>
        <Field label={input.kind === 'expected_income' ? 'Expected date' : input.kind === 'expense' ? 'Paid date' : 'Received date'}><input className={inputClass} type="date" value={input.date} onChange={(event) => update('date', event.target.value)} /></Field>
        {input.kind === 'commission' && input.mode === 'gross' ? <Field label="Actual total deductions (USD); enter 0 only if none"><input className={inputClass} inputMode="decimal" value={input.deductionAmount || ''} onChange={(event) => { const value = event.target.value; const cents = value === '' ? undefined : /^0(?:\.0{1,2})?$/.test(value) ? 0 : usdDraftToCents(value); setProposal(null); setInput((current) => ({ ...current, deductionAmount: value, deductions: cents === undefined ? undefined : cents > 0 ? [{ kind: 'broker_split', label: 'Broker / transaction deductions', amountCents: cents }] : [], confirmNoDeductions: cents === 0 })); }} placeholder="0.00" /></Field> : null}
        {input.kind === 'expense' ? <Field label="Category"><select className={inputClass} value={input.category || 'other'} onChange={(event) => update('category', event.target.value)}>{['broker_dues','mls','association','education','license','insurance','marketing','software','other'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></Field> : null}
        {input.kind === 'expected_income' ? <Field label="Deal label"><input className={inputClass} maxLength={160} value={input.label || ''} onChange={(event) => update('label', event.target.value)} placeholder="Smith purchase closing" /></Field> : null}
      </> : null}
      {kind === 'goal' ? <>
        <Field label="Progress metric"><select className={inputClass} value={input.metric} onChange={(event) => { setProposal(null); setInput((current) => ({ ...current, metric: event.target.value, target: undefined, targetDisplay: '' })); }}><option value="net_income">Recorded net income</option><option value="closings">Closings</option><option value="weekly_reviews">Weekly reviews</option></select></Field>
        <Field label={input.metric === 'net_income' ? 'Annual target (USD)' : 'Annual target'}><input className={inputClass} inputMode={input.metric === 'net_income' ? 'decimal' : 'numeric'} value={input.targetDisplay || ''} onChange={(event) => { const targetDisplay = event.target.value; setProposal(null); setInput((current) => ({ ...current, targetDisplay, target: targetDisplay ? current.metric === 'net_income' ? usdDraftToCents(targetDisplay) : /^\d+$/.test(targetDisplay) ? Number(targetDisplay) : undefined : undefined })); }} placeholder={input.metric === 'net_income' ? '100,000.00' : '24'} /></Field>
        <Field label="Year"><input className={inputClass} type="number" min={2000} max={2200} value={input.year} onChange={(event) => update('year', Number(event.target.value))} /></Field>
      </> : null}
    </div>
    {error ? <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p> : null}
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" className={quietButton} disabled={working || busy} onClick={() => void prepare()}>{working ? 'Preparing…' : proposal ? 'Update preview' : 'Prepare preview'}</button>
      {proposal ? <span className="text-xs text-slate-400">{proposal.confirmation}</span> : null}
    </div>
    {proposal ? <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 p-4" aria-live="polite">
      {proposal.missingFields.length ? <><p className="font-semibold text-amber-100">Still needed before saving</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-100/80">{proposal.missingFields.map((field) => <li key={field}>{field}</li>)}</ul></> : <>
        <p className="font-semibold text-emerald-100">Ready for your review</p>
        {kind === 'planner' && proposal.preview ? <><p className="mt-2 text-sm text-slate-300">Next due dates: {((proposal.preview.nextThreeDueDates as string[]) || []).join(', ')} · {String(proposal.preview.timeZone)}</p>{proposal.editableFields.property && typeof proposal.editableFields.property === 'object' ? <p className="mt-1 text-sm text-cyan-100">Linked property: {properties.find((property) => property.id === (proposal.editableFields.property as { propertyId?: string }).propertyId)?.label || 'Shortlist property'}</p> : null}</> : null}
        {kind === 'financial' && proposal.preview ? <p className="mt-2 text-sm text-slate-300">{String(proposal.preview.explanation)} {typeof proposal.preview.amountCents === 'number' ? `· ${formatUsdCents(String(proposal.preview.amountCents))}` : ''}</p> : null}
        {kind === 'goal' ? <p className="mt-2 text-sm text-slate-300">{String(proposal.editableFields.metric).replaceAll('_', ' ')} goal · year {String(proposal.editableFields.year)}{typeof proposal.editableFields.target === 'number' ? ` · target ${String(proposal.editableFields.target)}` : ''}</p> : null}
        <button type="button" className={buttonClass + ' mt-4'} disabled={busy || working || !proposal.apiPayload} onClick={() => void confirm()}>Confirm and save</button>
      </>}
      <p className="mt-3 text-xs text-slate-500">{kind === 'financial' ? 'Financial entries are private manual records; totals are before taxes. No tax or broker-fee estimate is inferred.' : 'You can update the fields above and regenerate this preview before saving.'}</p>
    </div> : null}
  </section>;
}
