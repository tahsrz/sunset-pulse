'use client';
import Link from 'next/link';
type VibeEditorToolbarProps = { title: string; dirty: boolean; saving?: boolean; onSave: () => void; previewHref: string };
export function VibeEditorToolbar({ title, dirty, saving = false, onSave, previewHref }: VibeEditorToolbarProps) {
  return <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Editing Vibe</p><h1 className="text-2xl font-black text-slate-900">{title}</h1><p role="status" aria-live="polite" className="text-sm text-slate-500">{saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}</p></div>
    <div className="flex items-center gap-2"><Link href={previewHref} className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Preview</Link><button type="button" onClick={onSave} disabled={saving} className="rounded bg-[#2271b1] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save draft'}</button></div>
  </header>;
}
