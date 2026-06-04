'use client';

import { useMemo } from 'react';
import Link from 'next/link';

type Props = {
  locationHint: string;
  buyerNames: string;
  propertyAddress: string;
  onOpenContracts: () => void;
  onOpenEmail: () => void;
};

export default function MlsCommandWorkspace({
  locationHint,
  buyerNames,
  propertyAddress,
  onOpenContracts,
  onOpenEmail
}: Props) {
  const draftHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('source', 'mls-workspace');
    if (buyerNames) params.set('buyers', buyerNames);
    if (propertyAddress) params.set('address', propertyAddress);
    if (locationHint) params.set('city', locationHint);
    return `/contracts/promulgated/setup?${params.toString()}`;
  }, [buyerNames, locationHint, propertyAddress]);

  return (
    <div className="mb-2 rounded-lg border border-cyan-200/20 bg-cyan-950/20 p-2.5">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200">
        MLS Command Workspace (Prototype)
      </p>
      <p className="mt-1 text-[10px] leading-4 text-slate-300">
        This dynamic layer is the migration path away from static MLS anchoring. It keeps workflow actions connected to search context.
      </p>

      <div className="mt-2 grid gap-2 md:grid-cols-3">
        <div className="rounded-md border border-white/10 bg-black/20 p-2">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Search Context</p>
          <p className="mt-1 text-[10px] text-slate-200">Location: {locationHint || 'Not set'}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-2">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Buyer Context</p>
          <p className="mt-1 text-[10px] text-slate-200">{buyerNames || 'Not set'}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-2">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Property Context</p>
          <p className="mt-1 text-[10px] text-slate-200">{propertyAddress || 'Not set'}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenContracts}
          className="rounded-md border border-emerald-200/30 bg-emerald-300/15 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100"
        >
          Send to Contracts
        </button>
        <button
          type="button"
          onClick={onOpenEmail}
          className="rounded-md border border-amber-200/30 bg-amber-300/15 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100"
        >
          Open Email Workflow
        </button>
        <Link
          href={draftHref}
          className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white"
        >
          Draft From Context
        </Link>
      </div>
    </div>
  );
}
