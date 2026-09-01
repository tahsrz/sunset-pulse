'use client';
type VibeStatusView = { value: string; label: string; count: number };
export function VibeStatusViews({ views, activeValue, onChange }: { views: readonly VibeStatusView[]; activeValue: string; onChange: (value: string) => void }) {
  return <nav aria-label="Vibe status views" className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
    {views.map((view) => <button key={view.value || 'all'} type="button" aria-current={activeValue === view.value ? 'page' : undefined} onClick={() => onChange(view.value)} className={activeValue === view.value ? 'font-bold text-slate-900' : 'text-[#2271b1] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] focus-visible:ring-offset-2'}>{view.label} <span className="text-slate-500">({view.count})</span></button>)}
  </nav>;
}
