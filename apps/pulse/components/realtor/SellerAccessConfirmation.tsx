'use client';

import React from 'react';
import { SellerActionDrawer } from './SellerActionDrawer';

const buttonClass = 'rounded-lg border border-cyan-300/30 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-50';

export function SellerAccessConfirmation({
  enabled,
  verifiedEmail,
  busy,
  saveBlocked,
  error,
  onClose,
  onConfirm,
}: {
  enabled: boolean;
  verifiedEmail: string | null;
  busy: boolean;
  saveBlocked: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}) {
  const title = enabled ? 'Revoke seller access' : 'Enable verified seller access';
  return <SellerActionDrawer titleId="seller-access-title" title={title} description="Control who can view the progress update you published." dirty={false} busy={busy} saveBlocked={saveBlocked} error={error} onClose={onClose} onSave={onConfirm} onDiscard={onClose}>
    <div className="mt-5 space-y-4">
      {enabled ? <p className="text-sm text-slate-200">Revoking access stops the seller from viewing the published update. Your private case records stay available to you.</p> : <p className="text-sm text-slate-200">This enables read-only access to the published update for a signed-in, verified account matching <strong>{verifiedEmail || 'the email on this request'}</strong>. No public link or invitation is sent.</p>}
      <button type="button" className={buttonClass} disabled={busy || saveBlocked} onClick={() => void onConfirm()}>{enabled ? 'Revoke access' : 'Enable verified access'}</button>
    </div>
  </SellerActionDrawer>;
}
