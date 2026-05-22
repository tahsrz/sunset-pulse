'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export function TahInterceptModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') router.back();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/72 p-3 backdrop-blur-xl sm:p-6" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close TAH cartridge modal"
        onClick={() => router.back()}
      />

      <div className="relative mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-lg border border-white/10 bg-[#071013] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#06131d]/95 px-4 py-3 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">TAH Dossier</p>
            <p className="mt-1 text-xs text-slate-400">Esc closes and preserves the archive behind it.</p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/[0.12] focus:outline-none focus:ring-2 focus:ring-cyan-300"
            aria-label="Close TAH cartridge modal"
            onClick={() => router.back()}
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
