import React, { type ReactNode } from 'react';
import styles from './Fieldbook.module.css';

export function FieldbookShell({ title, eyebrow, navigation, date, timeZone, children }: {
  title: string;
  eyebrow?: string;
  navigation?: ReactNode;
  date?: string;
  timeZone?: string;
  children: ReactNode;
}) {
  const parsedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T12:00:00Z') : null;
  const validDate = parsedDate && Number.isFinite(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date;
  const day = validDate ? new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(parsedDate) : null;
  return <main className={styles.surface} data-fieldbook="page">
    <div className={styles.body}>
      <div className={styles.masthead}><div className={styles.brand}>Sunset Pulse<small>FIELDBOOK</small></div>{navigation}</div>
      <header className={styles.heading}><div>{eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}<h1>{title}</h1>
        {day ? <time className={styles.date} dateTime={date}>{day}{timeZone ? ` · ${timeZone}` : ''}</time> : null}
      </div></header>
      <div className={styles.content}>{children}</div>
    </div>
  </main>;
}
