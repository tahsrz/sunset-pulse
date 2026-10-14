import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Clock, ListChecks, MessageCircle } from 'lucide-react';
import type { SellerPriority } from '@/lib/realtor-workspace/sellerPriority';

const actions = {
  overdue: { label: 'Follow up', action: 'Open scheduled action', Icon: Clock },
  request: { label: 'New request', action: 'Open request', Icon: MessageCircle },
  consultation: { label: 'Consultation', action: 'Prepare consultation', Icon: CalendarDays },
  reply: { label: 'Seller replied', action: 'Read reply', Icon: MessageCircle },
  booking: { label: 'Accepted booking', action: 'Link consultation', Icon: CalendarDays },
  checklist: { label: 'Preparation', action: 'Open preparation', Icon: ListChecks },
};

export function SellerNextActionCard({ row, featured = false }: { row: SellerPriority; featured?: boolean }) {
  const kind = row.id.split(':')[0];
  const { label, action, Icon } = Object.hasOwn(actions, kind)
    ? actions[kind as keyof typeof actions]
    : { label: 'Seller action', action: 'Open action', Icon: ListChecks };
  const initials = row.title.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0] || '').join('').toLocaleUpperCase() || '?';

  return <article className={`flex h-full flex-col rounded-2xl border p-4 sm:p-5 ${featured ? 'border-cyan-300/30 bg-cyan-300/[0.07]' : 'border-white/10 bg-white/[0.03]'}`}>
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-slate-100">{initials}</span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs text-slate-300"><Icon aria-hidden="true" size={14} />{label}</p>
        <h4 className={`mt-1 break-words font-semibold text-white ${featured ? 'text-xl' : 'text-base'}`}>{row.title}</h4>
      </div>
    </div>
    <Link href={row.href} aria-label={`${action}: ${row.title}`} className={`mt-5 inline-flex min-h-11 items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 ${featured ? 'bg-cyan-200 text-slate-950 hover:bg-cyan-100' : 'bg-white/10 text-white hover:bg-white/15'}`}>
      {action}<ArrowUpRight aria-hidden="true" size={18} />
    </Link>
    <details className="mt-3 text-xs text-slate-300">
      <summary className="min-h-11 cursor-pointer py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">Why now</summary>
      <p className="mt-2 break-words leading-relaxed">{row.reason}</p>
    </details>
  </article>;
}
