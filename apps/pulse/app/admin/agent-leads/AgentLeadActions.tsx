'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Archive, CheckCircle2, Loader2, RotateCcw, Save } from 'lucide-react';

type AgentLeadActionsProps = {
  leadId: string;
  status: 'new' | 'reviewed' | 'archived';
  internalNote?: string | null;
};

type ActionState = 'idle' | 'saving' | 'error';

export default function AgentLeadActions({ leadId, status, internalNote }: AgentLeadActionsProps) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>('idle');
  const [note, setNote] = useState(internalNote || '');
  const [error, setError] = useState('');

  const runAction = async (action: 'review' | 'archive' | 'restore' | 'note') => {
    setState('saving');
    setError('');

    try {
      const response = await fetch('/api/admin/agent-leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: leadId,
          action,
          ...(action === 'note' ? { note } : {}),
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

  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/45">Operator Actions</p>

      <div className="mt-3 grid gap-2">
        {status !== 'reviewed' && status !== 'archived' ? (
          <ActionButton
            label="Mark Reviewed"
            icon={<CheckCircle2 size={14} />}
            disabled={state === 'saving'}
            onClick={() => runAction('review')}
          />
        ) : null}

        {status === 'archived' ? (
          <ActionButton
            label="Restore"
            icon={<RotateCcw size={14} />}
            disabled={state === 'saving'}
            onClick={() => runAction('restore')}
          />
        ) : (
          <ActionButton
            label="Archive"
            icon={<Archive size={14} />}
            disabled={state === 'saving'}
            onClick={() => runAction('archive')}
          />
        )}
      </div>

      <label className="mt-4 block">
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
        onClick={() => runAction('note')}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
      >
        {state === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save Note
      </button>

      {error ? (
        <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
    >
      {icon}
      {label}
    </button>
  );
}
