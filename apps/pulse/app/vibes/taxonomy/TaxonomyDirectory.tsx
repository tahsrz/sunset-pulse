'use client';

import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type TaxonomyTerm = { id: string; group: string; term: string; label?: string; description?: string; status?: 'active' | 'archived'; parentId?: string };
type TaxonomyGroup = { slug: string; label: string; hierarchical: boolean; status?: 'active' | 'archived' };
type TaxonomyResponse = { terms?: TaxonomyTerm[]; groups?: TaxonomyGroup[]; counts?: Record<string, number>; capabilities?: { manageTerms?: boolean } };

function groupLabel(group: string) {
  return group.replace(/([A-Z])/g, ' $1');
}

export function TaxonomyDirectory() {
  const [terms, setTerms] = useState<TaxonomyTerm[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState('active');
  const [error, setError] = useState('');
  const [manageTerms, setManageTerms] = useState(false);
  const [taxonomyGroups, setTaxonomyGroups] = useState<TaxonomyGroup[]>([]);
  const [newGroup, setNewGroup] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newParentTerm, setNewParentTerm] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingLabel, setEditingLabel] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [updating, setUpdating] = useState(false);
  const [archivingId, setArchivingId] = useState('');
  const [lastArchivedTerm, setLastArchivedTerm] = useState<TaxonomyTerm | null>(null);
  const [newTaxonomyLabel, setNewTaxonomyLabel] = useState('');
  const [newTaxonomySlug, setNewTaxonomySlug] = useState('');
  const [newTaxonomyHierarchical, setNewTaxonomyHierarchical] = useState(false);
  const [editingGroupSlug, setEditingGroupSlug] = useState('');
  const [editingGroupLabel, setEditingGroupLabel] = useState('');
  const [archivingGroupSlug, setArchivingGroupSlug] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/vibes/taxonomy?includeArchived=1', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load taxonomy.');
        return response.json() as Promise<TaxonomyResponse>;
      })
      .then((payload) => {
        setTerms(payload.terms || []);
        setCounts(payload.counts || {});
        setManageTerms(Boolean(payload.capabilities?.manageTerms));
        setTaxonomyGroups(payload.groups || []);
      })
      .catch((reason: Error) => {
        if (reason.name !== 'AbortError') setError(reason.message);
      });
    return () => controller.abort();
  }, []);

  const groups = useMemo(() => taxonomyGroups.length > 0 ? taxonomyGroups.filter(({ status: groupStatus }) => (groupStatus || 'active') === 'active').map(({ slug }) => slug) : Array.from(new Set((terms || []).map((term) => term.group))), [taxonomyGroups, terms]);
  const taxonomyGroupLabels = useMemo(() => new Map(taxonomyGroups.map(({ slug, label }) => [slug, label])), [taxonomyGroups]);
  const termLabels = useMemo(() => new Map((terms || []).map((term) => [term.id, term.label || term.term.replace(/-/g, ' ')])), [terms]);
  const visibleTerms = useMemo(() => (terms || []).filter((term) => {
    const matchesGroup = !group || term.group === group;
    const matchesStatus = status === 'all' || (term.status || 'active') === status;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery
      || term.term.includes(normalizedQuery)
      || term.label?.toLowerCase().includes(normalizedQuery)
      || term.description?.toLowerCase().includes(normalizedQuery)
      || term.group.toLowerCase().includes(normalizedQuery);
    return matchesGroup && matchesStatus && matchesQuery;
  }), [group, query, status, terms]);

  async function createTerm() {
    setCreating(true);
    setCreateError('');
    try {
      const response = await fetch('/api/vibes/taxonomy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ group: newGroup, term: newSlug, label: newLabel, ...(newDescription.trim() ? { description: newDescription.trim() } : {}), ...(newParentTerm ? { parentTerm: newParentTerm } : {}) }) });
      const responseText = await response.text();
      const payload = responseText ? JSON.parse(responseText) : {};
      if (!response.ok) throw new Error(payload.error || 'Unable to create taxonomy term.');
      setTerms((current) => [...(current || []), payload.term]);
      setNewLabel('');
      setNewSlug('');
      setNewParentTerm('');
      setNewDescription('');
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : 'Unable to create taxonomy term.');
    } finally {
      setCreating(false);
    }
  }

  async function createTaxonomyGroup() {
    setCreating(true);
    setCreateError('');
    try {
      const response = await fetch('/api/vibes/taxonomy/groups', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug: newTaxonomySlug, label: newTaxonomyLabel, hierarchical: newTaxonomyHierarchical }) });
      const responseText = await response.text();
      const payload = responseText ? JSON.parse(responseText) : {};
      if (!response.ok) throw new Error(payload.error || 'Unable to create taxonomy.');
      setTaxonomyGroups((current) => [...current, payload.group]);
      setNewGroup(payload.group.slug);
      setNewTaxonomyLabel('');
      setNewTaxonomySlug('');
      setNewTaxonomyHierarchical(false);
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : 'Unable to create taxonomy.');
    } finally {
      setCreating(false);
    }
  }

  async function updateTaxonomyGroupLabel() {
    setUpdating(true);
    setCreateError('');
    try {
      const response = await fetch('/api/vibes/taxonomy/groups', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug: editingGroupSlug, label: editingGroupLabel }) });
      const responseText = await response.text();
      const payload = responseText ? JSON.parse(responseText) : {};
      if (!response.ok) throw new Error(payload.error || 'Unable to update taxonomy.');
      setTaxonomyGroups((current) => current.map((groupItem) => groupItem.slug === editingGroupSlug ? payload.group : groupItem));
      setEditingGroupSlug('');
      setEditingGroupLabel('');
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : 'Unable to update taxonomy.');
    } finally {
      setUpdating(false);
    }
  }

  async function setTaxonomyGroupStatus(taxonomyGroup: TaxonomyGroup, nextStatus: 'active' | 'archived') {
    setUpdating(true);
    setCreateError('');
    try {
      const response = await fetch('/api/vibes/taxonomy/groups', { method: nextStatus === 'archived' ? 'DELETE' : 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug: taxonomyGroup.slug }) });
      const responseText = await response.text();
      const payload = responseText ? JSON.parse(responseText) : {};
      if (!response.ok) throw new Error(payload.error || `Unable to ${nextStatus === 'archived' ? 'archive' : 'restore'} taxonomy.`);
      setTaxonomyGroups((current) => current.map((groupItem) => groupItem.slug === taxonomyGroup.slug ? payload.group : groupItem));
      if (group === taxonomyGroup.slug && nextStatus === 'archived') setGroup('');
      setArchivingGroupSlug('');
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : 'Unable to update taxonomy status.');
    } finally {
      setUpdating(false);
    }
  }

  async function updateLabel(term: TaxonomyTerm) {
    setUpdating(true);
    setCreateError('');
    try {
      const response = await fetch('/api/vibes/taxonomy', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ group: term.group, term: term.term, label: editingLabel, description: editingDescription.trim() }) });
      const responseText = await response.text();
      const payload = responseText ? JSON.parse(responseText) : {};
      if (!response.ok) throw new Error(payload.error || 'Unable to update taxonomy term.');
      setTerms((current) => (current || []).map((item) => item.id === term.id ? payload.term : item));
      setEditingId('');
      setEditingLabel('');
      setEditingDescription('');
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : 'Unable to update taxonomy term.');
    } finally {
      setUpdating(false);
    }
  }

  async function archiveTerm(term: TaxonomyTerm) {
    setUpdating(true);
    setCreateError('');
    try {
      const response = await fetch('/api/vibes/taxonomy', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ group: term.group, term: term.term }) });
      const responseText = await response.text();
      const payload = responseText ? JSON.parse(responseText) : {};
      if (!response.ok) throw new Error(payload.error || 'Unable to archive taxonomy term.');
      setTerms((current) => (current || []).filter((item) => item.id !== term.id));
      setLastArchivedTerm(term);
      setArchivingId('');
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : 'Unable to archive taxonomy term.');
    } finally {
      setUpdating(false);
    }
  }

  async function restoreTerm(termToRestore: TaxonomyTerm) {
    setUpdating(true);
    setCreateError('');
    try {
      const response = await fetch('/api/vibes/taxonomy', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ group: termToRestore.group, term: termToRestore.term }) });
      const responseText = await response.text();
      const payload = responseText ? JSON.parse(responseText) : {};
      if (!response.ok) throw new Error(payload.error || 'Unable to restore taxonomy term.');
      setTerms((current) => {
        const existing = current || [];
        return existing.some((item) => item.id === termToRestore.id)
          ? existing.map((item) => item.id === termToRestore.id ? payload.term : item)
          : [...existing, payload.term];
      });
      setLastArchivedTerm(null);
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : 'Unable to restore taxonomy term.');
    } finally {
      setUpdating(false);
    }
  }

  if (error) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>;
  if (!terms) return <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading taxonomy…</p>;

  const selectedGroupDefinition = taxonomyGroups.find(({ slug }) => slug === newGroup);
  const availableParents = terms.filter((term) => term.group === newGroup && (term.status || 'active') === 'active');
  const taxonomyGroupRows = taxonomyGroups.map((taxonomyGroup) => ({
    ...taxonomyGroup,
    activeTerms: terms.filter((term) => term.group === taxonomyGroup.slug && (term.status || 'active') === 'active').length,
    archivedTerms: terms.filter((term) => term.group === taxonomyGroup.slug && term.status === 'archived').length,
  }));

  return (
    <section className="border border-slate-200 bg-white" aria-label="Vibe taxonomy directory">
      {lastArchivedTerm ? <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span><strong>{lastArchivedTerm.label || lastArchivedTerm.term}</strong> was archived.</span><button type="button" disabled={updating} onClick={() => void restoreTerm(lastArchivedTerm)} className="font-bold text-[#2271b1] disabled:opacity-50">Undo archive</button></div> : null}
      {manageTerms ? <details className="border-b border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-bold text-[#2271b1]">Add taxonomy</summary><form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end" onSubmit={(event) => { event.preventDefault(); void createTaxonomyGroup(); }}><label className="text-xs font-bold uppercase text-slate-500">Name<input required value={newTaxonomyLabel} onChange={(event) => { setNewTaxonomyLabel(event.target.value); if (!newTaxonomySlug) setNewTaxonomySlug(event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label><label className="text-xs font-bold uppercase text-slate-500">Slug<input required pattern="[a-z][a-z0-9-]*" value={newTaxonomySlug} onChange={(event) => setNewTaxonomySlug(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm font-normal normal-case" /></label><label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={newTaxonomyHierarchical} onChange={(event) => setNewTaxonomyHierarchical(event.target.checked)} />Hierarchical</label><button disabled={creating} className="rounded bg-[#2271b1] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Add taxonomy</button></form></details> : null}
      {manageTerms && taxonomyGroupRows.length > 0 ? <div className="border-b border-slate-200"><div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Taxonomies</h2><span className="text-xs text-slate-500">{taxonomyGroupRows.length} groups</span></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-y border-slate-200 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-4 py-2">Name</th><th scope="col" className="px-4 py-2">Slug</th><th scope="col" className="px-4 py-2">Type</th><th scope="col" className="px-4 py-2">Status</th><th scope="col" className="px-4 py-2 text-right">Active</th><th scope="col" className="px-4 py-2 text-right">Archived</th><th scope="col" className="px-4 py-2 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{taxonomyGroupRows.map((taxonomyGroup) => <tr key={taxonomyGroup.slug}><th scope="row" className="px-4 py-2">{editingGroupSlug === taxonomyGroup.slug ? <input aria-label={`Name for taxonomy ${taxonomyGroup.slug}`} required value={editingGroupLabel} onChange={(event) => setEditingGroupLabel(event.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" /> : <button type="button" disabled={taxonomyGroup.status === 'archived'} onClick={() => setGroup(taxonomyGroup.slug)} className="font-semibold text-[#2271b1] hover:underline disabled:text-slate-500 disabled:no-underline">{taxonomyGroup.label}</button>}</th><td className="px-4 py-2 font-mono text-xs text-slate-600">{taxonomyGroup.slug}</td><td className="px-4 py-2 text-slate-600">{taxonomyGroup.hierarchical ? 'Hierarchical' : 'Flat'}</td><td className="px-4 py-2 capitalize text-slate-600">{taxonomyGroup.status || 'active'}</td><td className="px-4 py-2 text-right font-semibold">{taxonomyGroup.activeTerms}</td><td className="px-4 py-2 text-right font-semibold">{taxonomyGroup.archivedTerms}</td><td className="px-4 py-2 text-right">{taxonomyGroup.status === 'archived' ? <button type="button" disabled={updating} onClick={() => void setTaxonomyGroupStatus(taxonomyGroup, 'active')} className="font-semibold text-[#2271b1] disabled:opacity-50">Restore</button> : editingGroupSlug === taxonomyGroup.slug ? <span className="inline-flex gap-2"><button type="button" disabled={updating || !editingGroupLabel.trim()} onClick={() => void updateTaxonomyGroupLabel()} className="font-semibold text-[#2271b1] disabled:opacity-50">Save</button><button type="button" disabled={updating} onClick={() => { setEditingGroupSlug(''); setEditingGroupLabel(''); }} className="text-slate-500">Cancel</button></span> : archivingGroupSlug === taxonomyGroup.slug ? <span className="inline-flex gap-2"><button type="button" disabled={updating} onClick={() => void setTaxonomyGroupStatus(taxonomyGroup, 'archived')} className="font-semibold text-red-700 disabled:opacity-50">Confirm archive</button><button type="button" disabled={updating} onClick={() => setArchivingGroupSlug('')} className="text-slate-500">Cancel</button></span> : <span className="inline-flex gap-3"><button type="button" onClick={() => { setEditingGroupSlug(taxonomyGroup.slug); setEditingGroupLabel(taxonomyGroup.label); }} className="font-semibold text-[#2271b1]">Edit</button><button type="button" disabled={taxonomyGroup.activeTerms + taxonomyGroup.archivedTerms > 0} title={taxonomyGroup.activeTerms + taxonomyGroup.archivedTerms > 0 ? 'Archive all terms before archiving this taxonomy.' : undefined} onClick={() => setArchivingGroupSlug(taxonomyGroup.slug)} className="font-semibold text-red-700 disabled:cursor-not-allowed disabled:text-slate-400">Archive</button></span>}</td></tr>)}</tbody></table></div></div> : null}
      {manageTerms ? <form className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end" onSubmit={(event) => { event.preventDefault(); void createTerm(); }}><label className="text-xs font-bold uppercase text-slate-500">Name<input required value={newLabel} onChange={(event) => { setNewLabel(event.target.value); if (!newSlug) setNewSlug(event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case" /></label><label className="text-xs font-bold uppercase text-slate-500">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={newSlug} onChange={(event) => setNewSlug(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-normal normal-case" /></label><label className="text-xs font-bold uppercase text-slate-500">Group<select required value={newGroup} onChange={(event) => { setNewGroup(event.target.value); setNewParentTerm(''); }} className="mt-1 w-full rounded border border-slate-300 bg-white py-2 pl-3 pr-10 text-sm font-normal normal-case"><option value="">Select group</option>{groups.map((item) => <option key={item} value={item}>{taxonomyGroupLabels.get(item) || groupLabel(item)}</option>)}</select></label>{selectedGroupDefinition?.hierarchical ? <label className="text-xs font-bold uppercase text-slate-500">Parent<select aria-label="Parent term" value={newParentTerm} onChange={(event) => setNewParentTerm(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white py-2 pl-3 pr-10 text-sm font-normal normal-case"><option value="">None</option>{availableParents.map((term) => <option key={term.id} value={term.term}>{term.label || term.term.replace(/-/g, ' ')}</option>)}</select></label> : <div className="hidden sm:block" />}<button disabled={creating} className="rounded bg-[#2271b1] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{creating ? 'Adding…' : 'Add New Term'}</button><label className="text-xs font-bold uppercase text-slate-500 sm:col-span-4">Description <span className="font-normal normal-case">(optional)</span><textarea value={newDescription} maxLength={240} onChange={(event) => setNewDescription(event.target.value)} className="mt-1 min-h-16 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case" /></label>{createError ? <p role="alert" className="text-sm text-red-700 sm:col-span-5">{createError}</p> : null}</form> : null}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        <input aria-label="Search taxonomy terms" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search terms" className="min-w-56 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <select aria-label="Filter taxonomy group" value={group} onChange={(event) => setGroup(event.target.value)} className="rounded-md border border-slate-300 py-2 pl-3 pr-10 text-sm">
          <option value="">All groups</option>
          {groups.map((item) => <option key={item} value={item}>{taxonomyGroupLabels.get(item) || groupLabel(item)}</option>)}
        </select>
        {manageTerms ? <select aria-label="Filter taxonomy status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-slate-300 py-2 pl-3 pr-10 text-sm"><option value="active">Active</option><option value="archived">Archived</option><option value="all">All statuses</option></select> : null}
      </div>
      <div className="border-b border-slate-100 p-4 text-sm text-slate-500">{visibleTerms.length} {visibleTerms.length === 1 ? 'term' : 'terms'} · usage excludes Vibes in trash</div>
      {visibleTerms.some((term) => Boolean(counts[term.id])) ? <nav aria-label="Browse Vibes by taxonomy term" className="flex flex-wrap gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3 text-sm">{visibleTerms.filter((term) => Boolean(counts[term.id])).map((term) => <Link key={term.id} className="font-semibold text-[#2271b1] hover:underline" href={`/vibes?taxonomyTerm=${encodeURIComponent(term.id)}`} aria-label={`View ${counts[term.id]} Vibes assigned to ${term.label || term.term.replace(/-/g, ' ')}`}>{term.label || term.term.replace(/-/g, ' ')} ({counts[term.id]})</Link>)}</nav> : null}
      {visibleTerms.length === 0 ? <p className="p-6 text-sm text-slate-500">No taxonomy terms match this filter.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-4 py-3">Name</th><th scope="col" className="px-4 py-3">Slug</th><th scope="col" className="px-4 py-3">Group</th><th scope="col" className="px-4 py-3">Parent</th>{manageTerms ? <th scope="col" className="px-4 py-3">Status</th> : null}<th scope="col" className="px-4 py-3 text-right">Vibes</th>{manageTerms ? <th scope="col" className="px-4 py-3 text-right">Actions</th> : null}</tr></thead><tbody className="divide-y divide-slate-100">{visibleTerms.map((term) => <tr key={term.id} className="hover:bg-slate-50"><th scope="row" className="px-4 py-3 font-semibold text-[#2271b1]">{editingId === term.id ? <span className="block space-y-2"><input aria-label={`Name for ${term.term}`} required value={editingLabel} onChange={(event) => setEditingLabel(event.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900" /><textarea aria-label={`Description for ${term.term}`} value={editingDescription} maxLength={240} onChange={(event) => setEditingDescription(event.target.value)} className="min-h-16 w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-900" /></span> : <span>{term.label || term.term.replace(/-/g, ' ')}{term.description ? <span className="mt-1 block max-w-md text-xs font-normal text-slate-500">{term.description}</span> : null}</span>}</th><td className="px-4 py-3 font-mono text-xs text-slate-600">{term.term}</td><td className="px-4 py-3 capitalize text-slate-600">{taxonomyGroupLabels.get(term.group) || groupLabel(term.group)}</td><td className="px-4 py-3 text-slate-600">{term.parentId ? termLabels.get(term.parentId) || term.parentId : '—'}</td>{manageTerms ? <td className="px-4 py-3 capitalize text-slate-600">{term.status || 'active'}</td> : null}<td className="px-4 py-3 text-right font-semibold text-slate-900">{counts[term.id] || 0}</td>{manageTerms ? <td className="px-4 py-3 text-right">{term.status === 'archived' ? <button type="button" disabled={updating} onClick={() => void restoreTerm(term)} className="font-semibold text-[#2271b1] disabled:opacity-50">Restore</button> : editingId === term.id ? <span className="inline-flex gap-2"><button type="button" disabled={updating || !editingLabel.trim()} onClick={() => void updateLabel(term)} className="font-semibold text-[#2271b1] disabled:opacity-50">Save</button><button type="button" disabled={updating} onClick={() => { setEditingId(''); setEditingLabel(''); setEditingDescription(''); }} className="text-slate-500">Cancel</button></span> : archivingId === term.id ? <span className="inline-flex gap-2"><button type="button" disabled={updating} onClick={() => void archiveTerm(term)} className="font-semibold text-red-700 disabled:opacity-50">Confirm archive</button><button type="button" disabled={updating} onClick={() => setArchivingId('')} className="text-slate-500">Cancel</button></span> : <span className="inline-flex gap-3"><button type="button" onClick={() => { setEditingId(term.id); setEditingLabel(term.label || term.term.replace(/-/g, ' ')); setEditingDescription(term.description || ''); }} className="font-semibold text-[#2271b1]">Edit</button><button type="button" onClick={() => setArchivingId(term.id)} className="font-semibold text-red-700">Archive</button></span>}</td> : null}</tr>)}</tbody></table></div>}
      <p className="border-t border-slate-200 p-4 text-xs text-slate-500">
        {manageTerms
          ? 'New terms are added to the normalized catalog. Existing terms remain stable so assigned Vibes and revision history keep their IDs.'
          : 'Terms are currently controlled by the Vibe schema. Management becomes available after the normalized catalog is selected as the read authority.'}
      </p>
    </section>
  );
}
