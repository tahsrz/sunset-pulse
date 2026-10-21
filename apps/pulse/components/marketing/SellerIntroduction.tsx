import Image from 'next/image';
import { Mail, Phone } from 'lucide-react';
import type { PublishedSellerIntroduction } from '@/lib/marketing/sellerIntroductionSchema';

export default function SellerIntroduction({ profile }: { profile: PublishedSellerIntroduction }) {
  return (
    <section className="waterlily-section px-4 py-12 text-white sm:px-6 sm:py-16" aria-labelledby="seller-introduction-title">
      <div className="mx-auto grid max-w-6xl gap-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-9 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
        {profile.portrait ? <Image src={profile.portrait.src} alt={profile.portrait.alt} width={profile.portrait.width} height={profile.portrait.height} className="h-40 w-40 rounded-2xl object-cover" /> : null}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-200">Your local contact</p>
          <h2 id="seller-introduction-title" className="mt-2 text-3xl font-bold">{profile.displayName}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{profile.biography}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {profile.phone ? <a href={`tel:${profile.phone.replace(/[^+\d]/g, '')}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold text-white"><Phone size={16} />Call</a> : null}
            {profile.email ? <a href={`mailto:${profile.email}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold text-white"><Mail size={16} />Email</a> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
