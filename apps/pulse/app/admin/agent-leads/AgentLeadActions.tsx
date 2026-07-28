'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Archive,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  MessageSquare,
  RotateCcw,
  Save,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  PUBLIC_GUIDE_DISPOSITIONS,
  type PublicGuideDispositionId,
} from '@/lib/ai/publicGuideConversionContract';
import {
  deriveNextBestAction,
  generateFollowUpMessage,
  type AgentSiteLeadData,
  type LeadStatus,
} from '@/lib/sites/leadOperatingSystem';

type AgentLeadActionsProps = {
  lead: AgentSiteLeadData;
  agentName?: string;
  publicGuideDisposition?: PublicGuideDispositionId;
};

type ActionState = 'idle' | 'saving' | 'error';

const PIPELINE_STATUSES: Array<{ id: LeadStatus; label: string; color: string }> = [
  { id: 'new', label: 'New', color: 'border-cyan-400/40 text-cyan-200 bg-cyan-500/10' },
  { id: 'contacted', label: 'Contacted', color: 'border-blue-400/40 text-blue-200 bg-blue-500/10' },
  { id: 'touring', label: 'Touring', color: 'border-purple-400/40 text-purple-200 bg-purple-500/10' },
  { id: 'nurture', label: 'Nurture', color: 'border-amber-400/40 text-amber-200 bg-amber-500/10' },
  { id: 'closed', label: 'Closed', color: 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10' },
  { id: 'archived', label: 'Archived', color: 'border-slate-500/40 text-slate-400 bg-slate-500/10' },
];

export default function AgentLeadActions({
  lead,
  agentName = 'Agent',
  publicGuideDisposition,
}: AgentLeadActionsProps) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>('idle');
  const [currentStatus, setCurrentStatus] = useState<LeadStatus>(lead.status || 'new');
  const [note, setNote] = useState(lead.internal_note || '');
  const [disposition, setDisposition] = useState<PublicGuideDispositionId>(publicGuideDisposition || 'unassigned');
  const [error, setError] = useState('');
  const [copiedType, setCopiedType] = useState<'email' | 'sms' | null>(null);

  const nextAction = deriveNextBestAction({ ...lead, status: currentStatus });
  const auditTrail = Array.isArray(lead.metadata?.auditTrail) ? (lead.metadata?.auditTrail as any[]) : [];

  const runAction = async (payloadData: Record<string, unknown>) => {
    setState('saving');
    setError('');

    try {
      const response = await fetch('/api/admin/agent-leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          ...payloadData,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Lead update failed.');
      }

      router.refresh();
      setState('idle');
    } catch (actionError: any) {
      setState('error');
      setError(actionError?.message || 'Lead update failed.');
    }
  };

  const handleStatusChange = (newStatus: LeadStatus) => {
    setCurrentStatus(newStatus);
    void runAction({ action: 'set_status', status: newStatus });
  };

  const copyFollowUp = (channel: 'email' | 'sms') => {
    const draft = generateFollowUpMessage({ ...lead, status: currentStatus }, channel, agentName);
    const textToCopy = draft.subject ? `Subject: ${draft.subject}\n\n${draft.body}` : draft.body;

    void navigator.clipboard.writeText(textToCopy);
    setCopiedType(channel);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="mt-5 space-y-5 border-t border-white/10 pt-5">
      {/* Next Best Action Widget */}
      <section className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950 p-4 shadow-lg">
        <div className="flex items-center gap-2 text-cyan-300">
          <Sparkles size={16} />
          <span className="text-[10px] font-black uppercase tracking-[0.24em]">Next Best Action</span>
          <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
            nextAction.urgency === 'immediate'
              ? 'bg-red-500/20 text-red-300 border border-red-400/30'
              : nextAction.urgency === 'high'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
          }`}>
            {nextAction.urgency}
          </span>
        </div>
        <p className="mt-2 text-xs font-black text-white">{nextAction.label}</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-300">{nextAction.recommendation}</p>

        {/* 1-Click Follow-Up Copy */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copyFollowUp('email')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-200 transition hover:bg-cyan-400/20"
          >
            {copiedType === 'email' ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
            {copiedType === 'email' ? 'Copied Email!' : 'Copy Email Draft'}
          </button>

          {lead.phone ? (
            <button
              type="button"
              onClick={() => copyFollowUp('sms')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 transition hover:bg-white/10"
            >
              {copiedType === 'sms' ? <Check size={13} className="text-emerald-300" /> : <MessageSquare size={13} />}
              {copiedType === 'sms' ? 'Copied SMS!' : 'Copy SMS Draft'}
            </button>
          ) : null}
        </div>
      </section>

      {/* Pipeline Status Selector */}
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/45">Pipeline Status</p>
        <div className="grid grid-cols-3 gap-1.5">
          {PIPELINE_STATUSES.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={state === 'saving'}
              onClick={() => handleStatusChange(item.id)}
              className={`rounded-xl border px-2.5 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                currentStatus === item.id
                  ? `${item.color} shadow-sm`
                  : 'border-white/10 bg-slate-950 text-slate-500 hover:text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jamie Lead Outcome (if applicable) */}
      {publicGuideDisposition ? (
        <div className="border-t border-white/10 pt-4">
          <label className="block">
            <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/45">Jamie Lead Outcome</span>
            <select
              value={disposition}
              onChange={(event) => setDisposition(event.target.value as PublicGuideDispositionId)}
              disabled={state === 'saving'}
              className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-bold text-white outline-none transition focus:border-cyan-300/70 disabled:opacity-60"
            >
              {PUBLIC_GUIDE_DISPOSITIONS.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={state === 'saving' || disposition === publicGuideDisposition}
            onClick={() => runAction({ action: 'disposition', disposition })}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {state === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}
            Save Outcome
          </button>
        </div>
      ) : null}

      {/* Internal Note Field */}
      <div>
        <label className="block">
          <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/45">Internal Note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full resize-y rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-xs leading-5 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70"
            placeholder="Add a private follow-up note..."
          />
        </label>

        <button
          type="button"
          disabled={state === 'saving'}
          onClick={() => runAction({ action: 'note', note })}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
        >
          {state === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Note
        </button>
      </div>

      {/* Audit Trail Timeline */}
      {auditTrail.length > 0 ? (
        <div className="border-t border-white/10 pt-4">
          <p className="mb-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
            <Clock size={12} />
            Activity Trail
          </p>
          <div className="space-y-2">
            {auditTrail.slice(0, 5).map((event: any) => (
              <div key={event.id || event.timestamp} className="rounded-xl border border-white/5 bg-slate-950/60 p-2 text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-bold text-white">{event.actor}</span>
                  <span className="font-mono text-[9px] text-slate-500">{formatShortTime(event.timestamp)}</span>
                </div>
                <p className="mt-1 text-slate-300">{event.action}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function formatShortTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
}
