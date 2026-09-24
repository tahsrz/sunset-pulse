'use client';

import React, { type ReactNode } from 'react';

export function CoordinatePlane({ children, zoom }: { children: ReactNode; zoom: number }) {
  return <div className="max-h-[72vh] min-h-[32rem] overflow-auto rounded-xl border border-white/10 bg-slate-900/40">
    <div
      aria-label="Workspace canvas"
      className="relative min-h-[50rem] min-w-[70rem] origin-top-left bg-[radial-gradient(circle,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:24px_24px]"
      style={{ zoom }}
    >
      {children}
    </div>
  </div>;
}
