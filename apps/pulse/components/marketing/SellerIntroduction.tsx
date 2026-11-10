import Image from 'next/image';
import { Mail, Phone } from 'lucide-react';
import type { PublishedSellerIntroduction } from '@/lib/marketing/sellerIntroductionSchema';

import styles from '@/app/home.module.css';

export default function SellerIntroduction({ profile }: { profile: PublishedSellerIntroduction }) {
  return (
    <section className={styles.section} aria-labelledby="seller-introduction-title">
      <div className={`${styles.frame} grid gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:items-center`}>
        {profile.portrait ? <Image src={profile.portrait.src} alt={profile.portrait.alt} width={profile.portrait.width} height={profile.portrait.height} className="h-40 w-40 border border-white/15 object-cover" /> : null}
        <div>
          <p className={styles.label}>Your local contact</p>
          <h2 id="seller-introduction-title" className="mt-2 text-3xl font-bold">{profile.displayName}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{profile.biography}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {profile.phone ? <a href={`tel:${profile.phone.replace(/[^+\d]/g, '')}`} className={styles.action}><Phone size={16} />Call</a> : null}
            {profile.email ? <a href={`mailto:${profile.email}`} className={styles.action}><Mail size={16} />Email</a> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
