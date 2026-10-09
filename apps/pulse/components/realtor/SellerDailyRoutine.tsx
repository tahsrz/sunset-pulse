import React from 'react';
import Link from 'next/link';

export function SellerDailyRoutine() {
  return <details className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
    <summary className="cursor-pointer text-sm font-semibold text-cyan-100">Seller daily routine</summary>
    <ol className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
      <li><h3 className="font-semibold text-white">1. Review requests</h3><p className="mt-1 text-slate-400">Read new requests and their contact permission. Open an email draft when eligible, then record the contact you actually made.</p><Link href="/seller-inbox" className="mt-2 inline-flex text-cyan-200 underline">Review seller requests</Link></li>
      <li><h3 className="font-semibold text-white">2. Handle due work</h3><p className="mt-1 text-slate-400">Use Today’s overdue-action links to open the right date. Complete finished tasks and schedule the next follow-up from its saved reply or consultation.</p><Link href="/planner" className="mt-2 inline-flex text-cyan-200 underline">Open your schedule</Link></li>
      <li><h3 className="font-semibold text-white">3. Record what happened</h3><p className="mt-1 text-slate-400">Record customer replies, confirmed consultations, and closings. Choose the actual contact or reply time when logging earlier work. Record withdrawn contact permission when applicable.</p><Link href="/seller-inbox" className="mt-2 inline-flex text-cyan-200 underline">Update seller records</Link></li>
      <li><h3 className="font-semibold text-white">4. Close the business day</h3><p className="mt-1 text-slate-400">Record money received, expenses, and bill payments in Business. Keep expected income separate from received money.</p><Link href="/business" className="mt-2 inline-flex text-cyan-200 underline">Update business records</Link></li>
    </ol>
    <p className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">Weekly: use the “Weekly business review” planner template. Review recorded outcomes, upcoming dates, and missing expenses; choose one priority and next action.</p>
  </details>;
}
