import React from 'react';

type SlotShellProps = {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function SlotShell({ eyebrow, title, children, action }: SlotShellProps) {
  return (
    <section className="min-h-full rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_60px_rgba(2,6,23,0.22)] backdrop-blur-xl">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-[10px] font-black uppercase text-cyan-200">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SlotLoading({ title = 'Loading slot' }: { title?: string }) {
  return (
    <section className="min-h-64 rounded-lg border border-white/10 bg-white/[0.035] p-5">
      <p className="text-[10px] font-black uppercase text-slate-500">{title}</p>
      <div className="mt-5 grid gap-3">
        <div className="h-10 animate-pulse rounded bg-white/[0.08]" />
        <div className="h-24 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-16 animate-pulse rounded bg-white/[0.05]" />
      </div>
    </section>
  );
}
