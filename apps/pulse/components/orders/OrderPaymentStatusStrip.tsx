import { AlertTriangle, CheckCircle2, CreditCard, ReceiptText, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import type { OrderPaymentState } from './orderVerificationTypes';

type OrderPaymentStatusStripProps = {
  paymentState: OrderPaymentState;
  paymentReference?: string;
  totalAmount: number;
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const paymentCopy: Record<OrderPaymentState, { label: string; detail: string; className: string; icon: ReactNode }> = {
  paid_online: {
    label: 'Paid Online - Do Not Charge',
    detail: 'Verify pickup code and release from this screen.',
    className: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-50',
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  paid_pos: {
    label: 'Paid At Register - Do Not Charge',
    detail: 'Verifone tender is confirmed. Verify pickup code before release.',
    className: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-50',
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  pending_pos: {
    label: 'Awaiting Register Tender',
    detail: 'This order has been sent to the in-store register queue.',
    className: 'border-cyan-300/30 bg-cyan-400/10 text-cyan-50',
    icon: <CreditCard className="h-5 w-5" />,
  },
  unpaid_counter: {
    label: 'Unpaid - Collect At Counter',
    detail: 'Payment still needs to be completed in store.',
    className: 'border-sky-300/30 bg-sky-400/10 text-sky-50',
    icon: <CreditCard className="h-5 w-5" />,
  },
  partial_issue: {
    label: 'Payment Issue - Manager Review',
    detail: 'Do not release until payment is reconciled.',
    className: 'border-amber-300/35 bg-amber-400/10 text-amber-50',
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  refunded: {
    label: 'Refunded / Voided',
    detail: 'Do not release without a new paid order.',
    className: 'border-rose-300/35 bg-rose-400/10 text-rose-50',
    icon: <RotateCcw className="h-5 w-5" />,
  },
  voided: {
    label: 'Voided At Register',
    detail: 'Do not release without a new paid order.',
    className: 'border-rose-300/35 bg-rose-400/10 text-rose-50',
    icon: <RotateCcw className="h-5 w-5" />,
  },
  manual_review: {
    label: 'Manual Review Required',
    detail: 'Use the air-gap fallback process and reconcile this order.',
    className: 'border-amber-300/35 bg-amber-400/10 text-amber-50',
    icon: <AlertTriangle className="h-5 w-5" />,
  },
};

export function OrderPaymentStatusStrip({ paymentState, paymentReference, totalAmount }: OrderPaymentStatusStripProps) {
  const copy = paymentCopy[paymentState];

  return (
    <div className={`rounded-lg border p-4 ${copy.className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{copy.icon}</div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em]">{copy.label}</p>
            <p className="mt-1 text-sm opacity-80">{copy.detail}</p>
          </div>
        </div>
        <div className="rounded-md bg-black/20 px-3 py-2 text-right">
          <p className="text-lg font-black">{currency.format(totalAmount)}</p>
          {paymentReference && (
            <p className="flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] opacity-75">
              <ReceiptText className="h-3 w-3" />
              {paymentReference}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
