'use client';

import React from 'react';
import { useEffect, useMemo, useState } from 'react';

type TaxonomyTerm = { id: string; group: string; term: string };
type TaxonomyResponse = { terms?: TaxonomyTerm[]; counts?: Record<string, number> };

function groupLabel(group: string) {
  return group.replace(/([A-Z])/g, ' $1');
}

export function TaxonomyDirectory() {
  const [terms, setTerms] = useState<TaxonomyTerm[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/vibes/taxonomy', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load taxonomy.');
        return response.json() as Promise<TaxonomyResponse>;
      })
      .then((payload) => {
        setTerms(payload.terms || []);
        setCounts(payload.counts || {});
      })
      .catch((reason: Error) => {
        if (reason.name !== 'AbortError') setError(reason.message);
      });
    return () => controller.abort();
  }, []);

  const groups = useMemo(() => Array.from(new Set((terms || []).map((term) => term.group))), [terms]);
  const visibleTerms = useMemo(() => (terms || []).filter((term) => {
    const matchesGroup = !group || term.group === group;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery || term.term.includes(normalizedQuery) || term.group.toLowerCase().includes(normalizedQuery);
    return matchesGroup && matchesQuery;
  }), [group, query, terms]);

  if (error) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>;
  if (!terms) return <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading taxonomy…</p>;

  return (
    <section className="border border-slate-200 bg-white" aria-label="Vibe taxonomy directory">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        <input aria-label="Search taxonomy terms" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search terms" className="min-w-56 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <select aria-label="Filter taxonomy group" value={group} onChange={(event) => setGroup(event.target.value)} className="rounded-md border border-slate-300 py-2 pl-3 pr-10 text-sm">
          <option value="">All groups</option>
          {groups.map((item) => <option key={item} value={item}>{groupLabel(item)}</option>)}
        </select>
      </div>
      <div className="border-b border-slate-100 p-4 text-sm text-slate-500">{visibleTerms.length} {visibleTerms.length === 1 ? 'term' : 'terms'} · usage excludes Vibes in trash</div>
      {visibleTerms.length === 0 ? <p className="p-6 text-sm text-slate-500">No taxonomy terms match this filter.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-4 py-3">Name</th><th scope="col" className="px-4 py-3">Slug</th><th scope="col" className="px-4 py-3">Group</th><th scope="col" className="px-4 py-3 text-right">Vibes</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleTerms.map((term) => <tr key={term.id} className="hover:bg-slate-50"><th scope="row" className="px-4 py-3 font-semibold capitalize text-[#2271b1]">{term.term.replace(/-/g, ' ')}</th><td className="px-4 py-3 font-mono text-xs text-slate-600">{term.term}</td><td className="px-4 py-3 capitalize text-slate-600">{groupLabel(term.group)}</td><td className="px-4 py-3 text-right font-semibold text-slate-900">{counts[term.id] || 0}</td></tr>)}</tbody></table></div>}
      <p className="border-t border-slate-200 p-4 text-xs text-slate-500">Terms are currently controlled by the Vibe schema. Term creation, aliases, and deletion will follow a dedicated migration design so existing Vibes cannot be orphaned.</p>
    </section>
  );
}
