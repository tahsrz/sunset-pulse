'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, CheckCircle2, DatabaseZap, FileText, Loader2, MailPlus, MapPin, MessageSquarePlus, ScanSearch, Trash2, UserRound } from 'lucide-react';
import {
  INTERNAL_LEAD_SOURCE_LABELS,
  getLeadDisplayName,
  type InternalLead,
  type LeadCollaborator,
} from '@/lib/lead-generation/internalLeadSystem';
import LeadEnrichmentPanel from '@/components/admin/LeadEnrichmentPanel';
import LeadCorrespondenceComposer from '@/components/admin/LeadCorrespondenceComposer';

type LoadState = 'loading' | 'ready' | 'error';

export default function ResearchDesk() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>('loading');
  const [leads, setLeads] = useState<InternalLead[]>([]);
  const [collaborators, setCollaborators] = useState<LeadCollaborator[]>([]);
  const [error, setError] = useState('');
  const [discoveryState, setDiscoveryState] = useState<'idle' | 'running'>('idle');
  const [discoveryMessage, setDiscoveryMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showComposer, setShowComposer] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const response = await fetch('/api/admin/leads?status=research', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('Lead data is unavailable. Check the Supabase connection and apply the internal lead migration.');
      setLeads(payload.leads || []);
      setSelectedIds((current) => current.filter((id) => (payload.leads || []).some((lead: InternalLead) => lead.id === id)));
      setCollaborators(payload.collaborators || []);
      setState('ready');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the research desk.');
      setState('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const update = async (payload: Record<string, string>) => {
    const response = await fetch('/api/admin/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Lead update failed.');
    await load();
    router.refresh();
  };

  const startDiscovery = async () => {
    setDiscoveryState('running');
    setDiscoveryMessage('Starting TAD discovery...');
    try {
      const response = await fetch('/api/admin/leads/discover/tad', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'TAD discovery could not start.');
      setDiscoveryMessage('Scanning the official TAD property export. This can take several minutes.');
      await pollDiscovery();
    } catch (discoveryError) {
      setDiscoveryMessage(discoveryError instanceof Error ? discoveryError.message : 'TAD discovery failed.');
    } finally {
      setDiscoveryState('idle');
    }
  };

  const pollDiscovery = async () => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const response = await fetch('/api/admin/leads/discover/tad', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not read discovery status.');
      const run = payload.run;
      if (!run || run.status === 'running') continue;
      if (run.status === 'failed') throw new Error(run.error || 'TAD discovery failed.');
      setDiscoveryMessage(`Added ${run.insertedLeads || 0} leads from ${Number(run.scannedRecords || 0).toLocaleString()} property records.`);
      await load();
      return;
    }
    throw new Error('Discovery is still running. You can leave this page and check again later.');
  };

  if (state === 'loading') {
    return <div className="flex min-h-72 items-center justify-center border border-white/10 bg-white/[0.025] text-zinc-400"><Loader2 className="animate-spin" size={20} /></div>;
  }

  if (state === 'error') {
    return <div className="border border-rose-300/30 bg-rose-300/10 p-5 text-rose-100">{error}</div>;
  }

  return <div>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/[0.025] px-4 py-3">
      <div><p className="text-xs font-black uppercase tracking-[0.12em] text-white">TAD absentee discovery</p><p className="mt-1 text-[11px] text-zinc-500">Adds up to 25 ranked residential absentee-owner records per run.</p></div>
      <button type="button" disabled={discoveryState === 'running'} onClick={() => void startDiscovery()} className="inline-flex items-center gap-2 bg-cyan-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.11em] text-cyan-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">{discoveryState === 'running' ? <Loader2 size={14} className="animate-spin" /> : <DatabaseZap size={14} />}Discover TAD Leads</button>
      {discoveryMessage ? <p className="w-full text-xs text-cyan-100">{discoveryMessage}</p> : null}
    </div>
    {leads.length ? <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/[0.025] px-4 py-3"><label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={selectedIds.length === leads.length} onChange={(event) => setSelectedIds(event.target.checked ? leads.map((lead) => lead.id) : [])} className="border-white/20 bg-black/30 text-emerald-300" />Select all {leads.length}</label><button type="button" disabled={!selectedIds.length} onClick={() => setShowComposer(true)} className="inline-flex items-center gap-2 bg-emerald-300 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-emerald-950 disabled:opacity-40"><MailPlus size={15} />Draft outreach ({selectedIds.length})</button></div> : null}
    {!leads.length ? <div className="border border-dashed border-white/15 bg-white/[0.02] p-10 text-center text-sm text-zinc-400">No unverified records are waiting for research.</div> : <div className="overflow-hidden border border-white/10 bg-white/[0.025]">
    <div className="hidden grid-cols-[32px_minmax(220px,1.2fr)_minmax(180px,0.9fr)_minmax(220px,1.1fr)_150px] gap-4 border-b border-white/10 bg-black/20 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500 lg:grid">
      <span />
      <span>Lead</span><span>Signal</span><span>Investigation</span><span>Decision</span>
    </div>
    <div className="divide-y divide-white/10">
      {leads.map((lead) => <ResearchRow key={lead.id} lead={lead} selected={selectedIds.includes(lead.id)} onSelected={(selected) => setSelectedIds((current) => selected ? [...new Set([...current, lead.id])] : current.filter((id) => id !== lead.id))} collaborators={collaborators} onUpdate={update} onReload={load} />)}
    </div>
  </div>}
    {showComposer && selectedIds.length ? <LeadCorrespondenceComposer leads={leads.filter((lead) => selectedIds.includes(lead.id))} onClose={() => setShowComposer(false)} /> : null}
  </div>;
}

function ResearchRow({ lead, selected, onSelected, collaborators, onUpdate, onReload }: { lead: InternalLead; selected: boolean; onSelected: (selected: boolean) => void; collaborators: LeadCollaborator[]; onUpdate: (payload: Record<string, string>) => Promise<void>; onReload: () => Promise<void> }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showEnrichment, setShowEnrichment] = useState(false);
  const source = lead.prospecting_source ? INTERNAL_LEAD_SOURCE_LABELS[lead.prospecting_source] : 'Manual entry';
  const assignee = collaborators.find((collaborator) => collaborator.id === lead.assigned_to)?.name || 'Unassigned';

  const submitNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) return;
    setSaving(true); setError('');
    try {
      await onUpdate({ id: lead.id, action: 'add_note', content: note.trim() });
      setNote('');
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Note failed to save.');
    } finally { setSaving(false); }
  };

  const promote = async () => {
    setSaving(true); setError('');
    try { await onUpdate({ id: lead.id, action: 'promote' }); }
    catch (promotionError) { setError(promotionError instanceof Error ? promotionError.message : 'Promotion failed.'); }
    finally { setSaving(false); }
  };

  const deleteLead = async () => {
    if (!window.confirm(`Delete ${getLeadDisplayName(lead)} and all of its notes and evidence?`)) return;
    setSaving(true); setError('');
    try { await onUpdate({ id: lead.id, action: 'delete' }); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Lead deletion failed.'); }
    finally { setSaving(false); }
  };

  const toggleContactRestriction = async () => {
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/admin/leads/correspondence', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_compliance', leadId: lead.id, doNotContact: !lead.do_not_contact, reason: !lead.do_not_contact ? 'Operator marked do not contact' : undefined }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Contact restriction update failed.');
      await onReload();
    } catch (restrictionError) { setError(restrictionError instanceof Error ? restrictionError.message : 'Contact restriction update failed.'); }
    finally { setSaving(false); }
  };

  return <article>
    <div className="grid gap-5 px-5 py-5 lg:grid-cols-[32px_minmax(220px,1.2fr)_minmax(180px,0.9fr)_minmax(220px,1.1fr)_150px]">
    <label className="flex items-start pt-1"><input type="checkbox" checked={selected} onChange={(event) => onSelected(event.target.checked)} aria-label={`Select ${getLeadDisplayName(lead)}`} className="border-white/20 bg-black/30 text-emerald-300" /></label>
    <div className="min-w-0">
      <h2 className="break-words text-base font-black text-white">{getLeadDisplayName(lead)}</h2>
      {lead.property_address ? <p className="mt-2 flex gap-2 text-sm text-zinc-300"><MapPin size={15} className="mt-0.5 shrink-0 text-emerald-200" />{lead.property_address}</p> : null}
      <p className="mt-2 text-xs text-zinc-500">{lead.phone || lead.email || 'No contact detail yet'}</p>
      {lead.do_not_contact ? <p className="mt-2 text-xs font-black uppercase text-rose-200">Do not contact</p> : null}
    </div>
    <div>
      <p className="inline-flex border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">{source}</p>
      <p className="mt-3 flex items-center gap-2 text-xs text-zinc-400"><UserRound size={14} />{assignee}</p>
      {lead.attachments.length ? <p className="mt-2 flex items-center gap-2 text-xs text-zinc-400"><FileText size={14} />{lead.attachments.length} evidence file{lead.attachments.length === 1 ? '' : 's'}</p> : null}
      {lead.intelligenceEvidence.length ? <p className="mt-2 flex items-center gap-2 text-xs text-zinc-400"><ScanSearch size={14} />{lead.intelligenceEvidence.length} source capture{lead.intelligenceEvidence.length === 1 ? '' : 's'}</p> : null}
    </div>
    <div className="min-w-0">
      {lead.notes.length ? <div className="space-y-2">{lead.notes.slice(0, 2).map((entry) => <div key={entry.id} className="border-l-2 border-emerald-300/50 pl-3 text-sm leading-5 text-zinc-300"><span className="mr-2 text-xs font-bold text-emerald-100">{entry.author_name || 'Operator'}</span>{entry.content}</div>)}</div> : <p className="text-sm text-zinc-500">No research notes yet.</p>}
      <form onSubmit={submitNote} className="mt-3 flex gap-2">
        <input value={note} onChange={(event) => setNote(event.target.value)} className="min-w-0 flex-1 border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-emerald-300/70" placeholder="Add finding" />
        <button type="submit" disabled={saving || !note.trim()} className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-white/10 text-zinc-300 transition hover:bg-white/10 disabled:opacity-40" aria-label="Add investigation note"><MessageSquarePlus size={15} /></button>
      </form>
    </div>
    <div className="flex flex-col items-stretch gap-2">
      <button type="button" disabled={saving} onClick={promote} className="inline-flex items-center justify-center gap-2 bg-emerald-400 px-3 py-2.5 text-xs font-black uppercase tracking-[0.11em] text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-60"><CheckCircle2 size={15} />Promote</button>
      <button type="button" onClick={() => setShowEnrichment((current) => !current)} aria-expanded={showEnrichment} className="inline-flex items-center justify-center gap-2 border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-2.5 text-xs font-black uppercase tracking-[0.11em] text-cyan-100 transition hover:bg-cyan-300/10"><ScanSearch size={15} />Enrich</button>
      <button type="button" disabled={saving} onClick={deleteLead} className="inline-flex items-center justify-center gap-2 border border-rose-300/20 px-3 py-2 text-xs font-black uppercase tracking-[0.11em] text-rose-200 transition hover:bg-rose-300/10 disabled:opacity-50"><Trash2 size={14} />Delete</button>
      <button type="button" disabled={saving} onClick={toggleContactRestriction} className="inline-flex items-center justify-center gap-2 border border-amber-300/20 px-3 py-2 text-xs font-black uppercase tracking-[0.11em] text-amber-100 transition hover:bg-amber-300/10 disabled:opacity-50"><Ban size={14} />{lead.do_not_contact ? 'Allow contact' : 'Do not contact'}</button>
      {error ? <p className="text-xs text-rose-200">{error}</p> : null}
    </div>
    </div>
    {showEnrichment ? <LeadEnrichmentPanel lead={lead} onReload={onReload} /> : null}
  </article>;
}
