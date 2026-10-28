'use client';

import React, { useEffect, useRef, useState } from 'react';
import { sellerAvailabilityResultSchema, sellerReservationResultSchema, type SellerBookingOffer, type SellerSlot, type SellerReservationResult } from '@/lib/scheduling/sellerConsultationContract';

type State = 'idle' | 'loading' | 'ready' | 'reserving' | 'uncertain' | 'expired' | 'unavailable' | 'confirmed' | 'cancelled' | 'denied';
type Attempt = { slotId: string; requestId: string };
const button = 'min-h-12 rounded-xl border border-teal-200/30 px-4 py-3 text-sm font-bold text-teal-50 hover:bg-teal-200/10 disabled:opacity-50';

export default function SellerConsultationPicker({ offer }: { offer: SellerBookingOffer }) {
  const [state,setState] = useState<State>('idle');
  const [slots,setSlots] = useState<SellerSlot[]>([]);
  const [selected,setSelected] = useState('');
  const [message,setMessage] = useState('');
  const [confirmed,setConfirmed] = useState<Extract<SellerReservationResult,{status:'confirmed'}> | null>(null);
  const [zone] = useState(()=>Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const pending = useRef<Attempt | null>(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(()=>{
    mounted.current=true;
    const expiry=setTimeout(()=>{ if (!busy.current && !pending.current) setState(current=>current==='confirmed'||current==='cancelled'?current:'expired'); },Math.max(0,Date.parse(offer.expiresAt)-Date.now()));
    return ()=>{mounted.current=false;clearTimeout(expiry);controller.current?.abort();};
  },[offer.expiresAt]);

  const format = (start: string) => new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(start));

  async function send(path: string, body: unknown) {
    const abort=new AbortController(); controller.current=abort;
    const timeout=setTimeout(()=>abort.abort(),15000);
    try {
      const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',signal:abort.signal,body:JSON.stringify(body)});
      return {response,body:await response.json() as unknown};
    } finally {clearTimeout(timeout);}
  }

  async function load() {
    if(busy.current || pending.current) return;
    if(Date.now()>=Date.parse(offer.expiresAt)) {setState('expired');return;}
    busy.current=true;setState('loading');setMessage('');setSelected('');
    try {
      const from=new Date();
      const result=await send('/api/seller-consultations/availability',{capability:offer.token,window:{from:from.toISOString(),to:new Date(from.getTime()+14*86400000).toISOString(),timeZone:zone}});
      if(!mounted.current) return;
      const parsed=sellerAvailabilityResultSchema.safeParse(result.body);
      if(result.response.status===403) {setState('denied');return;}
      if(!result.response.ok || !parsed.success || parsed.data.status!=='available') {setState('unavailable');return;}
      setSlots(parsed.data.slots);setState('ready');
    } catch {if(mounted.current) setState('unavailable');}
    finally {busy.current=false;}
  }

  async function reserve() {
    if(busy.current) return;
    if(Date.now()>=Date.parse(offer.expiresAt)) {setState('expired');return;}
    const attempt=pending.current || (selected ? {slotId:selected,requestId:crypto.randomUUID()} : null);
    if(!attempt) return;
    pending.current=attempt;busy.current=true;setState('reserving');setMessage('');
    try {
      const result=await send('/api/seller-consultations/reservations',{capability:offer.token,...attempt});
      if(!mounted.current) return;
      const parsed=sellerReservationResultSchema.safeParse(result.body);
      if(result.response.status===403) {setState('denied');return;}
      if(parsed.success && result.response.status===200 && parsed.data.status==='confirmed') {
        setConfirmed(parsed.data);pending.current=null;setState('confirmed');
      } else if(parsed.success && result.response.status===409 && parsed.data.status==='conflict') {
        pending.current=null;setSelected('');setSlots([]);setState('idle');setMessage('That time is no longer available. Check for another time.');
      } else if(parsed.success && result.response.status===200 && parsed.data.status==='cancelled') {
        pending.current=null;setState('cancelled');
      } else setState('uncertain');
    } catch {if(mounted.current) setState('uncertain');}
    finally {busy.current=false;}
  }

  return <section aria-labelledby="consultation-title" className="mt-6 border-t border-teal-200/20 pt-6">
    <h3 id="consultation-title" className="font-sans text-xl font-semibold uppercase italic text-white">Choose a Consultation Time</h3>
    {state==='confirmed' && confirmed ? <p role="status" className="mt-3 text-teal-100">Your consultation is booked for {format(confirmed.startsAt)}. Reference: {confirmed.bookingId}. We will use the email from your saved request.</p> : <>
      <p className="mt-3 text-sm text-slate-300">Your request is already saved. Booking a time is optional. Times are shown in {zone}.</p>
      {message ? <p role="status" className="mt-3 text-sm text-amber-100">{message}</p> : null}
      {state==='idle' || state==='unavailable' ? <div className="mt-4"><button type="button" onClick={load} className={button}>Check Available Times</button>{state==='unavailable'?<p role="status" className="mt-3 text-sm text-slate-300">Booking is unavailable right now. We can arrange a time when we follow up.</p>:null}</div> : null}
      {state==='loading' ? <p role="status" className="mt-4">Checking available times…</p> : null}
      {state==='ready' ? <div className="mt-4 space-y-4">
        {slots.length ? <fieldset><legend className="mb-3 text-sm text-slate-300">Available over the next 14 days</legend><div className="grid max-h-80 gap-2 overflow-auto sm:grid-cols-2">{slots.map(slot=><label key={slot.id} className={`${button} flex cursor-pointer items-center gap-3`}><input type="radio" name="consultation-slot" checked={selected===slot.id} onChange={()=>setSelected(slot.id)} value={slot.id} /><span>{format(slot.startsAt)}</span></label>)}</div></fieldset> : <p role="status">No times are available in the next 14 days. We will arrange a time with you.</p>}
        {selected ? <button type="button" onClick={reserve} className={button}>Book Selected Time</button> : null}
        <button type="button" onClick={load} className={`${button} ml-2`}>Refresh Times</button>
      </div> : null}
      {state==='reserving' ? <p role="status" className="mt-4">Confirming your time…</p> : null}
      {state==='uncertain' ? <div role="status" className="mt-4 space-y-3"><p>We could not confirm the result. The appointment may have been saved. Retry this same request to check it.</p><button type="button" onClick={reserve} className={button}>Check This Booking Again</button></div> : null}
      {state==='expired' || state==='denied' ? <p role="status" className="mt-4">Booking access has ended. Your request is still saved.{pending.current?' The appointment may have been saved. Please ask us to check before arranging another time.':' We will follow up to arrange a time.'}</p> : null}
      {state==='cancelled' ? <p role="status" className="mt-4">This appointment was cancelled. We will follow up to arrange another time.</p> : null}
    </>}
  </section>;
}
