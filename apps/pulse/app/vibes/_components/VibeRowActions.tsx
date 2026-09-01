import Link from 'next/link';
type RowAction = { label: string; href?: string; onClick?: () => void; tone?: 'default' | 'danger'; disabled?: boolean };
export function VibeRowActions({ actions }: { actions: RowAction[] }) {
  return <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">{actions.map((action) => action.href ? <Link key={action.label} href={action.href} className={action.tone === 'danger' ? 'text-[#b32d2e] hover:underline' : 'text-[#2271b1] hover:underline'}>{action.label}</Link> : <button key={action.label} type="button" disabled={action.disabled} onClick={action.onClick} className={action.tone === 'danger' ? 'text-[#b32d2e] hover:underline disabled:opacity-50' : 'text-[#2271b1] hover:underline disabled:opacity-50'}>{action.label}</button>)}</div>;
}
