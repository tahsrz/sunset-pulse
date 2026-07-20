'use client';

import dynamic from 'next/dynamic';
import type { PublicGuideContext } from '@/lib/ai/publicGuideContract';

const JamieGuideWorkspace = dynamic(
  () => import('@/components/chat/JamieGuideWorkspace').then((module) => module.JamieGuideWorkspace),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[min(760px,82vh)] min-h-[580px] items-center justify-center rounded-lg border border-white/10 bg-[#091019] text-sm font-bold text-slate-400"
        role="status"
      >
        Opening Jamie's guide...
      </div>
    ),
  },
);

export function JamieGuideLoader({
  featuredPrompt,
  initialContext,
}: {
  featuredPrompt?: string;
  initialContext?: PublicGuideContext | null;
}) {
  return <JamieGuideWorkspace featuredPrompt={featuredPrompt} initialContext={initialContext} />;
}
