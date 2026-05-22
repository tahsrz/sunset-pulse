'use client';

import React from 'react';
import { OptimisticActionForm, OptimisticSubmitButton } from '@/components/forms/OptimisticActionForm';
import type { OptimisticMutationState, OptimisticServerAction } from '@/lib/forms/optimisticMutation';

type OptimisticSignatureFormProps = {
  action: OptimisticServerAction;
  documentId: string;
  documentTitle: string;
  signerName?: string;
  signerEmail?: string;
};

export function OptimisticSignatureForm({
  action,
  documentId,
  documentTitle,
  signerName = '',
  signerEmail = ''
}: OptimisticSignatureFormProps) {
  return (
    <OptimisticActionForm
      action={action}
      className="space-y-4"
      pendingMessage="Applying signature..."
      onOptimisticSubmit={(formData) => ({
        message: `Signing ${String(formData.get('documentTitle') || 'document')}...`
      })}
    >
      {(state) => (
        <>
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="documentTitle" value={documentTitle} />

          <div>
            <p className="text-xs font-black uppercase text-slate-400">Document</p>
            <p className="mt-1 text-sm font-bold text-white">{documentTitle}</p>
          </div>

          <label className="block text-xs font-bold uppercase text-slate-300">
            Signer Name
            <input
              name="signerName"
              defaultValue={signerName}
              required
              className="mt-2 w-full rounded border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case text-white outline-none transition focus:border-cyan-200"
            />
          </label>

          <label className="block text-xs font-bold uppercase text-slate-300">
            Signer Email
            <input
              type="email"
              name="signerEmail"
              defaultValue={signerEmail}
              required
              className="mt-2 w-full rounded border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case text-white outline-none transition focus:border-cyan-200"
            />
          </label>

          <label className="flex items-start gap-3 rounded border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-slate-300">
            <input name="acknowledged" type="checkbox" required className="mt-1 h-4 w-4 rounded border-white/20 bg-black/40 text-cyan-300" />
            <span>I acknowledge that this signature represents my intent to sign this document.</span>
          </label>

          <SignatureStatus state={state} />

          <OptimisticSubmitButton
            idleLabel="Sign Document"
            pendingLabel="Signing..."
            optimisticState={state}
            className="w-full rounded bg-cyan-300 px-4 py-3 text-sm font-black uppercase text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
          />
        </>
      )}
    </OptimisticActionForm>
  );
}

function SignatureStatus({ state }: { state: OptimisticMutationState }) {
  if (!state.message) return null;

  const tone = state.status === 'error'
    ? 'border-red-300/30 bg-red-500/10 text-red-100'
    : state.status === 'pending'
      ? 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100'
      : 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100';

  return <p className={`rounded border px-3 py-2 text-xs font-semibold ${tone}`}>{state.message}</p>;
}
