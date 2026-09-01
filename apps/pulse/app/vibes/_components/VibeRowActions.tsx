import Link from 'next/link';
import { vibeActionClass } from './vibeUi';
type RowAction = { label: string; href?: string; onClick?: () => void; tone?: 'default' | 'danger'; disabled?: boolean };
export function VibeRowActions({ actions }: { actions: RowAction[] }) {
  return <div className="flex flex-wrap gap-x-3 gap-y-1">{actions.map((action) => action.href ? <Link key={action.label} href={action.href} className={action.tone === 'danger' ? vibeActionClass.danger : vibeActionClass.link}>{action.label}</Link> : <button key={action.label} type="button" disabled={action.disabled} onClick={action.onClick} className={action.tone === 'danger' ? vibeActionClass.danger : vibeActionClass.link}>{action.label}</button>)}</div>;
}
