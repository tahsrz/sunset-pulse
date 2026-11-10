'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { sellerCalendarReadSchema, sellerCalendarSettingsSchema, type SellerCalendarRead, type SellerCalendarSettings } from '@/lib/scheduling/sellerConsultationContract';
import { FieldbookShell } from './FieldbookShell';
import { SellerWorkspaceNav } from './SellerWorkspaceNav';

const field='mt-1 block min-h-11 w-full rounded border border-white/20 p-2';
const button='min-h-11 rounded border border-white/20 px-4 py-2 disabled:opacity-50';
const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

async function api(path: string, signal: AbortSignal, body?: unknown) {
  const response=await fetch(path,{method:body?'POST':'GET',cache:'no-store',signal,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  const data=await response.json();
  if(!response.ok || !data?.ok) throw new Error(data?.error||'The calendar is unavailable.');
  return data.result as unknown;
}

export default function SellerConsultationCalendar() {
  const [data,setData]=useState<SellerCalendarRead | null>(null);
  const [agent,setAgent]=useState('');
  const [error,setError]=useState('');
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    let live=true;
    const timeout=setTimeout(()=>controller.abort(),15000);
    setData(null);setError('');
    api('/api/realtor/consultations'+(agent?'?agentId='+encodeURIComponent(agent):''),controller.signal)
      .then(value=>{if(live && !controller.signal.aborted) setData(sellerCalendarReadSchema.parse(value));})
      .catch(()=>{if(live) setError(controller.signal.aborted?'The calendar request timed out. Try again.':'Unable to load consultations. Sign in and complete personal planner setup, then try again.');})
      .finally(()=>clearTimeout(timeout));
    return ()=>{live=false;controller.abort();clearTimeout(timeout);};
  },[agent,reload]);
  return <FieldbookShell title="Consultations" navigation={<SellerWorkspaceNav active="/consultations" />}>
    {error ? <div role="alert"><p>{error}</p><button className={button} onClick={()=>setReload(n=>n+1)}>Try Again</button><Link className="ml-4" href="/login">Sign In</Link><Link className="ml-4" href="/today">Planner Setup</Link></div> : null}
    {!error && !data ? <p role="status">Loading calendar…</p> : null}
    {data ? <>
      {data.sites.length ? <label className="mb-6 block max-w-md">Agent Site<select className={field} value={data.selected?.agentId||''} onChange={event=>setAgent(event.target.value)}>{data.sites.map(site=><option key={site.agentId} value={site.agentId}>{site.site}</option>)}</select></label> : <p>No active agent site belongs to this account.</p>}
      {data.selected && data.settings ? <CalendarEditor key={data.selected.agentId+':'+data.selected.site} data={data} onReload={()=>setReload(n=>n+1)} /> : null}
    </> : null}
  </FieldbookShell>;
}

function CalendarEditor({data,onReload}:{data:SellerCalendarRead;onReload:()=>void}) {
  const [draft,setDraft]=useState<SellerCalendarSettings>(data.settings!);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const fence=useRef(false);
  const snapshot=useRef<{agentId:string;settings:SellerCalendarSettings}|null>(null);
  const mounted=useRef(false);
  const controller=useRef<AbortController | null>(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[]);

  function update(patch:Partial<SellerCalendarSettings>) {
    if(fence.current) return;
    snapshot.current=null;
    setDraft(current=>({...current,...patch,requestId:crypto.randomUUID()}));setMessage('');
  }

  async function mutate(path:string,body:unknown) {
    const abort=new AbortController();controller.current=abort;
    const timeout=setTimeout(()=>abort.abort(),15000);
    try {return await api(path,abort.signal,body);} finally {clearTimeout(timeout);}
  }

  async function save(event:React.FormEvent) {
    event.preventDefault();if(fence.current || !data.selected) return;
    const parsed=sellerCalendarSettingsSchema.safeParse(draft);
    if(!parsed.success) {setMessage(parsed.error.issues[0]?.message||'Check the availability windows.');return;}
    const input=snapshot.current || {agentId:data.selected.agentId,settings:parsed.data};snapshot.current=input;
    fence.current=true;setBusy(true);setMessage('');
    try {
      const result=await mutate('/api/realtor/consultations',input) as {revision?:number};
      if(!mounted.current) return;
      if(!Number.isInteger(result.revision)) throw new Error('The calendar result could not be confirmed. Retry the same settings.');
      setDraft(current=>({...current,expectedRevision:result.revision!,requestId:crypto.randomUUID()}));snapshot.current=null;
      setMessage(input.settings.enabled?'Availability saved. New requests can book these hours once booking is configured for this environment.':'Availability saved. New bookings are disabled.');
    } catch(error) {if(mounted.current) setMessage(error instanceof Error?error.message:'The save result is unknown. Retry the same settings.');}
    finally {fence.current=false;if(mounted.current) setBusy(false);}
  }

  async function cancel(bookingId:string) {
    if(fence.current) return;fence.current=true;setBusy(true);setMessage('');
    try {await mutate('/api/realtor/consultations/cancel',{bookingId});if(mounted.current) onReload();}
    catch(error) {if(mounted.current) setMessage(error instanceof Error?error.message:'Cancellation could not be confirmed. Retry it.');}
    finally {fence.current=false;if(mounted.current) setBusy(false);}
  }

  return <div className="space-y-8">
    <form onSubmit={save} className="space-y-5">
      <h2>Your Availability</h2>
      <p>Sunset Pulse checks bookings on this calendar. It does not check Google, Outlook or other calendars. Keep these hours free and disable booking when you are away.</p>
      <fieldset disabled={busy} className="space-y-5">
        <label className="flex items-center gap-3"><input type="checkbox" checked={draft.enabled} onChange={event=>update({enabled:event.target.checked})} />Allow New Bookings</label>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label>Time Zone<input required className={field} value={draft.timeZone} onChange={event=>update({timeZone:event.target.value})} placeholder="America/Chicago" /></label>
          <label>Duration<select className={field} value={draft.durationMinutes} onChange={event=>update({durationMinutes:Number(event.target.value) as SellerCalendarSettings['durationMinutes']})}>{[15,30,45,60].map(n=><option key={n} value={n}>{n} Minutes</option>)}</select></label>
          <label>Minimum Notice (Minutes)<input className={field} type="number" min={0} max={10080} required value={draft.noticeMinutes} onChange={event=>update({noticeMinutes:Number(event.target.value)})} /></label>
          <label>Booking Horizon (Days)<input className={field} type="number" min={1} max={60} required value={draft.horizonDays} onChange={event=>update({horizonDays:Number(event.target.value)})} /></label>
        </div>
        <fieldset className="space-y-3"><legend className="mb-3 font-semibold">Weekly Hours</legend>
          {!draft.windows.length?<p>No hours set. Add the times you want to offer.</p>:null}
          {draft.windows.map((window,index)=><div key={index} className="grid items-end gap-3 sm:grid-cols-4">
            <label>Day {index+1}<select className={field} value={window.weekday} onChange={event=>update({windows:draft.windows.map((w,i)=>i===index?{...w,weekday:Number(event.target.value)}:w)})}>{weekdays.map((day,i)=><option key={day} value={i}>{day}</option>)}</select></label>
            <label>Start {index+1}<input className={field} type="time" required value={window.start} onChange={event=>update({windows:draft.windows.map((w,i)=>i===index?{...w,start:event.target.value}:w)})} /></label>
            <label>End {index+1}<input className={field} type="time" required value={window.end} onChange={event=>update({windows:draft.windows.map((w,i)=>i===index?{...w,end:event.target.value}:w)})} /></label>
            <button className={button} type="button" onClick={()=>update({windows:draft.windows.filter((_,i)=>i!==index)})} aria-label={`Remove Hours ${index+1}`}>Remove</button>
          </div>)}
          <button className={button} type="button" disabled={draft.windows.length>=21} onClick={()=>update({windows:[...draft.windows,{weekday:1,start:'',end:''}]})}>Add Hours</button>
        </fieldset>
        <label className="flex items-start gap-3"><input type="checkbox" checked={draft.internalCalendarAcknowledged} onChange={event=>update({internalCalendarAcknowledged:event.target.checked})} /><span>I will keep these hours free. Sunset Pulse is the availability calendar for these consultations.</span></label>
      </fieldset>
      <div className="flex flex-wrap gap-4"><button disabled={busy} className={`${button} fieldbook-primary`} type="submit">{busy?'Saving…':'Save Availability'}</button><button disabled={busy} className={button} type="button" onClick={onReload}>Reload Saved Settings</button></div>
    </form>
    {message?<p role="status">{message}</p>:null}
    <section><h2>Booked Consultations</h2><p className="my-3">Recent and upcoming bookings. Open the inquiry for contact details.</p>
      {!data.bookings.length?<p>No consultations booked.</p>:data.bookings.map(booking=><div key={booking.id} className="fieldbook-record flex flex-wrap items-center justify-between gap-4 py-4">
        <div><p>{new Intl.DateTimeFormat('en-US',{timeZone:data.settings?.timeZone, dateStyle:'medium',timeStyle:'short'}).format(new Date(booking.start_time))}</p><p>{booking.status==='cancelled'?'Cancelled':'Booked'} · {data.settings?.timeZone}</p>{booking.lead_id?<Link href={'/seller-inbox?leadId='+encodeURIComponent(booking.lead_id)}>Open Inquiry</Link>:null}</div>
        {booking.status==='accepted'?<button disabled={busy} className={button} type="button" onClick={()=>cancel(booking.id)}>Cancel Consultation</button>:null}
      </div>)}
    </section>
  </div>;
}
