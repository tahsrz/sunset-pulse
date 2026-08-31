'use client';

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
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Vibe taxonomy directory">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        <input aria-label="Search taxonomy terms" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search terms" className="min-w-56 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <select aria-label="Filter taxonomy group" value={group} onChange={(event) => setGroup(event.target.value)} className="rounded-md border border-slate-300 py-2 pl-3 pr-10 text-sm">
          <option value="">All groups</option>
          {groups.map((item) => <option key={item} value={item}>{groupLabel(item)}</option>)}
        </select>
      </div>
      <div className="border-b border-slate-100 p-4 text-sm text-slate-500">{visibleTerms.length} {visibleTerms.length === 1 ? 'term' : 'terms'} · usage excludes Vibes in trash</div>
      {visibleTerms.length === 0 ? <p className="p-6 text-sm text-slate-500">No taxonomy terms match this filter.</p> : <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">{visibleTerms.map((term) => <article key={term.id} className="rounded-lg border border-slate-200 p-4"><p className="font-semibold capitalize">{term.term.replace(/-/g, ' ')}</p><p className="mt-1 text-xs capitalize text-slate-500">{groupLabel(term.group)}</p><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Used by <span className="text-slate-900">{counts[term.id] || 0}</span> {counts[term.id] === 1 ? 'Vibe' : 'Vibes'}</p></article>)}</div>}
      <p className="border-t border-slate-200 p-4 text-xs text-slate-500">Terms are currently controlled by the Vibe schema. Term creation, aliases, and deletion will follow a dedicated migration design so existing Vibes cannot be orphaned.</p>
    </section>
  );
}
