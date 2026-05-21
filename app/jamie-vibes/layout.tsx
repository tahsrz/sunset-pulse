import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { SlotLoading } from '@/components/jamie-vibes/SlotShell';

export const metadata: Metadata = {
  title: 'Jamie Agentic Vibes | Sunset Pulse',
  description: 'Parallel-route dashboard for Jamie agents, vibe dictionaries, and live memory feed.'
};

export default function JamieVibesLayout({
  children,
  feed,
  vibes,
  agents
}: {
  children: React.ReactNode;
  feed: React.ReactNode;
  vibes: React.ReactNode;
  agents: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#06131d] text-slate-50">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.22),transparent_28rem),radial-gradient(circle_at_78%_18%,rgba(244,114,182,0.16),transparent_30rem),linear-gradient(135deg,#06131d_0%,#0d2531_46%,#171f38_100%)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[1fr,1fr]">
          <div className="grid gap-5">
            <Suspense fallback={<SlotLoading title="Loading Jamie feed" />}>
              {feed}
            </Suspense>
            <Suspense fallback={<SlotLoading title="Loading agent mesh" />}>
              {agents}
            </Suspense>
          </div>

          <Suspense fallback={<SlotLoading title="Loading vibe dictionary" />}>
            {vibes}
          </Suspense>
        </div>
      </section>
    </main>
  );
}
