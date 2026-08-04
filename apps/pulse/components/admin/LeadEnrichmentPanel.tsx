'use client';

import React, { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Globe2,
  Loader2,
  ScanSearch,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  LEAD_INTEL_FIELD_LABELS,
  type InternalLead,
  type LeadIntelEvidence,
  type LeadIntelField,
} from '@/lib/lead-generation/internalLeadSystem';

type LeadEnrichmentPanelProps = {
  lead: InternalLead;
  onReload: () => Promise<void>;
};

const sourceTypes = [
  { value: 'tax_record', label: 'Tax record' },
  { value: 'brokerage', label: 'Brokerage' },
  { value: 'regional_site', label: 'Regional site' },
  { value: 'business_profile', label: 'Business profile' },
  { value: 'other', label: 'Other public source' },
] as const;

export default function LeadEnrichmentPanel({ lead, onReload }: LeadEnrichmentPanelProps) {
  const [url, setUrl] = useState('');
  const [sourceType, setSourceType] = useState<(typeof sourceTypes)[number]['value']>('tax_record');
  const [isCrawling, setIsCrawling] = useState(false);
  const [error, setError] = useState('');

  const submitCrawl = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCrawling(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/leads/${lead.id}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, sourceType }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Public-source capture failed.');
      setUrl('');
      await onReload();
    } catch (crawlError) {
      setError(crawlError instanceof Error ? crawlError.message : 'Public-source capture failed.');
    } finally {
      setIsCrawling(false);
    }
  };

  return (
    <section className="border-t border-emerald-300/20 bg-emerald-300/[0.035] px-5 py-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <div className="flex items-center gap-2 text-emerald-100">
            <ScanSearch size={17} />
            <h3 className="text-xs font-black uppercase tracking-[0.16em]">Public Source Enrichment</h3>
          </div>
          <form className="mt-4 space-y-3" onSubmit={submitCrawl}>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Approved source URL</span>
              <div className="flex border border-white/10 bg-black/25 focus-within:border-emerald-300/60">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center text-zinc-500"><Globe2 size={15} /></span>
                <input
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  required
                  placeholder="https://county-records.example/property/..."
                  className="h-10 min-w-0 flex-1 bg-transparent pr-3 text-xs text-white outline-none placeholder:text-zinc-700"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Source type</span>
              <select value={sourceType} onChange={(event) => setSourceType(event.target.value as typeof sourceType)} className="h-10 w-full border border-white/10 bg-zinc-950 px-3 text-xs text-white outline-none focus:border-emerald-300/60">
                {sourceTypes.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
              </select>
            </label>
            <button type="submit" disabled={isCrawling || !url.trim()} className="inline-flex w-full items-center justify-center gap-2 bg-emerald-400 px-3 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-50">
              {isCrawling ? <Loader2 size={15} className="animate-spin" /> : <ScanSearch size={15} />}
              Capture Evidence
            </button>
          </form>
          <p className="mt-3 flex gap-2 text-[11px] leading-5 text-zinc-500"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-200" />Only server-approved public domains are accepted. Captured values remain suggestions until reviewed.</p>
          {error ? <p className="mt-3 border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-xs text-rose-100">{error}</p> : null}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Evidence history</p>
          {lead.intelligenceEvidence.length ? (
            <div className="mt-3 space-y-3">
              {lead.intelligenceEvidence.map((evidence) => (
                <EvidenceReview key={evidence.id} leadId={lead.id} evidence={evidence} onReload={onReload} />
              ))}
            </div>
          ) : (
            <div className="mt-3 border border-dashed border-white/10 px-4 py-8 text-center text-xs text-zinc-600">No public-source evidence captured yet.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function EvidenceReview({ leadId, evidence, onReload }: { leadId: string; evidence: LeadIntelEvidence; onReload: () => Promise<void> }) {
  const [selected, setSelected] = useState<LeadIntelField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const isPending = evidence.review_status === 'pending';

  const toggleField = (field: LeadIntelField) => {
    setSelected((current) => current.includes(field) ? current.filter((item) => item !== field) : [...current, field]);
  };

  const review = async (action: 'apply_fields' | 'dismiss') => {
    setIsSaving(true);
    setError('');
    try {
      const fields = evidence.suggestions
        .filter((suggestion) => selected.includes(suggestion.field))
        .map((suggestion) => ({ field: suggestion.field, value: suggestion.proposedValue }));
      const response = await fetch(`/api/admin/leads/${leadId}/enrich`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'dismiss' ? { action, evidenceId: evidence.id } : { action, evidenceId: evidence.id, fields }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Evidence review failed.');
      await onReload();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Evidence review failed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article className="border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <EvidenceStatus evidence={evidence} />
            <span className="text-[10px] text-zinc-600">{formatCapturedAt(evidence.captured_at)}</span>
          </div>
          <a href={evidence.source_url} target="_blank" rel="noreferrer" className="mt-2 flex min-w-0 items-center gap-1.5 text-xs font-bold text-cyan-100 hover:text-cyan-50">
            <span className="truncate">{evidence.title || evidence.source_host}</span><ExternalLink size={12} className="shrink-0" />
          </a>
          <p className="mt-1 truncate text-[10px] text-zinc-600">{evidence.source_host} · {evidence.source_type.replace(/_/g, ' ')}</p>
        </div>
        {evidence.review_status !== 'pending' ? <span className="border border-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-400">{evidence.review_status}</span> : null}
      </div>

      {evidence.crawl_status !== 'completed' ? (
        <p className="mt-3 flex gap-2 border-l-2 border-amber-300/50 pl-3 text-xs leading-5 text-amber-100"><AlertTriangle size={14} className="mt-0.5 shrink-0" />The source snapshot was recorded, but structured extraction did not complete.</p>
      ) : evidence.suggestions.length ? (
        <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
          {evidence.suggestions.map((suggestion) => {
            const checked = selected.includes(suggestion.field);
            return (
              <label key={suggestion.field} className={`grid cursor-pointer gap-2 px-2 py-3 text-xs transition sm:grid-cols-[22px_110px_minmax(0,1fr)] ${isPending ? 'hover:bg-white/[0.035]' : 'cursor-default opacity-65'}`}>
                <input type="checkbox" checked={checked} onChange={() => toggleField(suggestion.field)} disabled={!isPending || isSaving} className="mt-0.5 h-4 w-4 accent-emerald-400" />
                <span className="font-black text-zinc-400">{LEAD_INTEL_FIELD_LABELS[suggestion.field]}</span>
                <span className="min-w-0"><span className="break-words text-zinc-600 line-through">{suggestion.currentValue || 'Empty'}</span><span className="mx-2 text-zinc-700">→</span><span className="break-words font-bold text-emerald-100">{suggestion.proposedValue}</span><span className="mt-1 block text-[9px] uppercase tracking-[0.1em] text-zinc-600">{suggestion.sourceLabel}</span></span>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-zinc-500">Snapshot captured. No clearly labeled lead fields were proposed.</p>
      )}

      {isPending ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={isSaving || selected.length === 0} onClick={() => void review('apply_fields')} className="inline-flex items-center gap-1.5 bg-emerald-400 px-3 py-2 text-[10px] font-black uppercase tracking-[0.11em] text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-40">{isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}Apply Selected</button>
          <button type="button" disabled={isSaving} onClick={() => void review('dismiss')} className="inline-flex items-center gap-1.5 border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.11em] text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"><X size={13} />Dismiss</button>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-xs text-rose-200">{error}</p> : null}
    </article>
  );
}

function EvidenceStatus({ evidence }: { evidence: LeadIntelEvidence }) {
  const completed = evidence.crawl_status === 'completed';
  return <span className={`border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${completed ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-amber-300/30 bg-amber-300/10 text-amber-100'}`}>{completed ? 'Captured' : evidence.crawl_status}</span>;
}

function formatCapturedAt(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : value;
}
