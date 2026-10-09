'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ownedSellerLeadPageSchema, type OwnedSellerLead } from '@/lib/realtor-workspace/leadContracts';
export function SellerCaseList() {
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [reload,setReload] = useState(0);
  const cursor=cursors[cursors.length-1];
  const query=new URLSearchParams({limit:'25',...(cursor ? {cursor}: {})}).toString();
  const [result,setResult] = useState<{query:string;leads?:OwnedSellerLead[];nextCursor?:string|null;error?:string}|null>(null);
  const current=result?.query===query ? result:null;
  useEffect(()=>{const controller=new AbortController();void fetch(`/api/realtor/leads?${query}`,{cache:'no-store',signal:controller.signal}).then(async(response)=>{const body=await response.json();if(!response.ok || !body.ok)throw new Error(body.error || 'Sign in and set up your personal planner to open cases.');const page=ownedSellerLeadPageSchema.parse(body.result);if(!controller.signal.aborted)setResult({query,...page});}).catch((error)=>{if(!controller.signal.aborted)setResult({query,error:error.message});});return()=>controller.abort();},[query,reload]);
  return <section aria-label="Seller case list">{current?.error?<p role="alert">{current.error} <Link href="/today" className="text-cyan-200 underline">Open setup</Link></p>:!current?.leads?<p role="status">Loading seller cases…</p>:current.leads.length?<ul className="grid gap-3 sm:grid-cols-2">{current.leads.map((lead)=><li key={lead.id}><Link className="block rounded-xl border border-white/15 p-4 hover:bg-white/5" href={`/seller-cases/${lead.id}`}><span className="font-semibold">{lead.name}</span><span className="mt-2 block text-xs text-slate-400">{lead.status || 'new request'} · Open property, evidence, bookings and progress</span></Link></li>)}</ul>:<p>No seller requests yet. <Link href="/seller-setup" className="text-cyan-200 underline">Check your seller setup</Link></p>}
  <div className="mt-4 flex gap-3"><button className="text-cyan-200 underline" onClick={()=>{setResult(null);setReload((r)=>r+1);}}>Refresh cases</button>{cursors.length>1?<button className="text-cyan-200 underline" onClick={()=>setCursors((list)=>list.slice(0,-1))}>Previous page</button>:null}{current?.nextCursor?<button className="text-cyan-200 underline" onClick={()=>setCursors((list)=>[...list,current.nextCursor!])}>Older cases</button>:null}</div></section>;
}
