'use client';
import { FieldbookShell } from './FieldbookShell';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { sellerCaseResultSchema, sellerMilestones, sellerMilestoneLabels, sellerServiceActionSchema, type SellerCaseResult, type SellerServiceAction } from '@/lib/realtor-workspace/sellerServiceContract';
import { SellerWorkspaceNav } from './SellerWorkspaceNav';
import { SellerLeadScheduleDialog } from './SellerLeadScheduleDialog';
import { SellerJourney } from './SellerJourney';
import { SellerActionDrawer, type SellerCaseActionView } from './SellerActionDrawer';
import { SellerConversationComposer } from './SellerConversationComposer';
import { SellerAppointmentStep } from './SellerAppointmentStep';
import { SellerProgressPublisher } from './SellerProgressPublisher';
import { orderSellerMessages, sellerConversationStatus } from '@/lib/realtor-workspace/sellerConversation';

const inputClass = 'mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-sm';
const buttonClass = 'rounded-lg border border-cyan-300/30 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-50';
type Draft = { propertyId: string | null; notes: string; documents: Array<{ label: string; url: string }>; checklist: Array<{ id: string; title: string; done: boolean }> };
const emptyDraft: Draft = { propertyId: null, notes: '', documents: [], checklist: [] };
type ActionFields = SellerServiceAction extends infer T ? T extends SellerServiceAction ? Omit<T,'leadId' | 'expectedRevision' | 'requestKey'> : never : never;
type MilestoneDraft = { milestone: typeof sellerMilestones[number]; occurredOn: string; evidence: string };
const emptyMilestoneDraft: MilestoneDraft = { milestone: 'consultation_held', occurredOn: '', evidence: '' };
export function SellerCaseWorkspace({ leadId }: { leadId: string }) {
  const [data, setData] = useState<SellerCaseResult | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false); const [needsReload, setNeedsReload] = useState(false);
  const [properties, setProperties] = useState<Array<{ id: string; label: string; status: string }>>([]);
  const [propertyError, setPropertyError] = useState('');
  const [schedule, setSchedule] = useState<{ id: string; startsAt: string } | null>(null);
  const [actionView, setActionView] = useState<SellerCaseActionView>({ kind: 'closed' });
  const [milestoneDraft, setMilestoneDraft] = useState<MilestoneDraft>(emptyMilestoneDraft);
  const retries = useRef(new Map<string,string>()); const scheduleRetries = useRef(new Map<string,string>());
  const inflight = useRef(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`/api/realtor/seller-service?leadId=${encodeURIComponent(leadId)}`, { cache: 'no-store', signal });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(response.status === 401 ? 'Sign in to open your seller cases.' : body.error || 'Unable to load this case.');
    const value = sellerCaseResultSchema.parse(body.result); if (signal?.aborted) return false;
    setData(value); setDraft(value.case ? { propertyId: value.case.property_id, notes: value.case.notes, documents: value.case.documents, checklist: value.case.checklist } : emptyDraft);
    setNeedsReload(false); return true;
  }, [leadId]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch((reason) => { if (!controller.signal.aborted) setError(reason.message); });
    void fetch('/api/realtor/planner/properties', { cache: 'no-store', signal: controller.signal }).then(async (response) => {
      const body = await response.json(); if (!response.ok || !body.ok) throw new Error(); if (!controller.signal.aborted) setProperties(body.result.properties);
    }).catch(() => { if (!controller.signal.aborted) setPropertyError('Property choices are unavailable. You can keep the existing property and retry after planner setup.'); });
    return () => controller.abort();
  }, [load]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(data?.case ? { propertyId: data.case.property_id, notes: data.case.notes, documents: data.case.documents, checklist: data.case.checklist } : emptyDraft);
  const disabled = busy || needsReload; const otherDisabled = disabled || dirty;
  const act = async (fields: ActionFields): Promise<boolean> => {
    if (!data || inflight.current || needsReload) return false;
    const base = { ...fields, leadId, expectedRevision: data.case?.revision || 1 };
    const fingerprint = JSON.stringify(base); const requestKey = retries.current.get(fingerprint) || crypto.randomUUID(); retries.current.set(fingerprint,requestKey);
    const parsed = sellerServiceActionSchema.safeParse({ ...base, requestKey });
    if (!parsed.success) { setError('Check the form details, document links, and date before saving.'); return false; }
    inflight.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/realtor/seller-service', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) });
      const body = await response.json();
      if (!response.ok || !body.ok) { if (response.status === 409) setNeedsReload(true); throw new Error(body.error || 'Unable to save. Retry the same action.'); }
      await load();
      if (fields.action === 'link_booking' && body.result.details?.consultationEventId) setSchedule({ id: body.result.details.consultationEventId, startsAt: body.result.details.startsAt });
      setNotice(fields.action === 'send_email' ? 'Email queued for the shared worker. Check its receipt below; queueing does not record contact.' : 'Saved.');
      return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save. Retry the same action.'); }
    finally { inflight.current = false; setBusy(false); }
    return false;
  };
  const savePreparation = async () => {
    if (!data) return false;
    const saved = await act({ action: 'save_case', ...draft });
    if (saved) setActionView({ kind: 'closed' });
    return saved;
  };
  const discardPreparation = () => {
    setDraft(data?.case ? { propertyId: data.case.property_id, notes: data.case.notes, documents: data.case.documents, checklist: data.case.checklist } : emptyDraft);
  };
  const milestoneDirty = milestoneDraft.milestone !== emptyMilestoneDraft.milestone || Boolean(milestoneDraft.occurredOn || milestoneDraft.evidence);
  const saveMilestone = async () => {
    const saved = await act({ action: 'milestone', ...milestoneDraft });
    if (saved) { setMilestoneDraft(emptyMilestoneDraft); setActionView({ kind: 'closed' }); }
    return saved;
  };
  const discardMilestone = () => setMilestoneDraft(emptyMilestoneDraft);
  const savedMilestones = data?.milestones || [];
  return <FieldbookShell title={data?.lead.name || 'Seller case'} eyebrow="Seller case" navigation={<SellerWorkspaceNav active="/seller-cases" />}>
    <div className="space-y-6">
    <div><Link className="mt-2 inline-block text-sm text-cyan-200 underline" href={`/seller-inbox?leadId=${encodeURIComponent(leadId)}`}>Open request, permissions and closing records</Link></div>
    {error ? <p role="alert" className="rounded-xl border border-rose-300/30 p-4">{error} <button className="underline" disabled={busy} onClick={() => { setError(''); void load().catch((reason) => setError(reason.message)); }}>Reload case</button></p> : null}
    {notice ? <p role="status" className="text-cyan-100">{notice}</p> : null}
    {!data && !error ? <p role="status">Loading case…</p> : null}
    {data ? <>
      <SellerJourney result={data} />
      {dirty && actionView.kind === 'closed' ? <p className="text-sm text-amber-200">Save your case changes before recording another action.</p> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <CasePanel title="Preparation">
          {data.case?.property_id ? <p className="text-sm text-slate-300">Linked property: {properties.find((property) => property.id === data.case?.property_id)?.label || 'Saved property reference'}</p> : null}
          {data.case?.notes ? <div className="mt-3"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Private notes</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{data.case.notes}</p></div> : null}
          {data.case?.checklist.length ? <div className="mt-3"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preparation checklist</h3><ul className="mt-2 space-y-1 text-sm">{data.case.checklist.map((item) => <li key={item.id}>{item.done ? '✓' : '○'} {item.title}</li>)}</ul></div> : null}
          {data.case?.documents.length ? <div className="mt-3"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reviewed documents</h3><ul className="mt-2 space-y-1 text-sm">{data.case.documents.map((document) => <li key={document.url}><a className="break-all text-cyan-200 underline" href={document.url} target="_blank" rel="noopener noreferrer">{document.label}</a></li>)}</ul></div> : null}
          {!data.case?.property_id && !data.case?.notes && !data.case?.checklist.length && !data.case?.documents.length ? <p className="text-sm text-slate-400">No preparation details have been saved yet.</p> : null}
          <button type="button" className={`${buttonClass} mt-4`} disabled={busy || needsReload} onClick={() => setActionView({ kind: 'prepare', leadId })}>Edit preparation</button>
          <Link href="/contracts/representation" className="ml-3 text-sm text-cyan-200 underline">Contracts</Link><Link href="/planner" className="ml-3 text-sm text-cyan-200 underline">Schedule preparation</Link>
        </CasePanel>
          {actionView.kind === 'prepare' ? <SellerActionDrawer titleId="seller-preparation-title" title="Edit preparation" description="Keep private case notes, the linked property, preparation tasks and reviewed document links together." dirty={dirty} busy={busy} saveBlocked={needsReload} error={error} onClose={() => { setError(''); setActionView({ kind: 'closed' }); }} onSave={savePreparation} onDiscard={discardPreparation}>
            <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); void savePreparation(); }}>
          <label className="block text-sm">Property from your shortlist<select disabled={disabled || Boolean(propertyError)} className={inputClass} value={draft.propertyId || ''} onChange={(event) => setDraft({ ...draft,propertyId:event.target.value || null })}><option value="">No property linked</option>{draft.propertyId && !properties.some((p) => p.id === draft.propertyId) ? <option value={draft.propertyId}>Existing linked property</option> : null}{properties.filter((p) => p.status==='active' || p.id===draft.propertyId).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
          {propertyError ? <p className="text-xs text-amber-200">{propertyError} <Link href="/today" className="underline">Open planner setup</Link></p> : null}
          <label className="block text-sm">Internal notes<textarea className={inputClass} rows={4} maxLength={4000} value={draft.notes} disabled={disabled} onChange={(event) => setDraft({ ...draft,notes:event.target.value })} /></label>
          <fieldset disabled={disabled}><legend className="text-sm font-semibold">Preparation checklist</legend>{draft.checklist.map((item,index) => <div key={item.id} className="mt-2 flex gap-2"><label className="flex flex-1 items-center gap-2"><input type="checkbox" checked={item.done} onChange={(event) => setDraft({ ...draft,checklist:draft.checklist.map((row) => row.id===item.id ? {...row,done:event.target.checked}:row) })} /><input aria-label={`Checklist item ${index+1}`} className={inputClass} required maxLength={160} value={item.title} onChange={(event) => setDraft({ ...draft,checklist:draft.checklist.map((row) => row.id===item.id ? {...row,title:event.target.value}:row) })} /></label><button type="button" aria-label={`Remove checklist item ${index+1}`} onClick={() => setDraft({ ...draft,checklist:draft.checklist.filter((row) => row.id!==item.id) })}>Remove</button></div>)}<button type="button" className="mt-2 text-sm text-cyan-200 underline" disabled={draft.checklist.length>=30} onClick={() => setDraft({...draft,checklist:[...draft.checklist,{id:crypto.randomUUID(),title:'',done:false}]})}>Add checklist item</button></fieldset>
          <fieldset disabled={disabled}><legend className="text-sm font-semibold">Reviewed document links</legend>{draft.documents.map((document,index) => <div key={index} className="fieldbook-record mt-2 rounded-lg border border-white/15 p-3"><label className="block text-xs">Document label<input className={inputClass} required maxLength={120} value={document.label} onChange={(event) => setDraft({...draft,documents:draft.documents.map((row,i) => i===index ? {...row,label:event.target.value}:row)})} /></label><label className="block text-xs">HTTPS link<input type="url" className={inputClass} required maxLength={2000} value={document.url} onChange={(event) => setDraft({...draft,documents:draft.documents.map((row,i) => i===index ? {...row,url:event.target.value}:row)})} /></label><button type="button" className="mt-2 text-xs underline" aria-label={`Remove document ${index+1}`} onClick={() => setDraft({...draft,documents:draft.documents.filter((_,i)=>i!==index)})}>Remove document</button></div>)}<button type="button" className="mt-2 text-sm text-cyan-200 underline" disabled={draft.documents.length>=20} onClick={() => setDraft({...draft,documents:[...draft.documents,{label:'',url:''}]})}>Add document link</button></fieldset>
          <div><button disabled={disabled} className={buttonClass}>{busy ? 'Saving…' : 'Save preparation'}</button></div>
        </form>
          </SellerActionDrawer> : null}
          {actionView.kind === 'milestone' ? <SellerActionDrawer titleId="seller-milestone-title" title="Record a milestone" description="Record an event that happened, with its local date and evidence. A booked consultation is not the same as a held consultation." unsavedDescription="This milestone draft has not been saved to the case." dirty={milestoneDirty} busy={busy} saveBlocked={needsReload} error={error} onClose={() => { setError(''); setActionView({ kind: 'closed' }); }} onSave={saveMilestone} onDiscard={discardMilestone}>
            <form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); void saveMilestone(); }}>
              <label className="block text-sm">Milestone<select className={inputClass} value={milestoneDraft.milestone} disabled={disabled} onChange={(event) => { setError(''); setMilestoneDraft({ ...milestoneDraft, milestone: event.target.value as MilestoneDraft['milestone'] }); }}>{sellerMilestones.map((value) => <option key={value} value={value}>{sellerMilestoneLabels[value]}</option>)}</select></label>
              <label className="block text-sm">Date in {data.timeZone}<input type="date" required className={inputClass} value={milestoneDraft.occurredOn} disabled={disabled} onChange={(event) => { setError(''); setMilestoneDraft({ ...milestoneDraft, occurredOn: event.target.value }); }} /></label>
              <label className="block text-sm">Evidence or agreement reference<textarea maxLength={1000} required className={inputClass} value={milestoneDraft.evidence} disabled={disabled} onChange={(event) => { setError(''); setMilestoneDraft({ ...milestoneDraft, evidence: event.target.value }); }} /></label>
              <button disabled={disabled} className={buttonClass}>{busy ? 'Saving…' : 'Save milestone'}</button>
            </form>
          </SellerActionDrawer> : null}
        <div className="space-y-6"><CasePanel id="case-milestones" title="Milestones"><div className="space-y-3">
          <p className="text-xs text-slate-400">Booking is separate from attendance. Verify the listing agreement before recording listing work; record an actual closing in the inbox first.</p>
          <button type="button" className={buttonClass} disabled={otherDisabled} onClick={() => setActionView({ kind: 'milestone', leadId })}>Record a milestone</button>
        <div className="mt-4 space-y-3">{data.milestoneRecords.map((record)=><form key={record.eventId} className="rounded-lg border border-white/15 p-3" onSubmit={(event)=>{event.preventDefault();void act({action:'retract_milestone',eventId:record.eventId,reason:String(new FormData(event.currentTarget).get('reason'))});}}><p className="text-sm font-semibold text-cyan-100">{sellerMilestoneLabels[record.milestone]} · {record.occurredOn}</p><p className="mt-1 whitespace-pre-wrap text-xs text-slate-300">{record.evidence}</p><label className="mt-2 block text-xs">Correction reason<input name="reason" required maxLength={1000} disabled={otherDisabled} className={inputClass}/></label><button disabled={otherDisabled} className="mt-2 text-xs text-amber-200 underline">Retract incorrect milestone</button></form>)}<p className="text-xs text-slate-400">Corrections retain the original history, withdraw the milestone from the funnel, and revoke the shared publication until you review it again. Retract dependent listing stages before retracting its agreement.</p></div></div></CasePanel>
        <CasePanel title="Appointments"><SellerAppointmentStep bookings={data.bookings} timeZone={data.timeZone} disabled={otherDisabled} onLink={(bookingId) => void act({action:'link_booking',bookingId})} /></CasePanel></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"><CasePanel title="Conversation"><ul className="mt-5 space-y-3">{orderSellerMessages(data.messages).map((message) => <li key={message.id} className="fieldbook-record rounded-lg border border-white/15 p-3"><p className="text-xs text-slate-400">{message.direction === 'inbound' ? 'Received' : 'Sent'} · {sellerConversationStatus(message)} · <time dateTime={message.occurred_at}>{new Date(message.occurred_at).toLocaleString(undefined,{timeZone:data.timeZone})}</time></p><h3 className="mt-1 font-semibold">{message.subject}</h3>{message.body.length > 500 ? <><p className="mt-2 whitespace-pre-wrap break-words text-sm">{message.body.slice(0, 500)}…</p><details className="mt-2"><summary className="cursor-pointer text-sm text-cyan-200">Read full message and delivery details</summary><p className="mt-2 whitespace-pre-wrap break-words text-sm">{message.body}</p><p className="mt-2 text-xs text-slate-400">Recorded status: {message.status}{message.provider_id ? ` · Provider reference: ${message.provider_id}` : ''}</p></details></> : <><p className="mt-2 whitespace-pre-wrap break-words text-sm">{message.body}</p><p className="mt-2 text-xs text-slate-400">Details · recorded status: {message.status}{message.provider_id ? ` · Provider reference: ${message.provider_id}` : ''}</p></>}</li>)}</ul>
        <SellerConversationComposer recipient={data.lead.email} sender={data.emailFrom ?? null} contactAllowed={data.contactAllowed} emailEnabled={data.emailEnabled ?? false} expectedLeadRevision={data.lead.revision} busy={busy} disabled={otherDisabled} saveBlocked={needsReload} error={error} onClearError={() => setError('')} onSave={(fields) => act(fields)} />
        {data.hasMoreMessages ? <p className="mt-3 text-xs text-amber-200">Showing the latest 100 messages.</p>:null}</CasePanel>
      <CasePanel title="Shared progress"><SellerProgressPublisher key={data.case?.published_at || 'unpublished'} savedPublication={data.case?.publication || null} availableMilestones={savedMilestones} checklist={data.case?.checklist || []} documents={data.case?.documents || []} disabled={otherDisabled} busy={busy} saveBlocked={needsReload} error={error} onClearError={() => setError('')} onPublish={(publication) => act({action:'publish_progress',reviewed:true,publication})} />
        <div className="mt-4 space-y-3 border-t border-white/15 pt-4"><p className="text-sm">Client access: {data.case?.sharing_enabled ? 'enabled' : 'disabled'}</p><button disabled={otherDisabled || !data.case?.publication} className={buttonClass} onClick={()=>void act({action:'share_progress',enabled:!data.case?.sharing_enabled})}>{data.case?.sharing_enabled ? 'Revoke client access' : 'Enable verified seller access'}</button><p className="text-xs text-slate-400">The seller signs in at <Link href="/seller-portal" className="underline text-cyan-200">/seller-portal</Link> with a verified account matching {data.lead.email}. No public token or invitation is sent.</p></div></CasePanel></div>
      <CasePanel title="History"><ul className="space-y-3">{data.events.map((event)=><li key={event.id} className="fieldbook-record rounded-lg bg-white/5 p-3 text-sm"><p>{event.kind.replaceAll('_',' ')} · <time dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleString(undefined,{timeZone:data.timeZone})}</time></p>{typeof event.details.reason==='string'?<p className="mt-1 whitespace-pre-wrap text-slate-300">{event.details.reason}</p>:null}{typeof event.details.evidence==='string'?<p className="mt-1 whitespace-pre-wrap text-slate-300">{event.details.evidence}</p>:null}{event.kind==='link_booking' && typeof event.details.consultationEventId==='string' && typeof event.details.startsAt==='string'?<button disabled={otherDisabled} className="mt-2 text-cyan-200 underline" onClick={()=>setSchedule({id:String(event.details.consultationEventId),startsAt:String(event.details.startsAt)})}>Open consultation in planner</button>:null}</li>)}</ul>{data.hasMoreEvents?<p className="mt-3 text-xs text-amber-200">Showing the latest 100 case events.</p>:null}</CasePanel>
      {schedule?<SellerLeadScheduleDialog leadId={leadId} leadName={data.lead.name} leadRevision={data.lead.revision} timeZone={data.timeZone} retryRequests={scheduleRetries.current} actionKey={`consultation:${schedule.id}`} consultationStartsAt={schedule.startsAt} onClose={()=>setSchedule(null)} onReload={()=>load()} onSaved={()=>{setSchedule(null);setNotice('Saved in the existing planner and reminder infrastructure.');void load().catch(()=>setNeedsReload(true));}}/>:null}
    </>:null}
  </div></FieldbookShell>;
}
function CasePanel({ id,title,children }: { id?:string;title:string;children:React.ReactNode }) { return <details id={id} className="fieldbook-panel" open={title === 'Preparation'}><summary className="py-2"><h2 className="inline text-lg">{title}</h2></summary><div className="mt-4">{children}</div></details>; }
