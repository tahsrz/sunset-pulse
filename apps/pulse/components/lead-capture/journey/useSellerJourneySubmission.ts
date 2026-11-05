'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import type {GuidedJourneyDraft} from '@/lib/marketing/guidedJourney';
import {
  JourneyRequestError,prepareSellerJourneyAttempt,readSellerReceipt,
  type PendingJourneyAttempt,type SellerRequestReceipt,
} from '@/lib/marketing/guidedJourneyRequest';
import type {SellerPlanLeadV3Input} from '@/lib/marketing/guidedJourneySchema';

export type SellerJourneyTransport=(request:SellerPlanLeadV3Input,options:{signal:AbortSignal})=>Promise<{ok:boolean;body:unknown;status?:number}>;
export type PreparedRequestSummary={version:'3';submissionId:string;byteLength:number};
type State<TOffer>=
  | {status:'idle'|'preparing'|'sending'}
  | {status:'prepared';summary:PreparedRequestSummary}
  | {status:'accepted';receipt:SellerRequestReceipt<TOffer>}
  | {status:'error';message:string};
type Result<TOffer>=
  | {status:'ignored'}
  | {status:'prepared';summary:PreparedRequestSummary}
  | {status:'accepted';receipt:SellerRequestReceipt<TOffer>}
  | {status:'error';message:string};
type Options<TOffer>={transport?:SellerJourneyTransport;parseBookingOffer?:(value:unknown)=>TOffer|null;timeoutMs?:number};
type Attribution=Parameters<typeof prepareSellerJourneyAttempt>[1];

/** Stop waiting even if an injected transport ignores cancellation. Discard late results. */
function abortable<T>(promise:Promise<T>,signal:AbortSignal):Promise<T> {
  if(signal.aborted) return Promise.reject(new DOMException('Request cancelled.','AbortError'));
  let onAbort:()=>void;
  const cancelled=new Promise<never>((_resolve,reject)=>{
    onAbort=()=>reject(new DOMException('Request cancelled.','AbortError'));
    signal.addEventListener('abort',onAbort,{once:true});
  });
  return Promise.race([promise,cancelled]).finally(()=>signal.removeEventListener('abort',onAbort));
}

/** No default network transport. The reviewed feature form supplies its existing save/booking adapter. */
export default function useSellerJourneySubmission<TOffer=never>({transport,parseBookingOffer,timeoutMs=15000}:Options<TOffer>={}) {
  const [state,setState]=useState<State<TOffer>>({status:'idle'});
  const busy=useRef(false),accepted=useRef(false),mounted=useRef(true);
  const pending=useRef<PendingJourneyAttempt|null>(null);
  const active=useRef<AbortController|null>(null);
  useEffect(()=>{
    mounted.current=true;
    return ()=>{mounted.current=false;active.current?.abort();};
  },[]);

  const submit=useCallback(async(draft:GuidedJourneyDraft,attribution:Attribution={}):Promise<Result<TOffer>>=>{
    // Acquire synchronously, before the first await (including Web Crypto).
    if(busy.current||accepted.current||!mounted.current) return {status:'ignored'};
    busy.current=true;setState({status:'preparing'});
    const controller=new AbortController();active.current=controller;
    const timeout=setTimeout(()=>controller.abort(),Math.min(30000,Math.max(1000,timeoutMs)));
    try {
      const prepared=await abortable(prepareSellerJourneyAttempt(draft,attribution,pending.current),controller.signal);
      if(!mounted.current||controller.signal.aborted) return {status:'ignored'};
      pending.current=prepared.attempt;
      if(!transport) {
        const summary:PreparedRequestSummary={version:'3',submissionId:prepared.request.submissionId,byteLength:new TextEncoder().encode(JSON.stringify(prepared.request)).byteLength};
        const result={status:'prepared' as const,summary};setState(result);return result;
      }
      setState({status:'sending'});
      const response=await abortable(transport(prepared.request,{signal:controller.signal}),controller.signal);
      if(!mounted.current||controller.signal.aborted) return {status:'ignored'};
      if(!response.ok) throw new Error('Request not confirmed.');
      const receipt=readSellerReceipt(response.body,parseBookingOffer);
      // Optional booking failure cannot reopen the saved request or remint its ID.
      accepted.current=true;pending.current=null;
      const result={status:'accepted' as const,receipt};setState(result);return result;
    } catch(error) {
      if(!mounted.current) return {status:'ignored'};
      const message=error instanceof JourneyRequestError?error.message:'We couldn’t confirm your request. Your answers are still here. Please try again.';
      const result={status:'error' as const,message};setState(result);return result;
    } finally {
      clearTimeout(timeout);
      if(active.current===controller){active.current=null;busy.current=false;}
    }
  },[transport,parseBookingOffer,timeoutMs]);

  const reset=useCallback(()=>{
    if(busy.current||!mounted.current) return false;
    pending.current=null;accepted.current=false;setState({status:'idle'});return true;
  },[]);
  return {state,submit,reset,busy:state.status==='preparing'||state.status==='sending'};
}
