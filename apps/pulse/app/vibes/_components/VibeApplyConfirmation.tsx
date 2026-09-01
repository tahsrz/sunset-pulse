'use client';

import { VibeConfirmDialog } from './VibeConfirmDialog';

type VibeApplyConfirmationProps = {
  open: boolean;
  siteId: string;
  vibeId: string;
  revisionId: string;
  busy?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export function VibeApplyConfirmation({ open, siteId, vibeId, revisionId, busy, onConfirm, onOpenChange }: VibeApplyConfirmationProps) {
  return <VibeConfirmDialog
    open={open}
    title="Apply this published revision?"
    description={<>This will move site <span className="font-mono">{siteId}</span> to revision <span className="font-mono">{revisionId}</span> from Vibe <span className="font-mono">{vibeId}</span>. Verify the current pointer before confirming.</>}
    confirmLabel="Apply revision"
    cancelLabel="Cancel"
    busy={busy}
    onConfirm={onConfirm}
    onOpenChange={onOpenChange}
  />;
}
