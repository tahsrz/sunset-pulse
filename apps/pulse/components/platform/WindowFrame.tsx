'use client';

import React, { useRef, type PointerEvent, type ReactNode } from 'react';
import type { CanvasLayout } from '@/lib/platform/contracts/canvasLayout';

type PositionedWindow = CanvasLayout['windows'][number];

export function WindowFrame({
  item, title, onPosition, onCommitPosition, onClose, children,
}: {
  item: PositionedWindow;
  title: string;
  onPosition: (id: string, x: number, y: number) => void;
  onCommitPosition: (id: string, x: number, y: number) => void;
  onClose: (id: string) => void;
  children: ReactNode;
}) {
  const drag = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const { window: target, x, y, width, height, zIndex } = item;
  const stopDrag = (event: PointerEvent<HTMLElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    const start = drag.current;
    const nextX = Math.max(-100_000, Math.min(100_000, start.x + event.clientX - start.startX));
    const nextY = Math.max(-100_000, Math.min(100_000, start.y + event.clientY - start.startY));
    drag.current = null;
    onCommitPosition(target.id, nextX, nextY);
  };

  return <section
    id={`canvas-window-${target.id}`}
    tabIndex={-1}
    role="region"
    aria-label={`Canvas window: ${title}`}
    className="absolute flex min-h-0 flex-col overflow-hidden rounded-xl border border-cyan-200/20 bg-slate-950/95 shadow-2xl shadow-black/40"
    style={{ left: x, top: y, width, height, zIndex }}
  >
    <header
      className="flex shrink-0 touch-none items-center justify-between gap-2 border-b border-white/10 bg-slate-900 px-3 py-2"
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest('button,a')) return;
        drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x, y };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start || start.pointerId !== event.pointerId) return;
        onPosition(target.id,
          Math.max(-100_000, Math.min(100_000, start.x + event.clientX - start.startX)),
          Math.max(-100_000, Math.min(100_000, start.y + event.clientY - start.startY)));
      }}
      onPointerUp={stopDrag}
      onPointerCancel={(event) => {
        if (drag.current?.pointerId === event.pointerId) drag.current = null;
      }}
    >
      <h2 className="min-w-0 truncate text-sm font-bold text-white">{title}</h2>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" aria-label={`Move ${title} left`} onClick={() => onCommitPosition(target.id, Math.max(0, x - 40), y)} className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-white/10">←</button>
        <button type="button" aria-label={`Move ${title} right`} onClick={() => onCommitPosition(target.id, Math.min(100_000, x + 40), y)} className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-white/10">→</button>
        <button type="button" aria-label={`Move ${title} up`} onClick={() => onCommitPosition(target.id, x, Math.max(0, y - 40))} className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-white/10">↑</button>
        <button type="button" aria-label={`Move ${title} down`} onClick={() => onCommitPosition(target.id, x, Math.min(100_000, y + 40))} className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-white/10">↓</button>
        <button type="button" aria-label={`Close ${title}`} onClick={() => onClose(target.id)} className="ml-1 rounded px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-rose-300/15 hover:text-rose-100">Close</button>
      </div>
    </header>
    <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
  </section>;
}
