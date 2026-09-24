'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { appRoutes, routeAccessLabels, searchAppRoutes } from '@/lib/navigation/routeCatalog';

const groups = [...new Set(appRoutes.map((route) => route.group))];

export function CommandRouteDirectory() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const routes = searchAppRoutes(query).filter((route) => !group || route.group === group);
  return (
    <details className="my-4 min-w-0 rounded-lg border border-cyan-200/20 bg-[#0d1c27] text-slate-100">
      <summary className="cursor-pointer px-4 py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">
        Browse all app paths · {appRoutes.length} routes
      </summary>
      <div className="border-t border-white/10 p-4">
        <p className="mb-3 text-sm text-slate-300">Search a feature or URL. Access labels describe entry requirements, not permission grants. Existing sign-in, role, and workflow checks still apply; public screens may have protected actions.</p>
        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
          <label className="min-w-0 text-sm">Search app paths
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder="Try /vibes, kitchen, contracts…" className="mt-1 min-h-11 w-full rounded border border-slate-500 bg-slate-950 px-3 text-white" />
          </label>
          <label className="min-w-0 text-sm">Route section
            <select value={group} onChange={(event) => setGroup(event.target.value)} className="mt-1 block min-h-11 w-full rounded border border-slate-500 bg-slate-950 py-2 pl-3 pr-10 text-white">
              <option value="">All sections</option>
              {groups.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        </div>
        <p role="status" className="mb-3 text-sm text-slate-400">{routes.length} matching routes</p>
        <nav aria-label="Application route directory" className="max-h-[32rem] overflow-y-auto">
          {groups.map((name) => {
            const entries = routes.filter((route) => route.group === name);
            if (!entries.length) return null;
            return <section key={name} className="mb-5">
              <h2 className="mb-2 font-semibold text-cyan-100">{name}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {entries.map((route) => <li key={route.path} className="min-w-0 rounded border border-white/10 p-3">
                  <p className="font-semibold">{route.label}</p>
                  <code className="block break-all text-xs text-cyan-200">{route.path}</code>
                  <p className="mt-1 text-xs text-slate-300">{routeAccessLabels[route.access]}</p>
                  {route.note ? <p className="mt-1 text-sm text-slate-400">{route.note}</p> : null}
                  {route.href ? (
                    route.kind === 'resource' && route.href === route.path
                      ? <a href={route.href} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-cyan-100 underline">Open resource<span className="sr-only">: {route.label}</span></a>
                      : <Link prefetch={false} href={route.href} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-cyan-100 underline underline-offset-4">
                          {route.kind === 'context' || route.href !== route.path ? 'Open entry workflow' : 'Open route'}
                          <span className="sr-only">: {route.label}</span>
                        </Link>
                  ) : <p className="mt-2 text-xs text-amber-200">Requires an existing workflow link</p>}
                </li>)}
              </ul>
            </section>;
          })}
          {!routes.length ? <p>No matching paths. Try a different feature or URL.</p> : null}
        </nav>
      </div>
    </details>
  );
}
