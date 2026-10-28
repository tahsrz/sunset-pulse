import React from 'react';
import Link from 'next/link';
import type { SellerPriority } from '@/lib/realtor-workspace/sellerPriority';
import styles from './Fieldbook.module.css';
import focus from './SellerDailyFocus.module.css';
import { ArrowUpRight, CalendarDays, CheckSquare, Clock3, MessageCircle } from 'lucide-react';

const actions = {
  overdue: { label: 'Follow up', action: 'Open scheduled action' },
  request: { label: 'New request', action: 'Open request' },
  consultation: { label: 'Consultation', action: 'Prepare consultation' },
  reply: { label: 'Seller replied', action: 'Read reply' },
  booking: { label: 'Accepted booking', action: 'Link consultation' },
  checklist: { label: 'Preparation', action: 'Open preparation' },
};

export function SellerNextActionRow({ row, position, variant = 'list' }: { row: SellerPriority; position: number; variant?: 'list' | 'focus' | 'next' }) {
  const kind = row.id.split(':')[0];
  const { label, action } = Object.hasOwn(actions, kind)
    ? actions[kind as keyof typeof actions] : { label: 'Seller action', action: 'Open action' };
  const description = ({
    overdue: 'A scheduled follow-up is overdue.', request: 'Requested a conversation.',
    consultation: 'Review the confirmed consultation.', reply: 'A reply needs your review.',
    booking: 'Review this accepted booking.', checklist: 'Review the next preparation task.',
  } as Record<string,string>)[kind] || 'Review this action.';
  const Icon = kind === 'overdue' ? Clock3 : kind === 'consultation' || kind === 'booking' ? CalendarDays : kind === 'checklist' ? CheckSquare : MessageCircle;
  const initials = row.title.trim().split(/\s+/u).filter(Boolean).slice(0,2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase();
  if (variant !== 'list') return <article className={variant === 'focus' ? focus.focusCard : focus.nextCard} data-daily-action={variant} aria-label={`${label}: ${row.title}`}>
    <div className={focus.person}>
      <span className={focus.avatar} aria-hidden="true">{['request','consultation','overdue'].includes(kind) && initials ? initials : <Icon size={22} />}</span>
      <div className={focus.identity}><p className={focus.kind}>{label}</p><h4 className={focus.personName}>{row.title}</h4><p className={focus.description}>{description}</p></div>
    </div>
    <Link className={variant === 'focus' ? focus.primaryLink : focus.nextLink} href={row.href} aria-label={`${action}: ${row.title}`}>{action}<ArrowUpRight size={17} aria-hidden="true" /></Link>
    <details className={focus.reason}><summary>Action Details</summary><p>{row.reason}</p></details>
  </article>;
  return <article className={styles.actionRow}>
    <span className={styles.number} aria-hidden="true">{String(position).padStart(2, '0')}</span>
    <div><small>{label}</small><h4>{row.title}</h4>
      <Link href={row.href} aria-label={`${action}: ${row.title}`}>{action}</Link>
      <details><summary>Why now</summary><p>{row.reason}</p></details>
    </div>
  </article>;
}
