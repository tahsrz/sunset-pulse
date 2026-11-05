'use client';

import React, {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {
  answered,applyHomeFactsRecord,changeJourneyAddress,choiceQuestions,createInitialJourneyDraft,deriveSteps,factLabels,normalizeDraft,parseMoneyCents,
  propertyLabel,renovations,reviewRows,sectionFor,setChoice,toggleRenovation,validateStep,
  type Answer,type ChoiceField,type GuidedJourneyDraft,type JourneyMode,type StepId,
} from '@/lib/marketing/guidedJourney';
import SequentialPhotoLabels, {type PhotoLabel} from '@/components/marketing/SequentialPhotoLabels';
import GuidedJourneyShell from './GuidedJourneyShell';
import JourneyChoiceGroup from './JourneyChoiceGroup';
import JourneyHomeFacts from './JourneyHomeFacts';
import useSellerJourneySubmission, {type SellerJourneyTransport} from './useSellerJourneySubmission';
import type {SellerPlanLeadInput} from '@/lib/marketing/leadMagnetContract';
import {homeAddressLabel,homeFactsLookupSchema,type HomeFactsLookupResult,type HomeFactsRecord} from '@/lib/marketing/homeFactsLookup';
import styles from './GuidedJourney.module.css';

const labels:readonly PhotoLabel[]=[
  {id:'pricing',text:'Pricing Review',anchor:'upperRight'},
  {id:'preparation',text:'Home Preparation',anchor:'middleLeft'},
  {id:'timing',text:'Move Planning',anchor:'lowerRight'},
];
const titles:Partial<Record<StepId,string>>={
  intent:'What’s your next move?',address:'Which home are you thinking of selling?',
  'confirm-home':'Have we got the right home?','home-facts':'Do these home details look right?',
  'detail-level':'Would you like to add a few home details?',renovations:'What have you updated?',
  'mortgage-balance':'About how much is left on the mortgage?','approval-amount':'How much were you pre-approved for?',
  review:'Does this look right?',contact:'How can we get in touch?',
};

function HomeIllustration({preview}:{preview:boolean}) {
  return <figure className={styles.art}>
    <div className={styles.artSurface}>
      <svg viewBox="0 0 430 350" aria-hidden="true" fill="none">
        <circle cx="328" cy="92" r="48" fill="#efbd78"/>
        <path d="M0 280C85 230 120 271 215 247c101-25 139 3 215-27v130H0Z" fill="#b4c9a5"/>
        <path d="M71 179 211 76l147 103" stroke="#456351" strokeWidth="3" strokeLinejoin="round"/>
        <path d="M92 168v122h245V165L211 95Z" fill="#f8f3e5" stroke="#456351" strokeWidth="2"/>
        <path d="M116 290v-94h195v94M192 290v-74h40v74" stroke="#456351" strokeWidth="2"/>
        <path d="M139 216h30v35h-30zM255 216h30v35h-30zM196 145h32v32h-32z" fill="#b1cec4" stroke="#456351" strokeWidth="2"/>
        <path d="M154 216v35M270 216v35M212 145v32M116 196h195M64 292h302M196 350l8-60h16l21 60" stroke="#456351" strokeWidth="2"/>
        <path d="M52 289v-83M46 267c-29-13-32-35-16-44 17-9 27 15 22 30m2-16c28-9 35-32 20-43-17-11-28 11-22 28M376 286v-58m-2 34c-22-3-31-23-20-33 12-12 26 4 22 20" stroke="#456351" strokeWidth="3"/>
      </svg>
    </div>
    <SequentialPhotoLabels labels={labels}/>
    {preview?<figcaption className={styles.artCaption}>Illustration · Your Photo Could Go Here</figcaption>:null}
  </figure>;
}

type LiveJourney<TOffer>={
  campaign?:SellerPlanLeadInput['campaign'];pricingReview?:boolean;transport:SellerJourneyTransport;
  parseBookingOffer:(value:unknown)=>TOffer|null;renderBooking:(offer:TOffer)=>React.ReactNode;
};

export default function GuidedJourneyPrototype<TOffer>({live}:{live?:LiveJourney<TOffer>}={}) {
  const [draft,setDraft]=useState(()=>{
    const initial=createInitialJourneyDraft();
    return live?.pricingReview?setChoice(initial,'selling-preference','pricing'):initial;
  });
  const [company,setCompany]=useState('');
  const [step,setStep]=useState<StepId>('intent');
  const [returnToReview,setReturnToReview]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [finished,setFinished]=useState(false);
  const [previewResponse,setPreviewResponse]=useState<'instant'|'loading'|'error'>('instant');
  const [moneyInput,setMoneyInput]=useState('');
  const [lookup,setLookup]=useState<HomeFactsLookupResult|null>(null);
  const [selectedHome,setSelectedHome]=useState<string>();
  const [exampleLookup,setExampleLookup]=useState(false);
  const [manualAddress,setManualAddress]=useState<string|null>(null);
  const submission=useSellerJourneySubmission({transport:live?.transport,parseBookingOffer:live?.parseBookingOffer});
  const receipt=submission.state.status==='accepted'?submission.state.receipt:null;
  const headingRef=useRef<HTMLHeadingElement>(null);
  const inFlight=useRef(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const lookupController=useRef<AbortController|null>(null);
  const mounted=useRef(true);
  const steps=deriveSteps(draft);
  const section=sectionFor(step);
  const sections=[...new Set(steps.map(sectionFor))];

  useEffect(()=>{headingRef.current?.focus();},[step,finished,receipt]);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;if(timer.current) clearTimeout(timer.current);lookupController.current?.abort();};},[]);
  function update(next:GuidedJourneyDraft) {setDraft(normalizeDraft(next));setError('');}
  function navigate(next:StepId) {
    setStep(next);setError('');
    const value=answered(next==='mortgage-balance'?draft.mortgageBalanceCents:next==='approval-amount'?draft.preApprovedAmountCents:{state:'unanswered'});
    setMoneyInput(value===undefined?'':String(value/100));
  }
  function edit(next:StepId) {setReturnToReview(true);navigate(next);}
  function reset() {
    if(inFlight.current||!submission.reset()) return;
    setDraft(createInitialJourneyDraft());setFinished(false);setReturnToReview(false);
    setLookup(null);setSelectedHome(undefined);setManualAddress(null);navigate('intent');
  }
  function acceptHome(record:HomeFactsRecord) {
    update(applyHomeFactsRecord(draft,record));navigate('confirm-home');
  }
  async function findHome() {
    if(inFlight.current) return;
    const controller=new AbortController();lookupController.current=controller;
    inFlight.current=true;setBusy(true);setError('');
    const timeout=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch('/api/seller-plan/preview/property-lookup',{
        method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',signal:controller.signal,
        body:JSON.stringify({query:draft.address.line1.trim(),examples:exampleLookup}),
      });
      if(!response.ok) throw new Error('Lookup unavailable.');
      const result=homeFactsLookupSchema.parse(await response.json());
      if(!mounted.current||controller.signal.aborted||lookupController.current!==controller) return;
      setLookup(result);setSelectedHome(undefined);
      if(result.status==='matched') acceptHome(result.property);
    } catch {
      if(mounted.current&&lookupController.current===controller) setLookup({status:'unavailable'});
    } finally {
      clearTimeout(timeout);
      if(mounted.current&&lookupController.current===controller){lookupController.current=null;inFlight.current=false;setBusy(false);}
    }
  }
  function back() {
    if(inFlight.current||receipt) return;
    if(finished){setFinished(false);navigate('review');return;}
    if(returnToReview){setReturnToReview(false);navigate('review');return;}
    const index=steps.indexOf(step);if(index>0) navigate(steps[index-1]);
  }
  async function submitRequest() {
    if(inFlight.current) return;
    inFlight.current=true;setBusy(true);setError('');
    if(live||draft.mode!=='buy') {
      const result=await submission.submit(draft,live?{company,campaign:live.campaign}:undefined);
      if(!mounted.current) return;
      if(result.status!=='prepared') {
        inFlight.current=false;setBusy(false);if(result.status==='error')setError(result.message);return;
      }
    }
    if(previewResponse==='instant') {inFlight.current=false;setBusy(false);setFinished(true);return;}
    // Explicit preview response only. The prepared ID survives this simulated error.
    timer.current=setTimeout(()=>{
      timer.current=null;inFlight.current=false;setBusy(false);
      if(previewResponse==='error') setError('Preview error: your answers are still here. Choose another preview response and try again.');
      else setFinished(true);
    },800);
  }
  function next() {
    if(inFlight.current||finished||receipt) return;
    const invalid=validateStep(step,draft);
    if(invalid){setError(invalid);return;}
    setError('');
    if(step==='address') {
      if(live||draft.propertyMatch||manualAddress===draft.address.line1){navigate('confirm-home');return;}
      if(lookup?.status==='multiple') {
        const record=lookup.candidates.find(candidate=>candidate.id===selectedHome);
        if(record){acceptHome(record);return;}
        setError('Choose a home, refine the address or enter the details yourself.');return;
      }
      void findHome();return;
    }
    if(returnToReview||step==='review') {
      const needsAnswer=steps.slice(0,steps.indexOf('review')).find(candidate=>validateStep(candidate,draft)!==null);
      if(needsAnswer){setReturnToReview(true);navigate(needsAnswer);return;}
      if(returnToReview){setReturnToReview(false);navigate('review');return;}
    }
    if(step!=='contact') {
      const destination=steps[steps.indexOf(step)+1];if(destination) navigate(destination);return;
    }
    void submitRequest();
  }
  function useSampleHome() {
    const address={line1:'100 Example Lane',city:'Keller',region:'TX',postalCode:'76248'};
    setLookup(null);setSelectedHome(undefined);
    update({...changeJourneyAddress(draft,address.line1,true),address:{...address,confirmed:false},propertyMatch:{
      id:'manual-example',address,source:'Example',recordedAt:null,totalBathrooms:2,
      facts:{bedrooms:3,fullBaths:2,halfBaths:0,stories:1,yearBuilt:2010,squareFeet:2100},
    },facts:{
      bedrooms:{state:'answered',value:3},fullBaths:{state:'answered',value:2},halfBaths:{state:'answered',value:0},stories:{state:'answered',value:1},yearBuilt:{state:'answered',value:2010},squareFeet:{state:'answered',value:2100},
    }});
  }
  function updateMoney(value:string) {
    setMoneyInput(value);const cents=parseMoneyCents(value);
    const answer:Answer<number>=cents===null?{state:'unanswered'}:{state:'answered',value:cents};
    update({...draft,[step==='mortgage-balance'?'mortgageBalanceCents':'preApprovedAmountCents']:answer});
  }
  const question=step in choiceQuestions?choiceQuestions[step as ChoiceField]:null;
  const title=receipt?'Your Request Is Saved':finished?'Your next move, in view.':titles[step]||question?.title||'';
  const description=receipt?'We’ll follow up by email about the help you asked for.':finished?'This is a preview of the journey. Nothing has been submitted or booked.':
    step==='intent'?'Start where you are. We’ll take the rest one question at a time.':
    step==='address'?(live?'We’ll use this address to prepare for your conversation.':'Use fictional details here. Address lookup reads saved public property records.'):
    step==='home-facts'?'Check the details below. You can change any value or choose Not Sure.':
    step==='detail-level'?'These questions can help with preparation. You can also leave them for later.':
    step==='review'?'You can change any answer before moving on.':
    step==='contact'?(live?'Where should we send a reply?':'Try the contact step with example details. This preview sends nothing.'):
    step==='mortgage-balance'||step==='approval-amount'?(live?'Sharing an amount is optional. Choose Not Sure to leave it blank.':'An approximate figure is enough for this preview. You can choose Not Sure.'):undefined;

  function fields():React.ReactNode {
    if(receipt&&live) return <div className={styles.receipt}>
      {receipt.bookingOffer?live.renderBooking(receipt.bookingOffer):<p>You can arrange a consultation when we follow up.</p>}
    </div>;
    if(finished) return <div className={styles.receipt}>
      <p className={styles.eyebrow}>Preview Complete</p>
      <h2>A conversation comes next.</h2>
      <p>{draft.mode==='buy'?'This previews the buying questions.':'Your answers passed the request checks on this device.'} No request was sent here.</p>
      <p>{draft.mode==='buy'?'You can start exploring homes now.':'You can use the current seller form when you’re ready to make a real request.'}</p>
      <div className={styles.inlineActions}>
        <Link href={draft.mode==='buy'?'/explorer':'/seller-plan#request'} className={styles.next}>{draft.mode==='buy'?'Open Explorer':'Open Current Seller Form'}</Link>
        <button type="button" className={styles.unknown} onClick={reset}>Start Again</button>
      </div>
      {draft.mode!=='buy'?<p>The connected flow will use the existing saved-request receipt and consultation calendar.</p>:null}
    </div>;
    if(step==='intent') return <><JourneyChoiceGroup<JourneyMode> legend={title} value={draft.mode||undefined} onChange={mode=>update({...draft,mode})} options={[
      {value:'sell',label:'Sell My Home',description:'Get ready for the sale and plan the next step.'},
      ...(!live?[{value:'buy' as const,label:'Find a Home',description:'Work out what you want before you start looking.'}]:[]),
      {value:'both',label:'Buy and Sell',description:'Keep both parts of your move together.'},
    ]}/>{live?<a className={styles.unknown} href="/explorer">Just looking to buy? Browse homes</a>:null}</>;
    if(step==='address') return <>
      <label className={styles.fieldLabel}>Street Address
        <input className={styles.input} maxLength={180} disabled={busy} autoComplete="street-address" placeholder="Enter your street address" value={draft.address.line1}
          onChange={event=>{setLookup(null);setSelectedHome(undefined);setManualAddress(null);update(changeJourneyAddress(draft,event.target.value));}}/>
      </label>
      <p className={styles.helper}>You can include a city or ZIP here if needed.</p>
      {!live?<button type="button" disabled={busy} className={styles.unknown} onClick={useSampleHome}>Use a Fictional Sample Home</button>:null}
      {lookup?<div className={styles.lookupResults}>
        {lookup.status==='multiple'?<>
          <p>Which home do you mean?{lookup.moreMatches?' More matches are available. Add a city or ZIP to narrow them down.':''}</p>
          <JourneyChoiceGroup legend="Matching Homes" options={lookup.candidates.map(record=>({value:record.id,label:homeAddressLabel(record),description:record.source==='Example'?'Fictional Example':'Saved Property Record'}))} value={selectedHome} onChange={setSelectedHome}/>
        </>:lookup.status==='not_found'?<p>We couldn’t find a saved record for that address. You can enter the details yourself.</p>:
          lookup.status==='refine'?<p>Please add a city or ZIP in the address box to narrow the matches.</p>:
          lookup.status==='unavailable'?<p>Property lookup is unavailable right now. You can try again or enter the details yourself.</p>:null}
        <div className={styles.inlineActions}>
          <button type="button" disabled={busy} className={styles.unknown} onClick={()=>{setLookup(null);setSelectedHome(undefined);void findHome();}}>Try Lookup Again</button>
          <button type="button" disabled={busy} className={styles.unknown} onClick={()=>{setLookup(null);setManualAddress(draft.address.line1);navigate('confirm-home');}}>Enter Details Myself</button>
        </div>
      </div>:null}
    </>;
    if(step==='confirm-home') return <>
      {!live?<div className={styles.mapPlaceholder}><span aria-hidden="true">⌖</span><span>Map Preview</span><span>A map is optional to continuing.</span></div>:null}
      <div className={styles.confirmCard}><p>{draft.address.line1}{draft.address.city||draft.address.postalCode?<><br/>{[draft.address.city,draft.address.region,draft.address.postalCode].filter(Boolean).join(', ')}</>:null}</p>
        <label className={styles.check}><input type="checkbox" checked={draft.address.confirmed} onChange={event=>update({...draft,address:{...draft.address,confirmed:event.target.checked}})}/>This Is the Home I Mean</label>
      </div><button type="button" className={styles.unknown} onClick={()=>navigate('address')}>Edit Address</button>
    </>;
    if(step==='home-facts') return <JourneyHomeFacts facts={draft.facts} record={draft.propertyMatch}
      onChange={(field,answer)=>update({...draft,facts:{...draft.facts,[field]:answer}})}
      onUnknownAll={()=>update({...draft,facts:Object.fromEntries(Object.keys(factLabels).map(key=>[key,{state:'unknown'}])) as GuidedJourneyDraft['facts']})}/>;
    if(step==='detail-level') return <JourneyChoiceGroup legend={title} value={draft.detailLevel==='unanswered'?undefined:draft.detailLevel} onChange={detailLevel=>update({...draft,detailLevel})} options={[
      {value:'include',label:'Add Home Details',description:'Tell us about updates, features and condition.'},
      {value:'skip',label:'Leave These for Later',description:'We can talk through them together.'},
    ]}/>;
    if(step==='renovations') {
      const selected=answered(draft.renovations)||[];
      return <fieldset className={styles.choices}><legend className={styles.srOnly}>Choose all improvements that apply.</legend>
        {[...renovations,{value:'none' as const,label:'None'}].map(item=>{
          const checked=item.value==='none'?draft.renovations.state==='answered'&&selected.length===0:selected.includes(item.value);
          return <label key={item.value} className={styles.choice} data-selected={checked}><input type="checkbox" checked={checked} onChange={()=>update(toggleRenovation(draft,item.value))}/><span>{item.label}</span></label>;
        })}
        <button type="button" className={styles.unknown} aria-pressed={draft.renovations.state==='unknown'} onClick={()=>update({...draft,renovations:{state:'unknown'}})}>Not Sure</button>
      </fieldset>;
    }
    if(step==='mortgage-balance'||step==='approval-amount') {
      const key=step==='mortgage-balance'?'mortgageBalanceCents':'preApprovedAmountCents';
      return <>
        <label className={styles.fieldLabel}>Approximate Amount in Dollars<input className={styles.input} inputMode="decimal" value={moneyInput} maxLength={12} placeholder="250000" onChange={event=>updateMoney(event.target.value)}/></label>
        <button type="button" className={styles.unknown} aria-pressed={draft[key].state==='unknown'} onClick={()=>{setMoneyInput('');update({...draft,[key]:{state:'unknown'}});}}>Not Sure</button>
      </>;
    }
    if(step==='review') return <dl className={styles.review}>{reviewRows(draft).map(row=><div key={row.step} className={styles.reviewRow}>
      <div><dt>{row.label}</dt><dd>{row.value}</dd></div><button type="button" className={styles.edit} aria-label={`Edit ${row.label}`} onClick={()=>edit(row.step)}>Edit</button>
    </div>)}</dl>;
    if(step==='contact') return <>
      <div className={styles.inputGrid}>
        <label className={`${styles.fieldLabel} ${styles.wide}`}>Your Name<input className={styles.input} autoComplete={live?'name':'off'} maxLength={120} value={draft.contact.name} onChange={event=>update({...draft,contact:{...draft.contact,name:event.target.value}})}/></label>
        <label className={`${styles.fieldLabel} ${styles.wide}`}>Email<input className={styles.input} type="email" autoComplete={live?'email':'off'} maxLength={180} value={draft.contact.email} onChange={event=>update({...draft,contact:{...draft.contact,email:event.target.value}})}/></label>
      </div>
      <div style={{marginTop:24}}><label className={styles.check}><input type="checkbox" checked={draft.contact.requestedContact} onChange={event=>update({...draft,contact:{...draft.contact,requestedContact:event.target.checked}})}/>I’d Like a Response About My Request.</label>
        <label className={styles.check}><input type="checkbox" checked={draft.contact.marketingOptIn} onChange={event=>update({...draft,contact:{...draft.contact,marketingOptIn:event.target.checked}})}/>Send Me Occasional Local Real Estate Updates. Optional.</label>
      </div>
      {live?<>
        <label aria-hidden="true" className={styles.srOnly}>Leave this field empty<input name="company" tabIndex={-1} autoComplete="off" maxLength={120} value={company} onChange={event=>setCompany(event.target.value)} /></label>
        <p className={styles.helper}>The real estate professional handling your request can use your address and answers to prepare for your conversation. Any financial amounts you chose to enter are saved with the request. Marketing emails are optional.</p>
        <a href="/iabs" target="_blank" rel="noopener noreferrer" className={styles.helper}>Brokerage Services Information</a>
      </>:<p className={styles.helper}>Use example contact details. This preview checks your answers locally. Contact and financial answers are not sent or saved here.</p>}
    </>;
    if(question) {
      const field=step as ChoiceField;
      const value=draft.choices[field].state==='unknown'?'__unknown':answered<string>(draft.choices[field]);
      const options:readonly {value:string;label:string;description?:string}[]=[...question.options.filter(option=>!(draft.mode==='buy'&&option.value==='not_buying')),{value:'__unknown',label:'Not Sure'}];
      return <JourneyChoiceGroup legend={question.title} value={value} options={options} onChange={value=>update(setChoice(draft,field,value))}/>;
    }
    return null;
  }

  return <GuidedJourneyShell title={title} description={description} section={section} sections={sections} property={propertyLabel(draft)}
    headingRef={headingRef} onSubmit={next} onBack={back} canGoBack={!receipt&&(step!=='intent'||finished)} busy={busy} error={error}
    live={Boolean(live)} final={step==='contact'} returnToReview={returnToReview} complete={finished||Boolean(receipt)} aside={<div className={styles.asideInner}>
      <p className={styles.asideEyebrow}>{live?'Keller and Westlake':'A Place to Start'}</p><h2 className={styles.asideTitle}>{live?'Your Seller Plan':'Make room for your next move.'}</h2>
      <p className={styles.asideCopy}>{live?'Tell us about your home and what you need help with first.':'A few details now can make the next conversation easier.'}</p>
      <HomeIllustration preview={!live}/>
      <ul className={styles.serviceList}><li>Pricing Review</li><li>Home Preparation</li><li>Move Planning</li></ul>
      {draft.mode?<div className={styles.homeContext}><small>{draft.mode==='buy'?'Finding a Home':'The Home We’re Talking About'}</small><p>{propertyLabel(draft)}</p>{draft.address.city&&draft.mode!=='buy'?<small>{draft.address.city}, {draft.address.region}</small>:null}</div>:null}
      {!live?<details className={styles.controls}><summary>Preview Controls</summary><p>Use fictional details. Answers disappear when this page reloads.</p>
        {submission.state.status==='prepared'?<div className={styles.recordNote}>
          <p>Version {submission.state.summary.version} request checked locally · {submission.state.summary.byteLength} bytes</p>
          <p>Last Prepared Request ID</p><output aria-live="off" aria-label="Last Prepared Request ID" style={{overflowWrap:'anywhere'}}>{submission.state.summary.submissionId}</output>
          <p>No save transport is connected. Retry keeps this ID until material answers change.</p>
        </div>:null}
        <label>Address Lookup Data<select disabled={busy} value={exampleLookup?'examples':'saved'} onChange={event=>{setExampleLookup(event.target.value==='examples');setLookup(null);setSelectedHome(undefined);setManualAddress(null);update(changeJourneyAddress(draft,draft.address.line1,true));}}>
          <option value="saved">Saved Public Property Records</option><option value="examples">Fictional Example Records</option>
        </select></label>
        {exampleLookup?<p>Try 100 Example Lane for two matches, or add Keller for one. These are fictional records.</p>:null}
        <label>Final Step Response<select value={previewResponse} disabled={busy} onChange={event=>setPreviewResponse(event.target.value as typeof previewResponse)}>
          <option value="instant">Complete Immediately</option><option value="loading">Show Loading, Then Complete</option><option value="error">Show Loading, Then an Error</option>
        </select></label>
        <button type="button" disabled={busy} className={styles.unknown} onClick={reset}>Reset Preview</button>
      </details>:null}
    </div>}>
    {fields()}
  </GuidedJourneyShell>;
}
