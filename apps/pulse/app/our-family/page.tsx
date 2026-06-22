import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { HeartHandshake, MessageCircle, ShoppingBasket, UsersRound } from 'lucide-react';
import AnimalOfDaySection from '@/components/animals/AnimalOfDaySection';
import SunsetHistorySection from '@/components/marketing/SunsetHistorySection';

export const metadata: Metadata = {
  title: 'Our Family | Sunset Pulse',
  description: 'The community roots, local history, and family-side features of Sunset Pulse.',
};

export default function OurFamilyPage() {
  return (
    <>
      <section className="bg-[#06131d] px-4 py-16 text-white md:px-8 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-amber-100">
              <HeartHandshake className="h-4 w-4" />
              Our Family
            </div>
            <h1 className="mt-7 text-5xl font-black uppercase italic tracking-tight text-white md:text-7xl">
              The people side of Sunset Pulse
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-teal-50/70">
              Local history, the Sunset Gas & Grill anchor, community stories, and the daily nature spotlight are grouped here so the homepage can stay focused on property discovery.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <FamilyLink href="/grill" label="Grill" detail="Menu and local anchor">
              <ShoppingBasket className="h-5 w-5" />
            </FamilyLink>
            <FamilyLink href="/sunset-chat" label="Chat" detail="Community conversation">
              <MessageCircle className="h-5 w-5" />
            </FamilyLink>
            <FamilyLink href="/contact" label="Contact" detail="Reach the team">
              <UsersRound className="h-5 w-5" />
            </FamilyLink>
          </div>
        </div>
      </section>

      <div className="waterlily-surface">
        <SunsetHistorySection />
        <AnimalOfDaySection />
      </div>
    </>
  );
}

function FamilyLink({
  children,
  detail,
  href,
  label,
}: {
  children: ReactNode;
  detail: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-white/10 bg-white/[0.055] p-5 text-left transition hover:border-amber-200/30 hover:bg-amber-200/10"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-amber-200/12 text-amber-100">
        {children}
      </div>
      <p className="text-sm font-black uppercase tracking-[0.16em] text-white">{label}</p>
      <p className="mt-2 text-xs leading-5 text-teal-50/55">{detail}</p>
    </Link>
  );
}
