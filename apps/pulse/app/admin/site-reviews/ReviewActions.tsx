'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { CheckCircle2, Loader2, MessageSquareWarning, SearchCheck } from 'lucide-react';

type ReviewAction = 'mark_in_review' | 'request_changes' | 'approve_publish';

export default function ReviewActions({ agentId, defaultNotes = '' }: { agentId: string; defaultNotes?: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState(defaultNotes);
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);
  const [error, setError] = useState('');

  async function submit(action: ReviewAction) {
    setPendingAction(action);
    setError('');

    try {
      const response = await fetch('/api/admin/sites/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, action, notes }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const failedChecks = Array.isArray(body.details)
          ? ` ${body.details.map((check: any) => check.label || check.key).join(', ')}`
          : '';
        throw new Error(`${body.message || 'Review action failed.'}${failedChecks}`);
      }

      router.refresh();
    } catch (actionError: any) {
      setError(actionError?.message || 'Review action failed.');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="grid gap-3">
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        maxLength={1500}
        rows={3}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50"
        placeholder="Operator notes"
      />
      {error ? (
        <p className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-xs font-bold leading-5 text-red-100">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <ActionButton
          label="In Review"
          action="mark_in_review"
          pendingAction={pendingAction}
          onClick={submit}
          tone="neutral"
          icon={<SearchCheck size={14} />}
        />
        <ActionButton
          label="Changes"
          action="request_changes"
          pendingAction={pendingAction}
          onClick={submit}
          tone="warn"
          icon={<MessageSquareWarning size={14} />}
        />
        <ActionButton
          label="Approve"
          action="approve_publish"
          pendingAction={pendingAction}
          onClick={submit}
          tone="approve"
          icon={<CheckCircle2 size={14} />}
        />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  action,
  pendingAction,
  onClick,
  tone,
  icon,
}: {
  label: string;
  action: ReviewAction;
  pendingAction: ReviewAction | null;
  onClick: (action: ReviewAction) => void;
  tone: 'neutral' | 'warn' | 'approve';
  icon: ReactNode;
}) {
  const active = pendingAction === action;
  const disabled = pendingAction !== null;
  const toneClass = tone === 'approve'
    ? 'border-emerald-300/30 bg-emerald-300 text-slate-950'
    : tone === 'warn'
      ? 'border-amber-300/30 bg-amber-300/10 text-amber-100'
      : 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100';

  return (
    <button
      type="button"
      onClick={() => onClick(action)}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
    >
      {active ? <Loader2 size={14} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}
