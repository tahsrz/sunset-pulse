import { Clock3, QrCode, ShieldCheck } from 'lucide-react';
import { OrderPaymentStatusStrip } from './OrderPaymentStatusStrip';
import { RestrictedItemBadge } from './RestrictedItemBadge';
import { orderMinimumAge, orderRequiresVerification, type VerifiablePickupOrder } from './orderVerificationTypes';

type PickupClaimCardProps = {
  order: VerifiablePickupOrder;
  pickupWindow?: string;
};

export function PickupClaimCard({ order, pickupWindow = 'Pickup at the counter when your order is ready.' }: PickupClaimCardProps) {
  const requiresVerification = orderRequiresVerification(order);
  const minimumAge = orderMinimumAge(order);

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/80 p-5 text-white shadow-2xl shadow-black/30">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Pickup Order</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">#{order.id.slice(-6).toUpperCase()}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
            <Clock3 className="h-4 w-4 text-slate-500" />
            {pickupWindow}
          </p>
        </div>
        <div className="rounded-lg border border-cyan-200/25 bg-cyan-300/10 p-4 text-center">
          <QrCode className="mx-auto mb-2 h-10 w-10 text-cyan-100" />
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">Pickup Code</p>
          <p className="mt-1 font-mono text-3xl font-black text-white">{order.pickupCode}</p>
        </div>
      </div>

      <OrderPaymentStatusStrip
        paymentState={order.paymentState}
        paymentReference={order.paymentReference}
        totalAmount={order.totalAmount}
      />

      {requiresVerification && (
        <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-400/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-100" />
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-50">ID verification required at pickup</p>
              <p className="mt-1 text-sm leading-6 text-amber-100/80">
                Restricted items require valid ID before staff can release this paid order.
              </p>
              <div className="mt-3">
                <RestrictedItemBadge category="tobacco" minimumAge={minimumAge >= 21 ? 21 : 18} />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
