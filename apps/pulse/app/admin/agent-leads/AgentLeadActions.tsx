'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Archive,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
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
  generateFollowUpMessage,
  type AgentSiteLeadData,
  type LeadStatus,
} from '@/lib/sites/leadOperatingSystem';
import { resolveLeadExecutionIntent } from '@/lib/sites/leadExecutionIntent';
import { readPublicGuideLeadIntelligence } from '@/lib/sites/publicGuideLeadIntelligence';
import { readSellerLeadContext } from '@/lib/sites/sellerLeadContext';
import { SellerLeadScheduleDialog } from '@/components/realtor/SellerLeadScheduleDialog';
import { SellerOutcomeDialog } from '@/components/realtor/SellerOutcomeDialog';

type AgentLeadActionsProps = {
  lead: AgentSiteLeadData;
  agentName?: string;
  publicGuideDisposition?: PublicGuideDispositionId;
  revision?: number;
  canManageSellerLead?: boolean;
  personalTimeZone?: string;
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
  revision = 1,
  canManageSellerLead = false,
  personalTimeZone = 'America/Chicago',
}: AgentLeadActionsProps) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>('idle');
  const currentStatus = lead.status || 'new';
  const [note, setNote] = useState(lead.internal_note || '');
  const [disposition, setDisposition] = useState<PublicGuideDispositionId>(publicGuideDisposition || 'unassigned');
  const [error, setError] = useState('');
  const [copiedType, setCopiedType] = useState<'email' | 'sms' | null>(null);
  const actionKeys = useRef(new Map<string, { requestKey: string; occurredAt: string }>());
  const sellerScheduleKeys = useRef(new Map<string, string>());

  const isSellerLead = lead.source === 'seller_plan';
  const resolvedIntent = resolveLeadExecutionIntent(
    { ...lead, status: currentStatus },
    readPublicGuideLeadIntelligence(lead.metadata),
    agentName,
  );
  const executionIntent = isSellerLead && !canManageSellerLead
    ? { ...resolvedIntent, type: 'unavailable' as const, href: undefined, actionLabel: 'Owner action required', reason: 'Seller business actions are available to the current site owner.' }
    : resolvedIntent;
  const [scheduleAction, setScheduleAction] = useState<{
    actionKey: 'initial-response:v1' | `reply:${string}` | `consultation:${string}`;
    leadRevision: number;
    consultationStartsAt?: string;
  } | null>(null);
  const [replyFollowUp, setReplyFollowUp] = useState<{
    actionKey: `reply:${string}`;
    leadRevision: number;
  } | null>(null);
  const [showSellerOutcomes, setShowSellerOutcomes] = useState(false);
  const auditTrail = Array.isArray(lead.metadata?.auditTrail) ? (lead.metadata?.auditTrail as any[]) : [];
  const sellerContext = readSellerLeadContext(lead);

  const trackExecution = () => {
    if (executionIntent.type === 'unavailable') return;

    void fetch('/api/admin/agent-leads/action-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.id,
        actionType: executionIntent.type,
        agentId: lead.agent_id,
        listingId: lead.listing_mls_id || lead.listing_id || null,
      }),
      keepalive: true,
    }).catch(() => {
      // Telemetry must not interrupt the native contact action.
    });
  };

  const runAction = async (payloadData: Record<string, unknown>) => {
    setState('saving');
    setError('');

    try {
      const requestBody = { id: lead.id, expectedRevision: revision, ...payloadData };
      const sellerAction = isSellerLead && ['record_contact', 'record_response'].includes(String(payloadData.action));
      const payloadFingerprint = JSON.stringify(requestBody);
      let retry = actionKeys.current.get(payloadFingerprint);
      if (!retry) {
        retry = { requestKey: crypto.randomUUID(), occurredAt: new Date().toISOString() };
        actionKeys.current.clear();
        actionKeys.current.set(payloadFingerprint, retry);
      }
      const response = await fetch(sellerAction ? '/api/realtor/leads' : '/api/admin/agent-leads', {
        method: sellerAction ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sellerAction
          ? {
            leadId: lead.id,
            expectedRevision: revision,
            requestKey: retry.requestKey,
            ...payloadData,
            ...(payloadData.action === 'record_contact' || payloadData.action === 'record_response'
              ? { occurredAt: retry.occurredAt }
              : {}),
          }
          : { ...requestBody, requestKey: retry.requestKey }),
      });

      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responsePayload?.error || 'Lead update failed.');
      }

      actionKeys.current.delete(payloadFingerprint);
      if (sellerAction && payloadData.action === 'record_response') {
        const result = responsePayload?.result;
        if (typeof result?.eventId === 'string' && Number.isInteger(result?.leadRevision)) {
          setReplyFollowUp({ actionKey: `reply:${result.eventId}`, leadRevision: result.leadRevision });
        }
      }
      router.refresh();
      setState('idle');
    } catch (actionError: any) {
      setState('error');
      setError(actionError?.message || 'Lead update failed.');
    }
  };

  const handleStatusChange = (newStatus: LeadStatus) => {
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
            executionIntent.urgency === 'immediate'
              ? 'bg-red-500/20 text-red-300 border border-red-400/30'
              : executionIntent.urgency === 'high'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
          }`}>
            {executionIntent.urgency}
          </span>
        </div>
        <p className="mt-2 text-xs font-black text-white">{executionIntent.recommendationLabel}</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-300">{executionIntent.recommendation}</p>

        {executionIntent.href ? (
          <a
            href={executionIntent.href}
            onClick={trackExecution}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-cyan-200"
          >
            {executionIntent.type === 'call' ? <Phone size={15} /> : null}
            {executionIntent.type === 'email' ? <Mail size={15} /> : null}
            {executionIntent.type === 'sms' ? <MessageSquare size={15} /> : null}
            {executionIntent.actionLabel}
          </a>
        ) : (
          <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
            {executionIntent.reason}
          </p>
        )}

        {/* 1-Click Follow-Up Copy */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSellerLead && executionIntent.type === 'unavailable'}
            onClick={() => copyFollowUp('email')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-200 transition hover:bg-cyan-400/20"
          >
            {copiedType === 'email' ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
            {copiedType === 'email' ? 'Copied Email!' : 'Copy Email Draft'}
          </button>

          {lead.phone && !isSellerLead ? (
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

      <section className="border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Engagement receipts</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button type="button" disabled={state === 'saving' || (isSellerLead && executionIntent.type === 'unavailable')} onClick={() => runAction({ action: 'record_contact', channel: executionIntent.type === 'unavailable' ? 'email' : executionIntent.type })} className="inline-flex items-center justify-center gap-2 border border-blue-300/20 px-3 py-2 text-[10px] font-black uppercase text-blue-100 hover:bg-blue-300/10 disabled:opacity-50"><Phone size={14} />Record attempt</button>
          <button type="button" disabled={state === 'saving' || (isSellerLead && !canManageSellerLead)} onClick={() => runAction({ action: 'record_response', source: 'customer_reply' })} className="inline-flex items-center justify-center gap-2 border border-emerald-300/20 px-3 py-2 text-[10px] font-black uppercase text-emerald-100 hover:bg-emerald-300/10 disabled:opacity-50"><MessageSquare size={14} />Record reply</button>
          {isSellerLead ? <button type="button" disabled={state === 'saving' || !canManageSellerLead} onClick={() => setShowSellerOutcomes(true)} className="inline-flex items-center justify-center gap-2 border border-cyan-300/20 px-3 py-2 text-[10px] font-black uppercase text-cyan-100 hover:bg-cyan-300/10 disabled:opacity-50"><CheckCircle2 size={14} />Consultation / closing</button> : null}
          {!isSellerLead ? <button type="button" disabled={state === 'saving'} onClick={() => runAction({ action: 'record_response', source: 'appointment_booked' })} className="inline-flex items-center justify-center gap-2 border border-purple-300/20 px-3 py-2 text-[10px] font-black uppercase text-purple-100 hover:bg-purple-300/10 disabled:opacity-50"><CheckCircle2 size={14} />Record appointment</button> : null}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">Attempt: {lead.contact_attempted_at ? formatShortTime(lead.contact_attempted_at) : 'not recorded'} · Response: {lead.responded_at ? `${lead.response_source === 'appointment_booked' ? 'appointment' : 'reply'} ${formatShortTime(lead.responded_at)}` : 'not recorded'}</p>
        {isSellerLead && canManageSellerLead && replyFollowUp ? <button type="button" onClick={() => setScheduleAction(replyFollowUp)} className="mt-3 w-full rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-100 hover:bg-cyan-300/20">Schedule reply follow-up</button> : null}
        {isSellerLead && canManageSellerLead && sellerContext?.requestedContact && currentStatus !== 'archived' && currentStatus !== 'closed' && !lead.contact_attempted_at && !scheduleAction && !replyFollowUp ? <button type="button" onClick={() => setScheduleAction({ actionKey: 'initial-response:v1', leadRevision: revision })} className="mt-3 w-full rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-100 hover:bg-cyan-300/20">Schedule next action</button> : null}
      </section>

      {/* Pipeline Status Selector */}
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/45">Pipeline Status</p>
        <div className="grid grid-cols-3 gap-1.5">
          {PIPELINE_STATUSES.filter((item) => !isSellerLead || item.id !== 'closed').map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={state === 'saving' || (isSellerLead && !canManageSellerLead)}
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
            disabled={isSellerLead && !canManageSellerLead}
            rows={3}
            maxLength={2000}
            className="w-full resize-y rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-xs leading-5 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70"
            placeholder="Add a private follow-up note..."
          />
        </label>

        <button
          type="button"
          disabled={state === 'saving' || (isSellerLead && !canManageSellerLead)}
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
      {showSellerOutcomes ? <SellerOutcomeDialog key={lead.id} leadId={lead.id} leadName={lead.name} revision={revision} timeZone={personalTimeZone} onClose={() => setShowSellerOutcomes(false)} onSaved={() => router.refresh()} onConsultationConfirmed={(eventId, leadRevision, startsAt) => { setShowSellerOutcomes(false); setScheduleAction({ actionKey: `consultation:${eventId}`, leadRevision, consultationStartsAt: startsAt }); }} /> : null}
      {scheduleAction ? <SellerLeadScheduleDialog leadId={lead.id} leadName={lead.name} leadRevision={scheduleAction.leadRevision} timeZone={personalTimeZone} retryRequests={sellerScheduleKeys.current} actionKey={scheduleAction.actionKey} consultationStartsAt={scheduleAction.consultationStartsAt} onClose={() => setScheduleAction(null)} onSaved={() => { setScheduleAction(null); setReplyFollowUp(null); router.refresh(); }} /> : null}
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
