'use client';
import React,{useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {sellerPrioritiesSchema} from '@/lib/realtor-workspace/sellerOverviewContract';
import {rankSellerPriorities} from '@/lib/realtor-workspace/sellerPriority';
import type {SellerDailyData} from '@/lib/realtor-workspace/sellerDailyContract';
import {SellerNextActionRow} from './SellerNextActionRow';
import focus from './SellerDailyFocus.module.css';
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
  return <section className={focus.focusArea} aria-label="Seller next actions"><h3 className={focus.focusHeading}>Today’s Focus</h3>{!extra?<p role="status" className="mt-3 text-xs text-amber-200">Case and reply priorities are unavailable; your loaded daily actions are still here. <button type="button" className="underline disabled:opacity-50" disabled={pending} onClick={()=>void reload()}>{pending?'Reloading case priorities…':'Retry case priorities'}</button></p>:null}
  {rows.length?<>
    <div><SellerNextActionRow row={rows[0]} position={1} variant="focus"/></div>
    {rows.length>1?<div className="mt-6"><h4 className="text-sm font-semibold text-slate-300">Next Up</h4><ol className={focus.nextGrid}>{rows.slice(1,3).map((row,index)=><li key={row.id}><SellerNextActionRow row={row} position={index+2} variant="next"/></li>)}</ol></div>:null}
    {rows.length>3?<details className="mt-4"><summary className="cursor-pointer py-2 text-sm text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">More next actions ({Math.min(rows.length,8)-3})</summary><ol className="mt-3">{rows.slice(3,8).map((row,index)=><li key={row.id}><SellerNextActionRow row={row} position={index+4}/></li>)}</ol></details>:null}
  </>:extra?<p className="mt-3 text-sm text-slate-300">No actions in the loaded seller queue.</p>:null}
  {rows.length>8 || extra?.hasMore || daily.unscheduledHasMore || daily.overdueHasMore || daily.consultationsHasMore?<p className="mt-3 text-xs text-slate-400">For the rest of your work, <Link className="text-cyan-200 underline" href="/seller-cases">browse all cases</Link> or <Link className="text-cyan-200 underline" href="/planner">open the planner</Link>.</p>:null}</section>;
}
