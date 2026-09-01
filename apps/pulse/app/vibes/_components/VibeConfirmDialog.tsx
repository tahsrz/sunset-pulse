'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

type VibeConfirmDialogProps = { open: boolean; title: string; description?: ReactNode; confirmLabel: string; cancelLabel: string; busy?: boolean; onConfirm: () => void; onOpenChange: (open: boolean) => void };

export function VibeConfirmDialog({ open, title, description, confirmLabel, cancelLabel, busy = false, onConfirm, onOpenChange }: VibeConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    if (busy) return;
    onOpenChange(false);
    triggerRef.current?.focus();
  }

  return <dialog ref={dialogRef} aria-labelledby="vibe-confirm-title" onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => { if (!busy) triggerRef.current?.focus(); }} className="w-[min(32rem,calc(100vw-2rem))] rounded border border-slate-300 p-0 shadow-xl backdrop:bg-slate-900/50">
    <form method="dialog" onSubmit={(event) => event.preventDefault()} className="p-5">
      <h2 id="vibe-confirm-title" className="text-lg font-bold text-slate-900">{title}</h2>
      {description ? <div className="mt-2 text-sm text-slate-600">{description}</div> : null}
      <div className="mt-5 flex justify-end gap-2">
        <button ref={cancelRef} type="button" disabled={busy} onClick={close} className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">{cancelLabel}</button>
        <button type="button" disabled={busy} onClick={onConfirm} className="rounded bg-[#2271b1] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Working…' : confirmLabel}</button>
      </div>
    </form>
  </dialog>;
}
