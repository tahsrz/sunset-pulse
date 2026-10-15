'use client';

import { useEffect, useRef, useState } from 'react';
import { sellerVideoTrackingLink } from '@/lib/marketing/sellerVideoTrackingLink';

type Workspace = { workspace: { id: string; name: string; kind: string }; membership: { role: string } };
type BacklogItem = { id: string; title: string; status: string; revision: number };
type Brief = {
  workspace_id: string;
  brief_id: string;
  revision: number;
  created_at: string;
  brief_data: { topic: string; hook: string; script: string; reviewStatus: string; channels: string[]; campaignKey: string };
};
type PublicationRecord = { id: string; brief_id: string; brief_revision: number; platform: string; public_url: string; published_at: string };
type PublicationOutcome = { id: string; publication_id: string; captured_at: string; views: number; engagements: number; link_clicks: number; seller_plan_requests: number; source_note: string };
type SellerAttributionData = {
  publications: Array<{ id: string; platform: string; public_url: string; published_at: string }>;
  leads: Array<{ id: string; name: string; created_at: string; status: string; request_kind: string | null }>;
  attributions: Array<{ id: string; publication_id: string; lead_id: string; evidence_note: string; created_at: string }>;
};
type OutcomeForm = { capturedAt: string; views: string; engagements: string; linkClicks: string; sellerPlanRequests: string; sourceNote: string };

const inputClass = 'mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100';
const toLocalDateTimeInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const emptyOutcomeForm = (): OutcomeForm => ({ capturedAt: '', views: '', engagements: '', linkClicks: '', sellerPlanRequests: '', sourceNote: '' });

export function SellerVideoBriefWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [publicationRecords, setPublicationRecords] = useState<PublicationRecord[]>([]);
  const [publicationOutcomes, setPublicationOutcomes] = useState<PublicationOutcome[]>([]);
  const [sellerAttributionData, setSellerAttributionData] = useState<SellerAttributionData>({ publications: [], leads: [], attributions: [] });
  const [attributionForm, setAttributionForm] = useState({ publicationId: '', leadId: '', evidenceNote: '' });
  const [attributionPending, setAttributionPending] = useState(false);
  const attributionKeys = useRef<Record<string, string>>({});
  const [backlogItemId, setBacklogItemId] = useState('');
  const [topic, setTopic] = useState('');
  const [audienceNeed, setAudienceNeed] = useState('');
  const [hook, setHook] = useState('');
  const [script, setScript] = useState('');
  const [shotList, setShotList] = useState('');
  const [channels, setChannels] = useState<string[]>(['instagram-reels']);
  const [ctaOfferKey, setCtaOfferKey] = useState('seller-plan');
  const [campaignKey, setCampaignKey] = useState('seller-education');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reviewPending, setReviewPending] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState<Record<string, string>>({});
  const reviewKeys = useRef<Record<string, string>>({});
  const [publicationForms, setPublicationForms] = useState<Record<string, { platform: string; publicUrl: string; publishedAt: string }>>({});
  const [trackingDestinations, setTrackingDestinations] = useState<Record<string, string>>({});
  const [publicationPending, setPublicationPending] = useState('');
  const publicationKeys = useRef<Record<string, string>>({});
  const [outcomeForms, setOutcomeForms] = useState<Record<string, OutcomeForm>>({});
  const [outcomePending, setOutcomePending] = useState('');
  const outcomeKeys = useRef<Record<string, string>>({});
  const updateOutcomeForm = (publicationId: string, field: keyof OutcomeForm, value: string) => {
    setOutcomeForms((current) => ({ ...current, [publicationId]: { ...emptyOutcomeForm(), ...current[publicationId], [field]: value } }));
  };
  const selectedWorkspace = workspaces.find(({ workspace }) => workspace.id === workspaceId);
  const canCreateBrief = Boolean(selectedWorkspace && ['owner', 'admin', 'member'].includes(selectedWorkspace.membership.role));
  const canRecordPublication = Boolean(selectedWorkspace && ['owner', 'admin'].includes(selectedWorkspace.membership.role));

  useEffect(() => {
    void fetch('/api/workspaces', { cache: 'no-store' }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load workspaces.');
      setWorkspaces(data.workspaces || []);
      const initialId = data.workspaces?.[0]?.workspace?.id || '';
      setWorkspaceId(initialId);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load workspaces.'));
  }, []);

  useEffect(() => {
    if (!workspaceId) { setBacklog([]); setBriefs([]); setPublicationRecords([]); setPublicationOutcomes([]); setSellerAttributionData({ publications: [], leads: [], attributions: [] }); return; }
    let active = true;
    void Promise.all([
      fetch(`/api/sprints?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: 'no-store' }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load workspace backlog.');
        return data.backlog || [];
      }),
      fetch(`/api/seller-video-briefs?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: 'no-store' }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load saved drafts.');
        return data.briefs || [];
      }),
      canRecordPublication ? fetch(`/api/seller-video-briefs/publications?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: 'no-store' }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load publication records.');
        return data.records || [];
      }) : Promise.resolve([]),
      canRecordPublication ? fetch(`/api/seller-video-briefs/outcomes?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: 'no-store' }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load publication outcome snapshots.');
        return data.outcomes || [];
      }) : Promise.resolve([]),
      canRecordPublication ? fetch(`/api/seller-video-briefs/attributions?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: 'no-store' }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load seller attribution choices.');
        return { publications: data.publications || [], leads: data.leads || [], attributions: data.attributions || [] };
      }) : Promise.resolve({ publications: [], leads: [], attributions: [] }),
    ]).then(([items, saved, records, outcomes, attributionData]) => {
      if (!active) return;
      setBacklog(items.filter((item: BacklogItem) => item.status !== 'cancelled'));
      setBriefs(saved);
      setPublicationRecords(records);
      setPublicationOutcomes(outcomes);
      setSellerAttributionData(attributionData);
      setError('');
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load seller video workspace.');
    });
    return () => { active = false; };
  }, [workspaceId, canRecordPublication]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedBacklog = backlog.find((item) => item.id === backlogItemId);
    setPending(true); setError(''); setNotice('');
    try {
      const brief = {
        schemaVersion: 1,
        briefId: crypto.randomUUID(),
        revision: 1,
        supersedesBriefId: null,
        backlogLink: selectedBacklog ? { itemId: selectedBacklog.id, expectedRevision: selectedBacklog.revision } : null,
        topic, audienceNeed, hook, script,
        shotList: shotList.split('\n').map((line) => line.trim()).filter(Boolean),
        claimEvidence: [],
        listingPermission: { status: 'not-needed', listingReference: null, evidenceReference: null },
        channels,
        ctaOfferKey,
        campaignKey,
        reviewStatus: 'draft',
        reviewedByUserId: null,
        reviewedAt: null,
        reviewNotes: null,
      };
      const response = await fetch('/api/seller-video-briefs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, brief }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save draft.');
      const refreshed = await fetch(`/api/seller-video-briefs?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: 'no-store' });
      const list = await refreshed.json();
      if (!refreshed.ok) throw new Error(list.error || 'Saved draft, but could not refresh the list.');
      setBriefs(list.briefs || []);
      setNotice('Private draft saved. It has not been reviewed, published, or sent.');
      setTopic(''); setAudienceNeed(''); setHook(''); setScript(''); setShotList(''); setBacklogItemId('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save draft.');
    } finally { setPending(false); }
  };

  const toggleChannel = (channel: string) => setChannels((current) => current.includes(channel)
    ? current.filter((item) => item !== channel)
    : [...current, channel]);

  const requestReview = async (brief: Brief) => {
    const key = `${brief.brief_id}:${brief.revision}`;
    reviewKeys.current[key] ||= crypto.randomUUID();
    setReviewPending(key); setError(''); setNotice('');
    try {
      const response = await fetch('/api/seller-video-briefs/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, briefId: brief.brief_id, revision: brief.revision, requestKey: reviewKeys.current[key] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to request human review.');
      const status = String(data.run?.status || 'ready');
      setReviewSubmitted((current) => ({ ...current, [key]: status }));
      setNotice(status === 'completed'
        ? `This exact revision already has a completed review decision (${brief.brief_id}, revision ${brief.revision}). No content was published or sent.`
        : status === 'cancelled'
          ? `This exact revision's review was rejected or cancelled. Save a new draft revision before requesting another review.`
          : `Review is ${status} for ${brief.brief_id}, revision ${brief.revision}. A reviewer will see this exact draft in the shared workspace inbox. No content was published or sent.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to request human review.');
    } finally { setReviewPending(''); }
  };

  const recordPublication = async (event: React.FormEvent<HTMLFormElement>, brief: Brief) => {
    event.preventDefault();
    const key = `${brief.brief_id}:${brief.revision}`;
    const fields = publicationForms[key] || { platform: brief.brief_data.channels[0] || '', publicUrl: '', publishedAt: '' };
    publicationKeys.current[key] ||= crypto.randomUUID();
    setPublicationPending(key); setError(''); setNotice('');
    try {
      const response = await fetch('/api/seller-video-briefs/publications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId, briefId: brief.brief_id, revision: brief.revision, platform: fields.platform,
          publicUrl: fields.publicUrl, publishedAt: new Date(fields.publishedAt).toISOString(), requestKey: publicationKeys.current[key],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to record publication. Confirm that this exact draft was approved first.');
      setPublicationRecords((current) => [data.record, ...current.filter((record) => record.id !== data.record.id)]);
      setNotice(data.reused ? 'Existing publication record confirmed.' : 'Manual publication record saved. No post was sent or published by Sunset Pulse.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to record publication.');
    } finally { setPublicationPending(''); }
  };

  const recordOutcome = async (event: React.FormEvent<HTMLFormElement>, publication: PublicationRecord) => {
    event.preventDefault();
    const fields = outcomeForms[publication.id];
    if (!fields) return;
    outcomeKeys.current[publication.id] ||= crypto.randomUUID();
    setOutcomePending(publication.id); setError(''); setNotice('');
    try {
      const response = await fetch('/api/seller-video-briefs/outcomes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId, publicationId: publication.id,
          capturedAt: new Date(fields.capturedAt).toISOString(),
          views: Number(fields.views), engagements: Number(fields.engagements), linkClicks: Number(fields.linkClicks),
          sellerPlanRequests: Number(fields.sellerPlanRequests), sourceNote: fields.sourceNote,
          requestKey: outcomeKeys.current[publication.id],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save outcome snapshot.');
      setPublicationOutcomes((current) => [data.outcome, ...current.filter((outcome) => outcome.id !== data.outcome.id)]);
      outcomeKeys.current[publication.id] = crypto.randomUUID();
      setOutcomeForms((current) => ({ ...current, [publication.id]: { ...fields, capturedAt: '', views: '', engagements: '', linkClicks: '', sellerPlanRequests: '', sourceNote: '' } }));
      setNotice(data.reused ? 'Existing outcome snapshot confirmed.' : 'Owner-entered outcome snapshot saved as immutable history.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save outcome snapshot.');
    } finally { setOutcomePending(''); }
  };

  const recordSellerAttribution = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedLeadId = attributionForm.leadId || sellerAttributionData.leads.find((lead) => !sellerAttributionData.attributions.some((item) => item.lead_id === lead.id))?.id || '';
    const publicationId = attributionForm.publicationId || sellerAttributionData.publications[0]?.id || '';
    const selectedLead = sellerAttributionData.leads.find((lead) => lead.id === selectedLeadId);
    if (!selectedLead || !publicationId) return;
    attributionKeys.current[selectedLead.id] ||= crypto.randomUUID();
    setAttributionPending(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/seller-video-briefs/attributions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, publicationId, leadId: selectedLead.id,
          evidenceNote: attributionForm.evidenceNote, requestKey: attributionKeys.current[selectedLead.id] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to record owner-reported association.');
      setSellerAttributionData((current) => ({ ...current, attributions: [data.attribution, ...current.attributions.filter((item) => item.id !== data.attribution.id)] }));
      attributionKeys.current[selectedLead.id] = crypto.randomUUID();
      setAttributionForm((current) => ({ ...current, evidenceNote: '' }));
      setNotice('Owner-reported association recorded. This does not establish that the post caused the inquiry.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to record owner-reported association.');
    } finally { setAttributionPending(false); }
  };

  return (
    <section aria-labelledby="seller-video-briefs-title" className="mt-8 rounded-3xl border border-emerald-200/20 bg-emerald-500/[.04] p-6">
      <p className="text-xs uppercase tracking-widest text-emerald-200">Seller content · private drafts</p>
      <h2 id="seller-video-briefs-title" className="mt-2 text-2xl font-black text-white">Shape a short-form video brief</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-300">Draft a seller-education video and link it to a backlog task. Save creates an immutable private revision. This does not generate market claims, publish content, or send messages.</p>

      {workspaces.length > 0 ? <label className="mt-5 block max-w-xl text-sm text-slate-300">Workspace
        <select aria-label="Seller video workspace" className={inputClass} value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>
          {workspaces.map(({ workspace, membership }) => <option key={workspace.id} value={workspace.id}>{workspace.name} · {membership.role}</option>)}
        </select>
      </label> : !error ? <p className="mt-4 text-sm text-slate-400">No accessible workspace yet. Create or join one before saving a private brief.</p> : null}

      {workspaceId && canCreateBrief ? <form onSubmit={(event) => void save(event)} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-300">Backlog task (optional)
          <select aria-label="Linked backlog task" className={inputClass} value={backlogItemId} onChange={(event) => setBacklogItemId(event.target.value)}>
            <option value="">No linked task</option>
            {backlog.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.status} · rev {item.revision}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-300">Topic<input required minLength={4} maxLength={120} className={inputClass} value={topic} onChange={(event) => setTopic(event.target.value)} /></label>
        <label className="text-sm text-slate-300">Audience need<input required minLength={8} maxLength={240} className={inputClass} value={audienceNeed} onChange={(event) => setAudienceNeed(event.target.value)} /></label>
        <label className="text-sm text-slate-300">Opening hook<input required minLength={4} maxLength={180} className={inputClass} value={hook} onChange={(event) => setHook(event.target.value)} /></label>
        <label className="text-sm text-slate-300 md:col-span-2">Script<textarea required minLength={20} maxLength={2000} rows={4} className={inputClass} value={script} onChange={(event) => setScript(event.target.value)} /></label>
        <label className="text-sm text-slate-300 md:col-span-2">Shot list · one per line<textarea required rows={3} className={inputClass} value={shotList} onChange={(event) => setShotList(event.target.value)} placeholder="A calm exterior establishing shot" /></label>
        <fieldset className="md:col-span-2"><legend className="text-sm text-slate-300">Intended channels</legend><div className="mt-2 flex flex-wrap gap-4">
          {[['tiktok', 'TikTok'], ['instagram-reels', 'Instagram Reels'], ['youtube-shorts', 'YouTube Shorts']].map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={channels.includes(value)} onChange={() => toggleChannel(value)} />{label}</label>)}
        </div></fieldset>
        <label className="text-sm text-slate-300">Call-to-action offer<select className={inputClass} value={ctaOfferKey} onChange={(event) => setCtaOfferKey(event.target.value)}><option value="seller-plan">Seller plan</option><option value="neighborhood-guides">Neighborhood guides</option><option value="market-report">Market report</option><option value="none">No offer</option></select></label>
        <label className="text-sm text-slate-300">Campaign key<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} className={inputClass} value={campaignKey} onChange={(event) => setCampaignKey(event.target.value)} /></label>
        <div className="md:col-span-2"><button disabled={pending || !channels.length} className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 disabled:opacity-50">{pending ? 'Saving…' : 'Save private draft'}</button></div>
      </form> : workspaceId ? <p className="mt-5 rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">Your workspace role can view drafts but cannot create or save them.</p> : null}

      {error && <p role="alert" className="mt-4 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="mt-4 text-sm text-emerald-200">{notice}</p>}
      <div className="mt-8"><h3 className="font-bold text-white">Saved drafts ({briefs.length})</h3>
        {briefs.length ? <ul className="mt-3 grid gap-3 md:grid-cols-2">{briefs.map((brief) => <li key={`${brief.brief_id}-${brief.revision}`} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
          <p className="text-xs uppercase tracking-widest text-emerald-200">Draft · revision {brief.revision} · {brief.brief_data.reviewStatus}</p>
          <h4 className="mt-2 font-bold text-white">{brief.brief_data.topic}</h4><p className="mt-1 text-sm text-slate-300">{brief.brief_data.hook}</p>
          <p className="mt-2 text-xs text-slate-500">{brief.brief_data.channels.join(', ')} · saved {new Date(brief.created_at).toLocaleString()}</p>
          <label className="mt-3 block text-xs text-slate-300">Optional destination for a tracked campaign link<input type="url" maxLength={2000} className={inputClass} placeholder="https://your-site.example/seller-plan" value={trackingDestinations[`${brief.brief_id}:${brief.revision}`] || ''} onChange={(event) => setTrackingDestinations((current) => ({ ...current, [`${brief.brief_id}:${brief.revision}`]: event.target.value }))} /></label>
          {trackingDestinations[`${brief.brief_id}:${brief.revision}`] ? (() => { try { const tracked = sellerVideoTrackingLink(trackingDestinations[`${brief.brief_id}:${brief.revision}`], brief.brief_data.campaignKey, brief.brief_id); return <p className="mt-2 break-all text-xs text-cyan-100">Tracked link: <a href={tracked} target="_blank" rel="noreferrer" className="underline">{tracked}</a></p>; } catch { return null; } })() : null}
          {brief.brief_data.reviewStatus === 'draft' && canCreateBrief ? <button type="button" onClick={() => void requestReview(brief)} disabled={Boolean(reviewPending) || Boolean(reviewSubmitted[`${brief.brief_id}:${brief.revision}`])} className="mt-3 rounded-lg border border-cyan-200/30 px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50">{reviewPending === `${brief.brief_id}:${brief.revision}` ? 'Requesting review…' : reviewSubmitted[`${brief.brief_id}:${brief.revision}`] ? `Review ${reviewSubmitted[`${brief.brief_id}:${brief.revision}`]}` : 'Request human review'}</button> : null}
          {canRecordPublication ? <form onSubmit={(event) => void recordPublication(event, brief)} className="mt-4 grid gap-3 border-t border-white/10 pt-4">
            <p className="text-xs text-slate-400">Record a post you already published manually. This form never publishes or sends content.</p>
            <label className="text-xs text-slate-300">Platform
              <select aria-label={`Publication platform ${brief.brief_id}`} className={inputClass} required value={publicationForms[`${brief.brief_id}:${brief.revision}`]?.platform ?? brief.brief_data.channels[0] ?? ''} onChange={(event) => setPublicationForms((current) => ({ ...current, [`${brief.brief_id}:${brief.revision}`]: { ...(current[`${brief.brief_id}:${brief.revision}`] || { platform: brief.brief_data.channels[0] || '', publicUrl: '', publishedAt: '' }), platform: event.target.value } }))}>
                {brief.brief_data.channels.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-300">Published post URL
              <input aria-label={`Published post URL ${brief.brief_id}`} type="url" required maxLength={2000} className={inputClass} placeholder="https://…" value={publicationForms[`${brief.brief_id}:${brief.revision}`]?.publicUrl ?? ''} onChange={(event) => setPublicationForms((current) => ({ ...current, [`${brief.brief_id}:${brief.revision}`]: { ...(current[`${brief.brief_id}:${brief.revision}`] || { platform: brief.brief_data.channels[0] || '', publicUrl: '', publishedAt: '' }), publicUrl: event.target.value } }))} />
            </label>
            <label className="text-xs text-slate-300">Published date and time
              <input aria-label={`Published date ${brief.brief_id}`} type="datetime-local" required className={inputClass} max={toLocalDateTimeInput(new Date())} value={publicationForms[`${brief.brief_id}:${brief.revision}`]?.publishedAt ?? ''} onChange={(event) => setPublicationForms((current) => ({ ...current, [`${brief.brief_id}:${brief.revision}`]: { ...(current[`${brief.brief_id}:${brief.revision}`] || { platform: brief.brief_data.channels[0] || '', publicUrl: '', publishedAt: '' }), publishedAt: event.target.value } }))} />
            </label>
            <button type="submit" disabled={publicationPending === `${brief.brief_id}:${brief.revision}`} className="justify-self-start rounded-lg border border-emerald-200/30 px-3 py-2 text-xs font-bold text-emerald-100 disabled:opacity-50">{publicationPending === `${brief.brief_id}:${brief.revision}` ? 'Saving…' : 'Record already-published post'}</button>
          </form> : null}
          {canRecordPublication ? publicationRecords.filter((record) => record.brief_id === brief.brief_id && record.brief_revision === brief.revision).map((record) => <div key={record.id} className="mt-3 grid gap-3 rounded-lg border border-white/10 p-3">
              <p className="text-xs text-emerald-200">Recorded on {record.platform}: <a className="underline" href={record.public_url} target="_blank" rel="noreferrer">open post</a> · {new Date(record.published_at).toLocaleString()}</p>
              <form onSubmit={(event) => void recordOutcome(event, record)} className="grid gap-2 sm:grid-cols-2">
                <p className="text-xs text-slate-400 sm:col-span-2">Add a manual analytics snapshot. Values are preserved as entered; Pulse does not fetch or infer results.</p>
                <label className="text-xs text-slate-300">Measured at<input aria-label={`Outcome capture time ${record.id}`} type="datetime-local" required className={inputClass} max={toLocalDateTimeInput(new Date())} value={outcomeForms[record.id]?.capturedAt ?? ''} onChange={(event) => updateOutcomeForm(record.id, 'capturedAt', event.target.value)} /></label>
                {([['views', 'Views'], ['engagements', 'Engagements'], ['linkClicks', 'Link clicks'], ['sellerPlanRequests', 'Seller-plan requests']] as const).map(([field, label]) => <label key={field} className="text-xs text-slate-300">{label}<input aria-label={`${label} ${record.id}`} type="number" min="0" max="1000000000" step="1" required className={inputClass} value={outcomeForms[record.id]?.[field] ?? ''} onChange={(event) => updateOutcomeForm(record.id, field, event.target.value)} /></label>)}
                <label className="text-xs text-slate-300 sm:col-span-2">Source note<input aria-label={`Outcome source note ${record.id}`} required minLength={8} maxLength={500} className={inputClass} placeholder="Entered from the platform's visible post insights" value={outcomeForms[record.id]?.sourceNote ?? ''} onChange={(event) => updateOutcomeForm(record.id, 'sourceNote', event.target.value)} /></label>
                <button type="submit" disabled={outcomePending === record.id} className="justify-self-start rounded-lg border border-cyan-200/30 px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50">{outcomePending === record.id ? 'Saving…' : 'Save measurement snapshot'}</button>
              </form>
              <ul className="grid gap-1 text-xs text-slate-300">{publicationOutcomes.filter((outcome) => outcome.publication_id === record.id).map((outcome) => <li key={outcome.id}>{new Date(outcome.captured_at).toLocaleString()}: {outcome.views.toLocaleString()} views · {outcome.engagements.toLocaleString()} engagements · {outcome.link_clicks.toLocaleString()} clicks · {outcome.seller_plan_requests.toLocaleString()} seller-plan requests — {outcome.source_note}</li>)}</ul>
          </div>) : null}
        </li>)}</ul> : <p className="mt-2 text-sm text-slate-400">No saved video drafts in this workspace.</p>}
      </div>
      {canRecordPublication ? <section aria-labelledby="seller-attribution-title" className="mt-8 rounded-2xl border border-cyan-200/20 bg-slate-950/30 p-4">
        <h3 id="seller-attribution-title" className="font-bold text-white">Connect an inquiry to a post</h3>
        <p className="mt-1 max-w-3xl text-xs text-slate-400">You select both the existing seller inquiry and a post you published. This private note records your reported association only—it is not measured causation or a public lead statistic. Contact details are not copied into this record.</p>
        {sellerAttributionData.publications.length && sellerAttributionData.leads.some((lead) => !sellerAttributionData.attributions.some((item) => item.lead_id === lead.id)) ? <form onSubmit={(event) => void recordSellerAttribution(event)} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs text-slate-300">Published post<select required aria-label="Attribution publication" className={inputClass} value={attributionForm.publicationId || sellerAttributionData.publications[0]?.id || ''} onChange={(event) => setAttributionForm((current) => ({ ...current, publicationId: event.target.value }))}>
            {sellerAttributionData.publications.map((publication) => <option key={publication.id} value={publication.id}>{publication.platform} · {new URL(publication.public_url).hostname} · {new Date(publication.published_at).toLocaleDateString()}</option>)}
          </select></label>
          <label className="text-xs text-slate-300">Seller inquiry<select required aria-label="Attribution seller inquiry" className={inputClass} value={attributionForm.leadId || sellerAttributionData.leads.find((lead) => !sellerAttributionData.attributions.some((item) => item.lead_id === lead.id))?.id || ''} onChange={(event) => setAttributionForm((current) => ({ ...current, leadId: event.target.value }))}>
            {sellerAttributionData.leads.filter((lead) => !sellerAttributionData.attributions.some((item) => item.lead_id === lead.id)).map((lead) => <option key={lead.id} value={lead.id}>{lead.name} · {lead.request_kind || 'seller request'} · {new Date(lead.created_at).toLocaleDateString()}</option>)}
          </select></label>
          <label className="text-xs text-slate-300 md:col-span-2">Why are you associating them?<textarea required minLength={12} maxLength={500} rows={2} className={inputClass} placeholder="For example, the seller said they used this post when submitting their request." value={attributionForm.evidenceNote} onChange={(event) => setAttributionForm((current) => ({ ...current, evidenceNote: event.target.value }))} /></label>
          <button type="submit" disabled={attributionPending} className="justify-self-start rounded-lg border border-cyan-200/30 px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50">{attributionPending ? 'Saving…' : 'Record owner-reported association'}</button>
        </form> : <p className="mt-3 text-xs text-slate-400">To record an association, this workspace needs at least one manually recorded publication and one unlinked seller inquiry belonging to your active site.</p>}
        <ul className="mt-4 grid gap-2 text-xs text-slate-300">{sellerAttributionData.attributions.map((item) => {
          const lead = sellerAttributionData.leads.find((candidate) => candidate.id === item.lead_id);
          const publication = sellerAttributionData.publications.find((candidate) => candidate.id === item.publication_id);
          return <li key={item.id} className="rounded-lg border border-white/10 p-3">{lead?.name || 'Seller inquiry'} ↔ {publication?.platform || 'recorded post'} · {new Date(item.created_at).toLocaleDateString()} · “{item.evidence_note}”</li>;
        })}</ul>
      </section> : null}
    </section>
  );
}
