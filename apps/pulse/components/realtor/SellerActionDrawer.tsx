'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { ModalSurface } from './ModalSurface';

export type SellerCaseActionView =
  | { kind: 'closed' }
  | { kind: 'reply'; leadId: string }
  | { kind: 'appointment'; bookingId: string }
  | { kind: 'prepare'; leadId: string }
  | { kind: 'milestone'; leadId: string }
  | { kind: 'share'; leadId: string };

export function SellerActionDrawer({
  titleId,
  title,
  description,
  unsavedDescription = 'Your changes have not been saved.',
  dirty,
  busy,
  saveBlocked = false,
  error,
  onClose,
  onSave,
  onDiscard,
  children,
}: {
  titleId: string;
  title: string;
  description: string;
  unsavedDescription?: string;
  dirty: boolean;
  busy: boolean;
  saveBlocked?: boolean;
  error?: string;
  onClose: () => void;
  onSave: () => Promise<boolean>;
  onDiscard: () => void;
  children: ReactNode;
}) {
  const [confirmClose, setConfirmClose] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const keepEditingButtonRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirmClose) keepEditingButtonRef.current?.focus();
    else if (wasConfirming.current) closeButtonRef.current?.focus();
    wasConfirming.current = confirmClose;
  }, [confirmClose]);
  const requestClose = () => {
    if (busy) return;
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  };

  return <ModalSurface labelId={titleId} onClose={requestClose} className="w-full max-w-3xl">
    <header className="flex items-start justify-between gap-4 border-b border-white/15 pb-4">
      <div><h2 id={titleId} className="text-xl font-semibold">{title}</h2><p className="mt-2 text-sm text-slate-300">{description}</p></div>
      <button ref={closeButtonRef} type="button" disabled={busy} onClick={requestClose} className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-200 disabled:opacity-50">Close</button>
    </header>
    {error ? <p role="alert" className="mt-4 rounded-lg border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</p> : null}
    {children}
    {confirmClose ? <section role="alertdialog" aria-labelledby={`${titleId}-unsaved`} className="mt-5 rounded-xl border border-amber-200/30 bg-amber-200/5 p-4">
      <h3 id={`${titleId}-unsaved`} className="font-semibold">Save your changes before closing?</h3>
      <p className="mt-1 text-sm text-slate-300">{unsavedDescription}</p>
      {saveBlocked ? <p className="mt-2 text-sm text-amber-100">The saved case has changed. Discard this draft to close, then reload the latest case before editing again.</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {!saveBlocked ? <button type="button" disabled={busy} onClick={async () => { const saved = await onSave(); if (!saved) setConfirmClose(false); }} className="rounded-lg bg-cyan-200 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Save changes</button> : null}
        <button type="button" disabled={busy} onClick={() => { onDiscard(); onClose(); }} className="rounded-lg border border-amber-200/30 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-50">Discard draft</button>
        <button ref={keepEditingButtonRef} type="button" disabled={busy} onClick={() => setConfirmClose(false)} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 disabled:opacity-50">Keep editing</button>
      </div>
    </section> : null}
  </ModalSurface>;
}
