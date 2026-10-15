import React from 'react';
import Link from 'next/link';
import styles from './Fieldbook.module.css';
export function SellerWorkspaceNav({ active }: { active: string }) {
  const links = [['/today','Today'],['/seller-inbox','Inbox'],['/seller-cases','Cases'],['/planner','Planner'],['/business','Business'],['/seller-setup','Setup']];
  return <nav aria-label="Seller workspace" className={styles.nav}>{links.map(([href,label]) => <Link key={href} href={href} aria-current={active === href ? 'page' : undefined}>{label}</Link>)}<Link href="/goals" aria-current={active === '/goals' ? 'page' : undefined}>Goals</Link></nav>;
}
