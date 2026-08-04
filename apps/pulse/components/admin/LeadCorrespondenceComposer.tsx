'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Mail, Save, Send, X } from 'lucide-react';
import { buildLeadMessageVariables, LEAD_MESSAGE_FIELDS, renderLeadMessage } from '@/lib/lead-generation/leadCorrespondence';
import { getLeadDisplayName, type InternalLead } from '@/lib/lead-generation/internalLeadSystem';

type Channel = 'letter' | 'email';
type Template = { id: string; name: string; channel: Channel; subject_template: string | null; body_template: string; created_by_name: string | null };

const defaultBody = `Hello {{first_name}},

I am reaching out regarding {{property_address}}. Public property records indicate an estimated market value of {{market_value}}, and I would be glad to prepare a current, local market analysis if selling or reviewing your options is on your radar.

There is no obligation. I can simply provide the numbers and answer any questions about the current market.

Sincerely,
{{agent_name}}`;

export default function LeadCorrespondenceComposer({ leads, onClose }: { leads: InternalLead[]; onClose: () => void }) {
  const [channel, setChannel] = useState<Channel>('letter');
  const [name, setName] = useState('Absentee owner introduction');
  const [subject, setSubject] = useState('A market update for {{property_address}}');
  const [body, setBody] = useState(defaultBody);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const previewLead = leads[0];
  const variables = useMemo(() => buildLeadMessageVariables(previewLead, 'Your agent name'), [previewLead]);
  const preview = renderLeadMessage(body, variables);
  const missingEmails = leads.filter((lead) => !lead.email).length;

  useEffect(() => {
    void fetch('/api/admin/leads/correspondence', { cache: 'no-store' }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setTemplates(payload.templates || []);
    });
  }, []);

  const chooseTemplate = (id: string) => {
    setTemplateId(id);
    const selected = templates.find((template) => template.id === id);
    if (!selected) return;
    setName(selected.name); setChannel(selected.channel); setSubject(selected.subject_template || ''); setBody(selected.body_template);
  };

  const submit = async (action: 'save_template' | 'generate_drafts') => {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/leads/correspondence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name, channel, subjectTemplate: channel === 'email' ? subject : '', bodyTemplate: body, leadIds: leads.map((lead) => lead.id), templateId: templateId || undefined }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Correspondence could not be saved.');
      setMessage(action === 'save_template' ? 'Shared template saved.' : `${payload.count} personalized draft${payload.count === 1 ? '' : 's'} created.${payload.skipped ? ` ${payload.skipped} duplicate${payload.skipped === 1 ? '' : 's'} skipped.` : ''}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Correspondence could not be saved.'); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[80] flex justify-end bg-black/55" role="dialog" aria-modal="true" aria-label="Draft outreach">
    <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-zinc-950 shadow-2xl">
      <header className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-zinc-950 px-5 py-4">
        <div><h2 className="text-lg font-black text-white">Draft outreach</h2><p className="mt-1 text-xs text-zinc-400">{leads.length} selected lead{leads.length === 1 ? '' : 's'} · drafts only</p></div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-white/10 text-zinc-300 hover:bg-white/10" aria-label="Close composer"><X size={17} /></button>
      </header>
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 border border-white/10 p-1">
          <button type="button" onClick={() => setChannel('letter')} className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold ${channel === 'letter' ? 'bg-emerald-300 text-emerald-950' : 'text-zinc-400'}`}><FileText size={15} />Letter</button>
          <button type="button" onClick={() => setChannel('email')} className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold ${channel === 'email' ? 'bg-cyan-300 text-cyan-950' : 'text-zinc-400'}`}><Mail size={15} />Email</button>
        </div>
        {channel === 'email' && missingEmails ? <p className="border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">{missingEmails} selected lead{missingEmails === 1 ? '' : 's'} do not have an email address. Their drafts will be saved without a recipient.</p> : null}
        {templates.length ? <label className="block text-xs font-bold text-zinc-300">Shared template<select value={templateId} onChange={(event) => chooseTemplate(event.target.value)} className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"><option value="">Start from current draft</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} ({template.channel})</option>)}</select></label> : null}
        <label className="block text-xs font-bold text-zinc-300">Template name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-emerald-300" /></label>
        {channel === 'email' ? <label className="block text-xs font-bold text-zinc-300">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" /></label> : null}
        <div><p className="text-xs font-bold text-zinc-300">Merge fields</p><div className="mt-2 flex flex-wrap gap-2">{LEAD_MESSAGE_FIELDS.map((field) => <button key={field} type="button" title={`Insert ${field}`} onClick={() => setBody((current) => `${current}{{${field}}}`)} className="border border-white/10 px-2 py-1 font-mono text-[11px] text-zinc-300 hover:bg-white/10">{`{{${field}}}`}</button>)}</div></div>
        <label className="block text-xs font-bold text-zinc-300">Message<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={12} className="mt-2 w-full resize-y border border-white/10 bg-black/30 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-emerald-300" /></label>
        <section className="border-t border-white/10 pt-4"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">Preview · {getLeadDisplayName(previewLead)}</p>{channel === 'email' ? <p className="mt-3 text-sm font-bold text-white">{renderLeadMessage(subject, variables).text}</p> : null}<div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{preview.text}</div>{preview.missing.length ? <p className="mt-3 text-xs text-amber-200">Missing for this lead: {preview.missing.join(', ')}</p> : null}</section>
        {message ? <p className="text-sm text-emerald-100">{message}</p> : null}
        <div className="sticky bottom-0 flex gap-3 border-t border-white/10 bg-zinc-950 py-4">
          <button type="button" disabled={busy || !name.trim() || !body.trim()} onClick={() => void submit('save_template')} className="inline-flex flex-1 items-center justify-center gap-2 border border-white/15 px-3 py-2.5 text-xs font-black uppercase tracking-[0.1em] text-white hover:bg-white/10 disabled:opacity-40"><Save size={15} />Save template</button>
          <button type="button" disabled={busy || !name.trim() || !body.trim()} onClick={() => void submit('generate_drafts')} className="inline-flex flex-1 items-center justify-center gap-2 bg-emerald-300 px-3 py-2.5 text-xs font-black uppercase tracking-[0.1em] text-emerald-950 hover:bg-emerald-200 disabled:opacity-40"><Send size={15} />Create {leads.length} drafts</button>
        </div>
      </div>
    </div>
  </div>;
}
