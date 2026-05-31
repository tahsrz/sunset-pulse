'use client';

import { useMemo, useState } from 'react';
import { BadgeCheck, CheckCircle2, LockKeyhole, PackageCheck, ShieldCheck, XCircle } from 'lucide-react';
import { OrderPaymentStatusStrip } from './OrderPaymentStatusStrip';
import { RestrictedItemBadge } from './RestrictedItemBadge';
import {
  orderMinimumAge,
  orderRequiresVerification,
  type RestrictedCategory,
  type VerifiablePickupOrder,
} from './orderVerificationTypes';

type StaffPickupVerificationPanelProps = {
  order: VerifiablePickupOrder;
  onVerifyId?: (orderId: string) => void;
  onRelease?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
};

const inferCategory = (category?: RestrictedCategory) => category || 'none';

export function StaffPickupVerificationPanel({
  order,
  onVerifyId,
  onRelease,
  onReject,
}: StaffPickupVerificationPanelProps) {
  const [enteredCode, setEnteredCode] = useState('');
  const [idVerified, setIdVerified] = useState(Boolean(order.idVerifiedAt));
  const [released, setReleased] = useState(Boolean(order.releasedAt));
  const requiresVerification = orderRequiresVerification(order);
  const minimumAge = orderMinimumAge(order);
  const codeMatches = enteredCode.trim().toUpperCase() === order.pickupCode.toUpperCase();
  const isPaid = order.paymentState === 'paid_online' || order.paymentState === 'paid_pos';
  const canRelease = codeMatches && isPaid && !released && (!requiresVerification || idVerified);

  const restrictedItems = useMemo(
    () => order.items.filter((item) => item.ageRestricted || item.minimumAge || item.restrictedCategory),
    [order.items]
  );

  const verifyId = () => {
    setIdVerified(true);
    onVerifyId?.(order.id);
  };

  const releaseOrder = () => {
    if (!canRelease) return;
    setReleased(true);
    onRelease?.(order.id);
  };

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950 p-5 text-white">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Staff Pickup Verification</p>
          <h3 className="mt-1 text-xl font-black">#{order.id.slice(-6).toUpperCase()}</h3>
          {order.customerName && <p className="mt-1 text-sm text-slate-300">{order.customerName}</p>}
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${
          released ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100' : 'border-cyan-200/30 bg-cyan-300/10 text-cyan-100'
        }`}>
          {released ? <PackageCheck className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
          {released ? 'Released' : 'Awaiting Release'}
        </span>
      </div>

      <OrderPaymentStatusStrip
        paymentState={order.paymentState}
        paymentReference={order.paymentReference}
        totalAmount={order.totalAmount}
      />

      <div className="mt-4 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Pickup code</label>
          <input
            value={enteredCode}
            onChange={(event) => setEnteredCode(event.target.value)}
            placeholder="Enter customer code"
            className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-4 py-3 font-mono text-lg font-black text-white outline-none focus:border-cyan-200/60"
          />
          <div className={`mt-3 flex items-center gap-2 text-sm font-bold ${codeMatches ? 'text-emerald-100' : 'text-slate-400'}`}>
            {codeMatches ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {codeMatches ? 'Code matched' : 'Waiting for matching code'}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Restricted item check</p>
            {requiresVerification ? (
              <RestrictedItemBadge category={inferCategory(restrictedItems[0]?.restrictedCategory)} minimumAge={minimumAge >= 21 ? 21 : 18} />
            ) : (
              <RestrictedItemBadge />
            )}
          </div>
          {requiresVerification ? (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-slate-300">
                Verify customer ID before release. This order contains restricted item handling.
              </p>
              <button
                type="button"
                onClick={verifyId}
                disabled={idVerified}
                className="inline-flex items-center gap-2 rounded-md bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-200 disabled:opacity-60"
              >
                <ShieldCheck className="h-4 w-4" />
                {idVerified ? 'ID Verified' : 'Mark ID Verified'}
              </button>
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-300">No ID checkpoint is required for this order.</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={releaseOrder}
          disabled={!canRelease}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-400 px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <BadgeCheck className="h-4 w-4" />
          Release Order
        </button>
        <button
          type="button"
          onClick={() => onReject?.(order.id)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-300/25 bg-rose-400/10 px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-rose-100 hover:bg-rose-400/20"
        >
          <XCircle className="h-4 w-4" />
          Reject / Review
        </button>
      </div>
    </section>
  );
}
