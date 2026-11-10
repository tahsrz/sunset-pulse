import React from 'react';
import Link from 'next/link';
import styles from './Fieldbook.module.css';
export function SellerWorkspaceNav({ active, showBuyerInbox = false }: { active: string; showBuyerInbox?: boolean }) {
  const links = [['/today','Today'],['/seller-inbox','Inbox'],['/seller-cases','Cases'],['/planner','Planner'],['/consultations','Consultations'],['/business','Business'],['/seller-setup','Setup']];
  if (showBuyerInbox) links.splice(2, 0, ['/buyer-inbox', 'Buyer Inbox']);
  return <nav aria-label="Seller workspace" className={styles.nav}>{links.map(([href,label]) => <Link key={href} href={href} prefetch={href === '/buyer-inbox' ? false : undefined} aria-current={active === href ? 'page' : undefined}>{label}</Link>)}<Link href="/goals" aria-current={active === '/goals' ? 'page' : undefined}>Goals</Link></nav>;
}
