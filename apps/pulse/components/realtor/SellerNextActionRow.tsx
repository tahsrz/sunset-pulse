import React from 'react';
import Link from 'next/link';
import type { SellerPriority } from '@/lib/realtor-workspace/sellerPriority';
import styles from './Fieldbook.module.css';

const actions = {
  overdue: { label: 'Follow up', action: 'Open scheduled action' },
  request: { label: 'New request', action: 'Open request' },
  consultation: { label: 'Consultation', action: 'Prepare consultation' },
  reply: { label: 'Seller replied', action: 'Read reply' },
  booking: { label: 'Accepted booking', action: 'Link consultation' },
  checklist: { label: 'Preparation', action: 'Open preparation' },
};

export function SellerNextActionRow({ row, position }: { row: SellerPriority; position: number }) {
  const kind = row.id.split(':')[0];
  const { label, action } = Object.hasOwn(actions, kind)
    ? actions[kind as keyof typeof actions] : { label: 'Seller action', action: 'Open action' };
  return <article className={styles.actionRow}>
    <span className={styles.number} aria-hidden="true">{String(position).padStart(2, '0')}</span>
    <div><small>{label}</small><h4>{row.title}</h4>
      <Link href={row.href} aria-label={`${action}: ${row.title}`}>{action}</Link>
      <details><summary>Why now</summary><p>{row.reason}</p></details>
    </div>
  </article>;
}
