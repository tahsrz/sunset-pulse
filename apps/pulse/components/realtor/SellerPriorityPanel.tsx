'use client';
import React,{useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {sellerPrioritiesSchema} from '@/lib/realtor-workspace/sellerOverviewContract';
import {rankSellerPriorities} from '@/lib/realtor-workspace/sellerPriority';
import type {SellerDailyData} from '@/lib/realtor-workspace/sellerDailyContract';
import {SellerNextActionCard} from './SellerNextActionCard';
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
  return <section className="mt-5" aria-label="Seller next actions"><h3 className="font-semibold">Start here</h3><p className="mt-1 text-sm text-slate-400">One person, one next step.</p>{!extra?<p role="status" className="mt-3 text-xs text-amber-200">Case and reply priorities are unavailable; your loaded daily actions are still here. <button type="button" className="underline disabled:opacity-50" disabled={pending} onClick={()=>void reload()}>{pending?'Reloading case priorities…':'Retry case priorities'}</button></p>:null}
  {rows.length?<>
    <div className="mt-4"><SellerNextActionCard row={rows[0]} featured /></div>
    {rows.length>1?<div className="mt-5"><h4 className="text-sm font-semibold text-slate-300">Next up</h4><ol className="mt-3 grid gap-3 sm:grid-cols-3">{rows.slice(1,4).map((row)=><li key={row.id}><SellerNextActionCard row={row}/></li>)}</ol></div>:null}
    {rows.length>4?<details className="mt-4"><summary className="cursor-pointer py-2 text-sm text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">More next actions ({Math.min(rows.length,8)-4})</summary><ol className="mt-3 grid gap-3 sm:grid-cols-2">{rows.slice(4,8).map((row)=><li key={row.id}><SellerNextActionCard row={row}/></li>)}</ol></details>:null}
  </>:extra?<p className="mt-3 text-sm text-slate-300">No actions in the loaded seller queue.</p>:null}
  {rows.length>8 || extra?.hasMore || daily.unscheduledHasMore || daily.overdueHasMore || daily.consultationsHasMore?<p className="mt-3 text-xs text-slate-400">Showing a bounded priority queue. <Link className="text-cyan-200 underline" href="/seller-cases">Browse all cases</Link> or <Link className="text-cyan-200 underline" href="/planner">open the planner</Link> for more.</p>:null}</section>;
}
