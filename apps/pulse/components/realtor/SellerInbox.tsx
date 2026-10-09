'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { ownedSellerLeadPageSchema, type OwnedSellerLead } from '@/lib/realtor-workspace/leadContracts';
import { SellerInboxLead } from './SellerInboxLead';

export function SellerInbox({ timeZone, leadId }: { timeZone: string; leadId?: string }) {
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([null]);
  const cursor = cursorHistory[cursorHistory.length - 1];
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{
    query: string; leads?: OwnedSellerLead[]; nextCursor?: string | null; error?: string;
  } | null>(null);
  const query = new URLSearchParams({ limit: '25', ...(leadId ? { leadId } : {}), ...(cursor ? { cursor } : {}) }).toString();
  const current = result?.query === query ? result : null;

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/realtor/leads?${query}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body?.ok) throw new Error(body?.error || 'Seller requests could not be loaded.');
        const page = ownedSellerLeadPageSchema.safeParse(body.result);
        if (!page.success) throw new Error('Seller requests could not be read. Try again.');
        if (!controller.signal.aborted) setResult({ query, ...page.data });
      }).catch((reason) => {
        if (!controller.signal.aborted) setResult({ query, error: reason instanceof Error ? reason.message : 'Seller requests could not be loaded.' });
      });
    return () => controller.abort();
  }, [query, reload]);

  const refresh = () => { setResult(null); setReload((value) => value + 1); };
  return <section aria-label="Your seller requests" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-400">Your website’s seller requests, newest first. Closed and archived requests remain visible in history.</p>
      <button type="button" onClick={refresh} className="rounded-lg border border-white/15 px-3 py-2 text-sm">Refresh seller requests</button>
    </div>
    {leadId ? <Link href="/seller-inbox" className="inline-flex text-sm text-cyan-200">Show all seller requests →</Link> : null}
    {current?.error ? <div role="alert" className="rounded-xl border border-rose-300/30 p-4 text-sm text-rose-100">
      Seller requests could not be loaded. {current.error}
      <button type="button" onClick={refresh} className="ml-3 underline">Retry seller requests</button>
    </div> : !current?.leads ? <p role="status" className="text-sm text-slate-400">Loading seller requests…</p>
      : current.leads.length ? <div className="space-y-4">{current.leads.map((lead) =>
        <SellerInboxLead key={`${lead.id}:${reload}`} lead={lead} timeZone={timeZone} />)}</div>
        : <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
          {leadId ? 'This seller request is unavailable to your workspace.' : cursor ? 'No more seller requests on this page.' : 'No seller requests are available for your active websites.'}
        </p>}
    <div className="flex flex-wrap gap-3">
      {current?.nextCursor ? <button type="button" onClick={() => setCursorHistory((history) => [...history, current.nextCursor || null])}
        className="rounded-lg border border-white/15 px-4 py-2 text-sm">Load older seller requests</button> : null}
      {cursor ? <><button type="button" onClick={() => setCursorHistory((history) => history.slice(0, -1))} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Previous seller requests page</button>
        <button type="button" onClick={() => setCursorHistory([null])} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Back to newest requests</button></> : null}
    </div>
    <p className="text-xs text-slate-500">Opening an email draft or scheduling a task does not record contact. Record only actions and replies that actually occurred.</p>
  </section>;
}
