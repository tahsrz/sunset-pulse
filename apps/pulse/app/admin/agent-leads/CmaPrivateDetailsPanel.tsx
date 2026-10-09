'use client';

import React, { useState, type FormEvent } from 'react';
import CmaReviewPanel from './CmaReviewPanel';

type CmaDetails = {
  propertyAddress: string;
  consentCapturedAt: string;
  expiresAt: string;
};

export default function CmaPrivateDetailsPanel({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<CmaDetails | null>(null);
  const [address, setAddress] = useState('');
  const [sellerPermissionConfirmed, setSellerPermissionConfirmed] = useState(false);
  const [feedback, setFeedback] = useState('');

  const endpoint = `/api/admin/agent-leads/${encodeURIComponent(leadId)}/cma-details`;

  async function revealDetails() {
    setOpen(true);
    setFeedback('');
    if (loaded) return;
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'Private CMA details are unavailable.');
      const found = result.details as CmaDetails | null;
      setDetails(found);
      setAddress(found?.propertyAddress || '');
      setLoaded(true);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Private CMA details are unavailable.');
    } finally {
      setLoading(false);
    }
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sellerPermissionConfirmed) return;
    setSaving(true);
    setFeedback('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ propertyAddress: address, sellerPermissionConfirmed: true }),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'Private CMA details could not be saved.');
      const now = new Date().toISOString();
      setDetails({ propertyAddress: address.trim(), consentCapturedAt: result.details.consentCapturedAt || now, expiresAt: result.details.expiresAt });
      setLoaded(true);
      setSellerPermissionConfirmed(false);
      setFeedback('Private CMA address saved. It will be deleted after the displayed expiry.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Private CMA details could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteDetails() {
    if (!window.confirm('Permanently delete the private CMA address for this request?')) return;
    setSaving(true);
    setFeedback('');
    try {
      const response = await fetch(endpoint, { method: 'DELETE', cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'Private CMA details could not be removed.');
      setDetails(null);
      setAddress('');
      setFeedback('Private CMA address deleted.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Private CMA details could not be removed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4" aria-labelledby={`cma-private-${leadId}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id={`cma-private-${leadId}`} className="text-xs font-black uppercase tracking-[0.14em] text-amber-100">Pricing review requested</h3>
          <p className="mt-1 text-xs text-slate-400">Property addresses are stored separately and are owner-scoped.</p>
        </div>
        <button type="button" onClick={open ? () => setOpen(false) : revealDetails} aria-expanded={open} className="rounded-xl border border-amber-200/20 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-200/10">
          {open ? 'Hide private details' : 'Open private details'}
        </button>
      </div>

      {open ? (
        <div className="mt-4 border-t border-white/10 pt-4">
          {loading ? <p role="status" className="text-sm text-slate-300">Loading private details…</p> : null}
          {!loading && details ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Property address · private</p>
              <p className="mt-2 break-words text-base font-bold text-white">{details.propertyAddress}</p>
              <p className="mt-2 text-xs text-slate-400">Seller permission recorded {new Date(details.consentCapturedAt).toLocaleDateString()}. Scheduled deletion {new Date(details.expiresAt).toLocaleDateString()}.</p>
              <button type="button" disabled={saving} onClick={deleteDetails} className="mt-3 rounded-lg border border-rose-300/20 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-300/10 disabled:opacity-50">Delete private address</button>
              <CmaReviewPanel leadId={leadId} />
            </div>
          ) : null}
          {!loading && loaded && !details ? (
            <form onSubmit={saveDetails} className="space-y-3">
              <label className="block text-xs font-bold text-slate-200">Seller-provided property address
                <input autoComplete="street-address" required minLength={6} maxLength={240} value={address} onChange={(event) => setAddress(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white focus:border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200/20" />
              </label>
              <label className="flex items-start gap-3 text-xs leading-5 text-slate-300">
                <input type="checkbox" checked={sellerPermissionConfirmed} onChange={(event) => setSellerPermissionConfirmed(event.target.checked)} className="mt-1 size-4 accent-amber-300" />
                <span>I confirmed directly with the seller that they authorize recording this address for a CMA review, with automatic deletion after 90 days.</span>
              </label>
              <button type="submit" disabled={saving || !sellerPermissionConfirmed} className="rounded-xl bg-amber-200 px-4 py-2 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving…' : 'Save private address'}</button>
            </form>
          ) : null}
          <p role="status" aria-live="polite" className="mt-3 text-xs text-amber-100">{feedback}</p>
        </div>
      ) : null}
    </section>
  );
}
