'use client';

import React, {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {
  answered,choiceQuestions,createInitialJourneyDraft,deriveSteps,factLabels,normalizeDraft,parseMoneyCents,
  propertyLabel,renovations,reviewRows,sectionFor,setChoice,toggleRenovation,validateStep,
  type Answer,type ChoiceField,type FactField,type GuidedJourneyDraft,type JourneyMode,type StepId,
} from '@/lib/marketing/guidedJourney';
import SequentialPhotoLabels, {type PhotoLabel} from '@/components/marketing/SequentialPhotoLabels';
import GuidedJourneyShell from './GuidedJourneyShell';
import JourneyChoiceGroup from './JourneyChoiceGroup';
import styles from './GuidedJourney.module.css';

const labels:readonly PhotoLabel[]=[
  {id:'pricing',text:'Pricing Review',anchor:'upperRight'},
  {id:'preparation',text:'Home Preparation',anchor:'middleLeft'},
  {id:'timing',text:'Move Planning',anchor:'lowerRight'},
];
const titles:Partial<Record<StepId,string>>={
  intent:'What’s your next move?',address:'Which home are you thinking of selling?',
  'confirm-home':'Have we got the right home?','home-facts':'What can you tell us about your home?',
  'detail-level':'Would you like to add a few home details?',renovations:'What have you updated?',
  'mortgage-balance':'About how much is left on the mortgage?','approval-amount':'How much were you pre-approved for?',
  review:'Does this look right?',contact:'How can we get in touch?',
};

function HomeIllustration() {
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
    <figcaption className={styles.artCaption}>Illustration · Your Photo Could Go Here</figcaption>
  </figure>;
}

export default function GuidedJourneyPrototype() {
  const [draft,setDraft]=useState(createInitialJourneyDraft);
  const [step,setStep]=useState<StepId>('intent');
  const [returnToReview,setReturnToReview]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [finished,setFinished]=useState(false);
  const [previewResponse,setPreviewResponse]=useState<'instant'|'loading'|'error'>('instant');
  const [moneyInput,setMoneyInput]=useState('');
  const headingRef=useRef<HTMLHeadingElement>(null);
  const inFlight=useRef(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const steps=deriveSteps(draft);
  const section=sectionFor(step);
  const sections=[...new Set(steps.map(sectionFor))];

  useEffect(()=>{headingRef.current?.focus();},[step,finished]);
  useEffect(()=>()=>{if(timer.current) clearTimeout(timer.current);},[]);
  function update(next:GuidedJourneyDraft) {setDraft(normalizeDraft(next));setError('');}
  function navigate(next:StepId) {
    setStep(next);setError('');
    const value=answered(next==='mortgage-balance'?draft.mortgageBalanceCents:next==='approval-amount'?draft.preApprovedAmountCents:{state:'unanswered'});
    setMoneyInput(value===undefined?'':String(value/100));
  }
  function edit(next:StepId) {setReturnToReview(true);navigate(next);}
  function back() {
    if(inFlight.current) return;
    if(finished){setFinished(false);navigate('review');return;}
    if(returnToReview){setReturnToReview(false);navigate('review');return;}
    const index=steps.indexOf(step);if(index>0) navigate(steps[index-1]);
  }
  function next() {
    if(inFlight.current||finished) return;
    const invalid=validateStep(step,draft);
    if(invalid){setError(invalid);return;}
    setError('');
    if(returnToReview||step==='review') {
      const needsAnswer=steps.slice(0,steps.indexOf('review')).find(candidate=>validateStep(candidate,draft)!==null);
      if(needsAnswer){setReturnToReview(true);navigate(needsAnswer);return;}
      if(returnToReview){setReturnToReview(false);navigate('review');return;}
    }
    if(step!=='contact') {
      const destination=steps[steps.indexOf(step)+1];if(destination) navigate(destination);return;
    }
    if(previewResponse==='instant'){setFinished(true);return;}
    // Explicit preview controls only. No request, record, email or booking is created.
    inFlight.current=true;setBusy(true);
    timer.current=setTimeout(()=>{
      timer.current=null;inFlight.current=false;setBusy(false);
      if(previewResponse==='error') setError('Preview error: your answers are still here. Choose another preview response and try again.');
      else setFinished(true);
    },800);
  }
  function useSampleHome() {
    update({...draft,address:{line1:'100 Example Lane',city:'Keller',region:'TX',postalCode:'76248',confirmed:false},facts:{
      bedrooms:{state:'answered',value:3},fullBaths:{state:'answered',value:2},halfBaths:{state:'answered',value:0},stories:{state:'answered',value:1},yearBuilt:{state:'answered',value:2010},squareFeet:{state:'answered',value:2100},
    }});
  }
  function updateFact(field:FactField,value:string) {
    const answer:Answer<number>=value===''?{state:'unanswered'}:{state:'answered',value:Number(value)};
    update({...draft,facts:{...draft.facts,[field]:answer}});
  }
  function updateMoney(value:string) {
    setMoneyInput(value);const cents=parseMoneyCents(value);
    const answer:Answer<number>=cents===null?{state:'unanswered'}:{state:'answered',value:cents};
    update({...draft,[step==='mortgage-balance'?'mortgageBalanceCents':'preApprovedAmountCents']:answer});
  }
  const question=step in choiceQuestions?choiceQuestions[step as ChoiceField]:null;
  const title=finished?'Your next move, in view.':titles[step]||question?.title||'';
  const description=finished?'This is a preview of the journey. Nothing has been submitted or booked.':
    step==='intent'?'Start where you are. We’ll take the rest one question at a time.':
    step==='address'?'For this preview, use the sample home or fictional details. Answers stay on this page.':
    step==='home-facts'?'Add what you know. It’s fine to leave something for a conversation.':
    step==='detail-level'?'These questions can help with preparation. You can also leave them for later.':
    step==='review'?'You can change any answer before moving on.':
    step==='contact'?'Try the contact step with example details. This preview sends nothing.':
    step==='mortgage-balance'||step==='approval-amount'?'An approximate figure is enough for this preview. You can choose Not Sure.':undefined;

  function fields():React.ReactNode {
    if(finished) return <div className={styles.receipt}>
      <p className={styles.eyebrow}>Preview Complete</p>
      <h2>A conversation comes next.</h2>
      <p>In the connected flow, your saved request would lead to a consultation with your agent. No request was sent here.</p>
      <p>{draft.mode==='buy'?'You can start exploring homes now.':'You can use the current seller form when you’re ready to make a real request.'}</p>
      <div className={styles.inlineActions}>
        <Link href={draft.mode==='buy'?'/explorer':'/seller-plan#request'} className={styles.next}>{draft.mode==='buy'?'Open Explorer':'Open Current Seller Form'}</Link>
        <button type="button" className={styles.unknown} onClick={()=>{setDraft(createInitialJourneyDraft());setFinished(false);setReturnToReview(false);navigate('intent');}}>Start Again</button>
      </div>
    </div>;
    if(step==='intent') return <JourneyChoiceGroup<JourneyMode> legend={title} value={draft.mode||undefined} onChange={mode=>update({...draft,mode})} options={[
      {value:'sell',label:'Sell My Home',description:'Get ready for the sale and plan the next step.'},
      {value:'buy',label:'Find a Home',description:'Work out what you want before you start looking.'},
      {value:'both',label:'Buy and Sell',description:'Keep both parts of your move together.'},
    ]}/>;
    if(step==='address') return <>
      <div className={styles.inputGrid}>{([
        ['line1','Street Address','street-address'],['city','City','address-level2'],['region','State','address-level1'],['postalCode','ZIP Code','postal-code'],
      ] as const).map(([field,label,autoComplete])=><label key={field} className={`${styles.fieldLabel} ${field==='line1'?styles.wide:''}`}>{label}
        <input className={styles.input} maxLength={field==='line1'?180:field==='region'?2:field==='postalCode'?10:100} autoComplete={autoComplete} value={draft.address[field]}
          onChange={event=>update({...draft,address:{...draft.address,[field]:field==='region'?event.target.value.toUpperCase():event.target.value,confirmed:false}})}/>
      </label>)}</div>
      <button type="button" className={styles.unknown} onClick={useSampleHome}>Use a Fictional Sample Home</button>
    </>;
    if(step==='confirm-home') return <>
      <div className={styles.mapPlaceholder}><span aria-hidden="true">⌖</span><span>Map Preview</span><span>A map is optional to continuing.</span></div>
      <div className={styles.confirmCard}><p>{draft.address.line1}<br/>{draft.address.city}, {draft.address.region} {draft.address.postalCode}</p>
        <label className={styles.check}><input type="checkbox" checked={draft.address.confirmed} onChange={event=>update({...draft,address:{...draft.address,confirmed:event.target.checked}})}/>This Is the Home I Mean</label>
      </div><button type="button" className={styles.unknown} onClick={()=>navigate('address')}>Edit Address</button>
    </>;
    if(step==='home-facts') return <div>{(Object.keys(factLabels) as FactField[]).map(field=><div key={field} className={styles.fact}>
      <label htmlFor={`fact-${field}`} className={styles.fieldLabel}>{factLabels[field]}<span className={styles.helper}>{draft.facts[field].state==='unknown'?'Not Sure':''}</span></label>
      <div className={styles.factValue}><input id={`fact-${field}`} className={styles.input} type="number" inputMode="numeric" min={field==='yearBuilt'?1600:field==='squareFeet'||field==='stories'?1:0} step="1"
        value={answered(draft.facts[field])??''} onChange={event=>updateFact(field,event.target.value)}/>
        <button type="button" className={styles.unknown} onClick={()=>update({...draft,facts:{...draft.facts,[field]:{state:'unknown'}}})}>Not Sure</button>
      </div>
    </div>)}<button type="button" className={styles.unknown} onClick={()=>update({...draft,facts:Object.fromEntries(Object.keys(factLabels).map(key=>[key,{state:'unknown'}])) as GuidedJourneyDraft['facts']})}>I’m Not Sure About These Details</button></div>;
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
        <label className={`${styles.fieldLabel} ${styles.wide}`}>Your Name<input className={styles.input} autoComplete="off" maxLength={120} value={draft.contact.name} onChange={event=>update({...draft,contact:{...draft.contact,name:event.target.value}})}/></label>
        <label className={`${styles.fieldLabel} ${styles.wide}`}>Email<input className={styles.input} type="email" autoComplete="off" maxLength={180} value={draft.contact.email} onChange={event=>update({...draft,contact:{...draft.contact,email:event.target.value}})}/></label>
      </div>
      <div style={{marginTop:24}}><label className={styles.check}><input type="checkbox" checked={draft.contact.requestedContact} onChange={event=>update({...draft,contact:{...draft.contact,requestedContact:event.target.checked}})}/>I’d Like a Response About My Request.</label>
        <label className={styles.check}><input type="checkbox" checked={draft.contact.marketingOptIn} onChange={event=>update({...draft,contact:{...draft.contact,marketingOptIn:event.target.checked}})}/>Send Me Occasional Local Real Estate Updates. Optional.</label>
      </div><p className={styles.helper}>These choices demonstrate the form. They do not subscribe you or send a request in this preview.</p>
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
    headingRef={headingRef} onSubmit={next} onBack={back} canGoBack={step!=='intent'||finished} busy={busy} error={error}
    final={step==='contact'} returnToReview={returnToReview} complete={finished} aside={<div className={styles.asideInner}>
      <p className={styles.asideEyebrow}>A Place to Start</p><h2 className={styles.asideTitle}>Make room for your next move.</h2>
      <p className={styles.asideCopy}>A few details now can make the next conversation easier.</p>
      <HomeIllustration/>
      <ul className={styles.serviceList}><li>Pricing Review</li><li>Home Preparation</li><li>Move Planning</li></ul>
      {draft.mode?<div className={styles.homeContext}><small>{draft.mode==='buy'?'Finding a Home':'The Home We’re Talking About'}</small><p>{propertyLabel(draft)}</p>{draft.address.city&&draft.mode!=='buy'?<small>{draft.address.city}, {draft.address.region}</small>:null}</div>:null}
      <details className={styles.controls}><summary>Preview Controls</summary><p>Use fictional details. Answers disappear when this page reloads.</p>
        <label>Final Step Response<select value={previewResponse} disabled={busy} onChange={event=>setPreviewResponse(event.target.value as typeof previewResponse)}>
          <option value="instant">Complete Immediately</option><option value="loading">Show Loading, Then Complete</option><option value="error">Show Loading, Then an Error</option>
        </select></label>
        <button type="button" disabled={busy} className={styles.unknown} onClick={()=>{setDraft(createInitialJourneyDraft());setFinished(false);setReturnToReview(false);navigate('intent');}}>Reset Preview</button>
      </details>
    </div>}>
    {fields()}
  </GuidedJourneyShell>;
}
