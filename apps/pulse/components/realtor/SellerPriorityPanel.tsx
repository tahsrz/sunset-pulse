'use client';
import React,{useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {sellerPrioritiesSchema} from '@/lib/realtor-workspace/sellerOverviewContract';
import {rankSellerPriorities} from '@/lib/realtor-workspace/sellerPriority';
import type {SellerDailyData} from '@/lib/realtor-workspace/sellerDailyContract';
export function SellerPriorityPanel({daily,result}:{daily:SellerDailyData;result?:unknown}){
  const [replacement,setReplacement]=useState<{source:unknown;value:unknown}|null>(null);
  const [retry,setRetry]=useState<{source:unknown;pending:boolean}|null>(null);const pending=retry?.source===result && retry?.pending===true;const controller=useRef<AbortController|null>(null);
  const parsed=sellerPrioritiesSchema.safeParse(replacement && replacement.source===result?replacement.value:result);
  const extra=parsed.success?parsed.data:null;
  useEffect(()=>()=>{controller.current?.abort();controller.current=null;},[result]);
  const reload=async()=>{
    if(controller.current)return;const request=new AbortController();controller.current=request;setRetry({source:result,pending:true});
    try{const response=await fetch('/api/realtor/seller-service/priorities',{cache:'no-store',signal:request.signal});const body=await response.json();if(!response.ok || !body.ok)throw new Error();const value=sellerPrioritiesSchema.parse(body.result);if(!request.signal.aborted)setReplacement({source:result,value});}
    catch{if(!request.signal.aborted)setReplacement({source:result,value:null});}
    finally{if(controller.current===request){controller.current=null;setRetry({source:result,pending:false});}}
  };
  const rows=rankSellerPriorities(daily,extra?.items || []);
  return <section className="mt-5 rounded-xl border border-cyan-300/20 p-4" aria-label="Seller next actions"><h3 className="font-semibold">Do next</h3><p className="mt-1 text-xs text-slate-400">Overdue actions, new requests, consultations within 24 hours, unscheduled replies, bookings, then preparation. Dates break ties.</p>{!extra?<p role="status" className="mt-3 text-xs text-amber-200">Case and reply priorities are unavailable; the loaded daily actions below remain visible. <button className="underline disabled:opacity-50" disabled={pending} onClick={()=>void reload()}>{pending?'Reloading case priorities…':'Retry case priorities'}</button></p>:null}
  {rows.length?<ol className="mt-3 grid gap-3 sm:grid-cols-2">{rows.slice(0,8).map((row)=><li key={row.id}><Link className="block rounded-lg bg-white/5 p-3 hover:bg-white/10" href={row.href}><span className="text-sm font-semibold">{row.title}</span><span className="mt-1 block text-xs text-slate-300">{row.reason}</span><span className="mt-2 block text-xs text-cyan-200">Open action →</span></Link></li>)}</ol>:extra?<p className="mt-3 text-sm text-slate-300">No actions in the loaded seller queue.</p>:null}
  {rows.length>8 || extra?.hasMore || daily.unscheduledHasMore || daily.overdueHasMore || daily.consultationsHasMore?<p className="mt-3 text-xs text-slate-400">Showing a bounded priority queue. <Link className="text-cyan-200 underline" href="/seller-cases">Browse all cases</Link> or <Link className="text-cyan-200 underline" href="/planner">open the planner</Link> for more.</p>:null}</section>;
}
