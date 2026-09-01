'use client';
import type { ReactNode } from 'react';
type Action = '' | 'archive' | 'trash';
export function VibeListToolbar({ position, selectedCount, action, onActionChange, onApply, busy = false, search, onSearchChange, children }: { position: 'top' | 'bottom'; selectedCount: number; action: Action; onActionChange: (action: Action) => void; onApply: () => void; busy?: boolean; search?: string; onSearchChange?: (value: string) => void; children?: ReactNode }) {
  return <div className={`flex flex-wrap items-center gap-3 p-4 ${position === 'bottom' ? 'border-t border-slate-200' : ''}`}>
    {selectedCount > 0 ? <><label className="sr-only" htmlFor={`${position}-bulk-action`}>Bulk actions</label><select id={`${position}-bulk-action`} value={action} onChange={(event) => onActionChange(event.target.value as Action)} className="rounded border border-slate-300 px-3 py-2 text-sm"><option value="">Bulk actions</option><option value="archive">Archive</option><option value="trash">Move to trash</option></select><button type="button" disabled={!action || busy} onClick={onApply} className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Apply</button><span className="text-sm text-slate-500">{selectedCount} selected</span></> : null}
    {children}
    {onSearchChange ? <input aria-label="Search vibes" value={search || ''} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search title or slug" className="min-w-0 w-full rounded border border-slate-300 px-3 py-2 text-sm sm:w-64 sm:flex-none" /> : null}
  </div>;
}
