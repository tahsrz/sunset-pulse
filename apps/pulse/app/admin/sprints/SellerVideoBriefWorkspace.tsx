'use client';

import { useEffect, useState } from 'react';

type Workspace = { workspace: { id: string; name: string; kind: string }; membership: { role: string } };
type BacklogItem = { id: string; title: string; status: string; revision: number };
type Brief = {
  workspace_id: string;
  brief_id: string;
  revision: number;
  created_at: string;
  brief_data: { topic: string; hook: string; script: string; reviewStatus: string; channels: string[] };
};

const inputClass = 'mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100';

export function SellerVideoBriefWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
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
  const selectedWorkspace = workspaces.find(({ workspace }) => workspace.id === workspaceId);
  const canCreateBrief = Boolean(selectedWorkspace && ['owner', 'admin', 'member'].includes(selectedWorkspace.membership.role));

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
    if (!workspaceId) { setBacklog([]); setBriefs([]); return; }
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
    ]).then(([items, saved]) => {
      if (!active) return;
      setBacklog(items.filter((item: BacklogItem) => item.status !== 'cancelled'));
      setBriefs(saved);
      setError('');
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load seller video workspace.');
    });
    return () => { active = false; };
  }, [workspaceId]);

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
        </li>)}</ul> : <p className="mt-2 text-sm text-slate-400">No saved video drafts in this workspace.</p>}
      </div>
    </section>
  );
}
