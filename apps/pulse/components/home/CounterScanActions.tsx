import styles from '@/app/home.module.css';
import Link from 'next/link';
import { Compass, DatabaseZap, ShoppingBasket } from 'lucide-react';

export default function CounterScanActions({ showLeadOperations }: { showLeadOperations: boolean }) {
  return (
    <section className={styles.section} aria-label="Sunset Grill and Explorer">
      <div className={styles.frame}>
        <div className={`${styles.panel} grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-8`}>
          <div className="min-w-0">
            <p className={styles.label}> Scanned from Sunset?</p>
            <h2 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">Order Food or Open the Explorer</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Start a grill pickup order or explore the Sunset Pulse map.</p>
          </div>
          <div className={`grid gap-3 ${showLeadOperations ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <Link href="/grill" className={`${styles.action} ${styles.primary}`}><ShoppingBasket size={17} /> Order Food</Link>
            <Link href="/explorer" className={styles.action}><Compass size={17} /> Explorer</Link>
            {showLeadOperations ? <Link href="/admin/research-desk" className={styles.action}><DatabaseZap size={17} /> Lead Operations</Link> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
