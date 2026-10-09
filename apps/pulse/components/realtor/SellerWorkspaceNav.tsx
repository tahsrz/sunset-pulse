import React from 'react';
import Link from 'next/link';
export function SellerWorkspaceNav({ active }: { active: string }) {
  const links = [['/today','Today'],['/seller-inbox','Inbox'],['/seller-cases','Cases'],['/planner','Planner'],['/business','Business'],['/seller-setup','Setup']];
  return <nav aria-label="Seller workspace" className="flex flex-wrap gap-2">{links.map(([href,label]) => <Link key={href} href={href} aria-current={active === href ? 'page' : undefined}
    className={`rounded-full px-4 py-2 text-sm font-semibold ${active === href ? 'bg-cyan-300 text-slate-950' : 'border border-white/15 text-slate-200 hover:bg-white/10'}`}>{label}</Link>)}<Link href="/goals" className="px-3 py-2 text-sm text-slate-400" aria-current={active === '/goals' ? 'page' : undefined}>Goals</Link></nav>;
}
