'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicationCatalog, publicationReadinessSchema, type PublicationReadinessItem, type PublicationReadinessReport } from '@/lib/marketing/publicationReadiness';

const requiredLabels = {
  identity: 'Approved public name', biography: 'Approved short biography', contact: 'Approved main-site phone or email',
  review: 'Review the completed record before publishing', evidence: 'Current evidence for at least one guide section',
};
const optionalLabels = {
  photo: 'Approved photography with captions, credits and image dimensions',
  places: 'Places linked to current guide evidence', coordinates: 'Map center and coordinates for current places',
  review: 'Review and publish the optional visual content',
};
const warningLabels = {
  expired_sections: 'Some guide sections have expired evidence and are omitted from the public guide.',
  expired_places: 'Some places have missing or expired evidence and are omitted from the public map.',
};
const statusLabels = { published: 'Published', needs_content: 'Needs Content', unavailable: 'Could Not Check' };
const statusClasses = { published: 'border-teal-200/30 text-teal-200', needs_content: 'border-amber-200/30 text-amber-200', unavailable: 'border-rose-200/30 text-rose-200' };

function ReadinessCard({ item }: { item: PublicationReadinessItem }) {
  const entry = publicationCatalog.find(record => record.key === item.key)!;
  return <article id={item.key} className="scroll-mt-8 space-y-5 rounded-2xl border border-white/15 bg-white/[0.03] p-5 sm:p-6" aria-labelledby={`title-${item.key}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={`title-${item.key}`} className="text-xl uppercase">{entry.title}</h2>
      <span className={`rounded-full border px-3 py-1 text-sm ${statusClasses[item.state]}`}>{statusLabels[item.state]}</span>
    </div>
    {item.state === 'unavailable' ? <p role="alert">The content could not be checked. Review the source files for validation or loading errors, then refresh this check. A shared guide or presentation source can affect all guide checks.</p> : <>
      {item.required.length > 0 && <div><h3 className="text-base uppercase">Required Before Publication</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-slate-200">{item.required.map(key => <li key={key}>{requiredLabels[key]}</li>)}</ul></div>}
      {item.state === 'published' && <p className="text-sm text-slate-300">{item.key === 'seller_profile' ? 'The published introduction passes the content schema.' : 'The text guide passes its existing publication checks. Photos and a map are optional.'}</p>}
      {item.optional.length > 0 && <div><h3 className="text-base uppercase">Optional Improvements</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-300">{item.optional.map(key => <li key={key}>{optionalLabels[key]}</li>)}</ul></div>}
      {item.warnings.map(key => <p key={key} className="text-sm text-amber-200">{warningLabels[key]}</p>)}
      {item.state === 'published' && <Link className="inline-flex min-h-11 items-center text-cyan-200 underline underline-offset-4" href={entry.publicHref}>View {entry.title}</Link>}
    </>}
    <details className="border-t border-white/15 pt-4">
      <summary className="cursor-pointer py-1 text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">Review {entry.title}</summary>
      <div className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
        <p>Update these repository files through a reviewed change:</p>
        <ul className="space-y-2">{entry.files.map(file => <li key={file}><code className="break-all text-slate-100">{file}</code></li>)}</ul>
        {item.key === 'seller_profile' ? <>
          <p>Use the approved main-site identity and response contact. Confirm that the phone or email matches the seller response configuration. The KCD contact is separate.</p>
          <p>The draft accepts only its version and draft status. Prepare a complete published record with displayName, biography and at least one contact method in the reviewed change. A portrait is optional.</p>
          <p>For a portrait, use a local WebP under <code>public/images/seller-profile/</code> and include alt text and dimensions.</p>
        </> : <>
          <p>Review source links and retrieval and expiry dates before publication. Do not extend evidence dates without checking the source. Keep place evidence IDs joined to this guide.</p>
          <p>Optional photos belong under <code>public/images/neighborhoods/{entry.slug}/</code>. Use approved images with alt text, captions, credits and dimensions. Set the matching presentation record to published only after review.</p>
          <p>A map needs current places with valid coordinates. A local note needs an approved author and visit date. A text guide can be published without these additions.</p>
        </>}
        <p>Run content validation and review the page at mobile and desktop widths before deploying. This check does not verify image licensing, file existence, contact routing or the accuracy of source claims.</p>
      </div>
    </details>
  </article>;
}

export default function PublicationReadiness() {
  const [report, setReport] = useState<PublicationReadinessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setReport(null);
    void (async () => {
      try {
        const response = await fetch('/api/admin/marketing/readiness', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 || response.status === 403
          ? 'Site administrator access is required to check this content.' : 'Content readiness could not be checked. Try again.');
        const parsed = publicationReadinessSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error('The readiness response is invalid. Ask the site administrator to review it.');
        if (!controller.signal.aborted) setReport(parsed.data);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Content readiness could not be checked. Try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [attempt]);
  return <section aria-label="Publication checks" aria-busy={loading} className="space-y-6">
    {loading ? <p role="status">Checking content…</p> : error ? <p role="alert">{error}</p> : report ? <>
      <p className="text-sm text-slate-400">Checked <time dateTime={report.checkedAt}>{new Date(report.checkedAt).toLocaleString()}</time>. Status applies to the content included in this version of the site.</p>
      {publicationCatalog.map(entry => <ReadinessCard key={entry.key} item={report.items.find(item => item.key === entry.key)!} />)}
    </> : null}
    <button disabled={loading} onClick={() => setAttempt(value => value + 1)} className="min-h-11 rounded-lg border border-cyan-200 px-4 py-2 text-cyan-200 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">{error ? 'Try Again' : 'Refresh Checks'}</button>
  </section>;
}
