'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavigationItem = {
  href: string;
  label: string;
};

const primaryItems: NavigationItem[] = [
  { href: '/vibes', label: 'Vibe library' },
  { href: '/vibes/new', label: 'New vibe' },
  { href: '/vibes/taxonomy', label: 'Taxonomy' },
];

const vibePathPattern = /^\/admin\/vibes\/([^/]+)/;

function getVibeId(pathname: string) {
  const match = pathname.match(vibePathPattern);
  const candidate = match?.[1];
  return candidate && candidate !== 'new' && candidate !== 'taxonomy' ? candidate : null;
}

export function VibeSidebar() {
  const pathname = usePathname();
  const vibeId = getVibeId(pathname);
  const workflowItems: NavigationItem[] = vibeId
    ? [
        { href: `/vibes/${vibeId}/edit`, label: 'Editor' },
        { href: `/vibes/${vibeId}/preview`, label: 'Preview' },
        { href: `/vibes/${vibeId}/submit`, label: 'Submit for review' },
        { href: `/vibes/${vibeId}/publish`, label: 'Publish' },
        { href: `/vibes/${vibeId}/revisions`, label: 'Revisions' },
        { href: `/vibes/${vibeId}/audit`, label: 'Audit log' },
        { href: `/vibes/${vibeId}/source`, label: 'Source' },
      ]
    : [];

  return (
    <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="mx-auto max-w-7xl px-4 py-4 lg:px-5 lg:py-7">
        <Link href="/vibes" className="block">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Content management</p>
          <p className="mt-1 text-lg font-black tracking-tight text-slate-950">Vibe CMS</p>
        </Link>

        <nav aria-label="Vibe CMS navigation" className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible">
          {primaryItems.map((item) => <SidebarLink key={item.href} item={item} pathname={pathname} />)}
          {workflowItems.length > 0 ? <>
            <p className="hidden pt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400 lg:block">Current vibe</p>
            {workflowItems.map((item) => <SidebarLink key={item.href} item={item} pathname={pathname} />)}
          </> : null}
        </nav>
      </div>
    </aside>
  );
}

function SidebarLink({ item, pathname }: { item: NavigationItem; pathname: string }) {
  const active = pathname === item.href;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors lg:block ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
    >
      {item.label}
    </Link>
  );
}
