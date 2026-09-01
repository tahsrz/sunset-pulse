import Link from 'next/link';
import type { ReactNode } from 'react';

type VibeNoticeAction =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };
type VibeNoticeProps = { tone: 'info' | 'success' | 'warning' | 'error'; children: ReactNode; action?: VibeNoticeAction; onDismiss?: () => void };

const noticeStyles = {
  info: 'border-[#72aee6] bg-[#f0f6fc] text-[#1d2327]',
  success: 'border-[#00a32a] bg-[#edfaef] text-[#1d2327]',
  warning: 'border-[#dba617] bg-[#fcf9e8] text-[#1d2327]',
  error: 'border-[#d63638] bg-[#fcf0f1] text-[#1d2327]',
} as const;

export function VibeNotice({ tone, children, action, onDismiss }: VibeNoticeProps) {
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`border-l-4 p-3 text-sm ${noticeStyles[tone]}`}>
    <div className="flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1">{children}</div>
      {action && ('href' in action ? <Link href={action.href} className="font-semibold underline">{action.label}</Link> : <button type="button" onClick={action.onClick} className="font-semibold underline">{action.label}</button>)}
      {onDismiss ? <button type="button" onClick={onDismiss} aria-label="Dismiss notice" className="font-semibold underline">Dismiss</button> : null}
    </div>
  </div>;
}
