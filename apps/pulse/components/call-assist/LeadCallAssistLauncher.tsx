'use client';

import Link from 'next/link';
import { PhoneCall } from 'lucide-react';
import { buildCallAssistLeadHref } from '@/lib/call-assist/leadPrefill';
import type { Lead } from '@/lib/types';

export default function LeadCallAssistLauncher({
  compact = false,
  lead,
}: {
  compact?: boolean;
  lead: Partial<Lead> & { id?: string; stage?: string };
}) {
  const href = buildCallAssistLeadHref(lead, {
    streamUrl: process.env.NEXT_PUBLIC_CALL_ASSIST_MEDIA_STREAM_WSS,
  });

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/18 ${
        compact ? 'px-3 py-2 text-[9px]' : 'px-4 py-3 text-[10px]'
      }`}
    >
      <PhoneCall className="h-3.5 w-3.5" />
      Assisted Call
    </Link>
  );
}
