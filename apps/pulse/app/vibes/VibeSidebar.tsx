'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  Eye,
  FileText,
  History,
  List,
  Pencil,
  Plus,
  Send,
  Settings,
  Tags,
  Upload,
  Files,
  type LucideIcon,
} from 'lucide-react';

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const primaryItems: NavigationItem[] = [
  { href: '/vibes', label: 'All Vibes', icon: List },
  { href: '/vibes/new', label: 'Add New', icon: Plus },
  { href: '/vibes/pages', label: 'Pages', icon: Files },
  { href: '/vibes/pages/new', label: 'Add Page', icon: FileText },
  { href: '/vibes/taxonomy', label: 'Taxonomy', icon: Tags },
];

const vibePathPattern = /^\/vibes\/([^/]+)/;
const nonVibeSegments = new Set(['new', 'taxonomy', 'pages']);

function getVibeId(pathname: string) {
  const match = pathname.match(vibePathPattern);
  const candidate = match?.[1];
  return candidate && !nonVibeSegments.has(candidate) ? candidate : null;
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== '/vibes' && pathname.startsWith(`${href}/`));
}

function getWorkflowItems(vibeId: string, status: string | null): NavigationItem[] {
  const items: NavigationItem[] = [
    { href: `/vibes/${vibeId}/edit`, label: 'Edit Vibe', icon: Pencil },
    { href: `/vibes/${vibeId}/preview`, label: 'Preview', icon: Eye },
    { href: `/vibes/${vibeId}/revisions`, label: 'Revisions', icon: History },
    { href: `/vibes/${vibeId}/actions`, label: 'Status & Actions', icon: Settings },
  ];

  if (status === 'draft') items.push({ href: `/vibes/${vibeId}/submit`, label: 'Submit for Review', icon: Send });
  if (status === 'in_review') items.push({ href: `/vibes/${vibeId}/publish`, label: 'Publish', icon: Upload });

  return [
    ...items,
    { href: `/vibes/${vibeId}/audit`, label: 'Audit Log', icon: ClipboardList },
    { href: `/vibes/${vibeId}/source`, label: 'Source Details', icon: FileText },
  ];
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export function VibeSidebar() {
  const pathname = usePathname();
  const vibeId = getVibeId(pathname);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!vibeId) {
      setStatus(null);
      return;
    }

    const controller = new AbortController();
    const loadStatus = () => {
      fetch(`/api/vibes/${encodeURIComponent(vibeId)}`, { signal: controller.signal })
        .then(async (response) => (response.ok ? response.json() : null))
        .then((payload) => setStatus(typeof payload?.vibe?.status === 'string' ? payload.vibe.status : null))
        .catch((error: unknown) => {
          if (!(error instanceof Error) || error.name !== 'AbortError') {
            setStatus(null);
          }
        });
    };
    loadStatus();
    window.addEventListener('vibe-status-changed', loadStatus);

    return () => {
      controller.abort();
      window.removeEventListener('vibe-status-changed', loadStatus);
    };
  }, [vibeId]);

  const workflowItems = vibeId ? getWorkflowItems(vibeId, status) : [];

  return (
    <aside className="border-b border-[#3c434a] bg-[#1d2327] text-[#f0f0f1] lg:sticky lg:top-10 lg:h-[calc(100vh-2.5rem)] lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
      <details className="px-2 py-2 lg:hidden">
        <summary className="cursor-pointer rounded px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset">Vibes menu</summary>
        <nav aria-label="Vibe CMS mobile navigation" className="mt-1 space-y-1">
          {primaryItems.map((item) => <SidebarLink key={item.href} item={item} pathname={pathname} />)}
          {workflowItems.map((item) => <SidebarLink key={item.href} item={item} pathname={pathname} nested />)}
        </nav>
      </details>
      <nav aria-label="Vibe CMS navigation" className="hidden lg:block lg:space-y-0 lg:px-0 lg:py-3">
        {primaryItems.map((item) => <SidebarLink key={item.href} item={item} pathname={pathname} />)}
        {workflowItems.length > 0 ? <>
          <div className="px-3 pb-2 pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a7aaad]">Current Vibe</p>
            {status ? <p className="mt-1 text-xs font-semibold capitalize text-[#72aee6]">{statusLabel(status)}</p> : null}
          </div>
          {workflowItems.map((item) => <SidebarLink key={item.href} item={item} pathname={pathname} nested />)}
        </> : null}
      </nav>
    </aside>
  );
}

function SidebarLink({ item, pathname, nested = false }: { item: NavigationItem; pathname: string; nested?: boolean }) {
  const active = isActivePath(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-8 shrink-0 items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset lg:w-full lg:rounded-none ${nested ? 'pl-8 text-[13px]' : ''} ${active ? 'bg-[#2271b1] text-white' : 'text-[#f0f0f1] hover:bg-[#2c3338] hover:text-white'}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
      {item.label}
    </Link>
  );
}
