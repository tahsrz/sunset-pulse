import React from 'react';
import {answered,factLabels,type Answer,type FactField,type GuidedJourneyDraft} from '@/lib/marketing/guidedJourney';
import {type HomeFactsRecord} from '@/lib/marketing/homeFactsLookup';
import styles from './GuidedJourney.module.css';

type Props={facts:GuidedJourneyDraft['facts'];record:HomeFactsRecord|null;onChange(field:FactField,answer:Answer<number>):void;onUnknownAll():void};
export default function JourneyHomeFacts({facts,record,onChange,onUnknownAll}:Props) {
  return <div>
    {record?<div className={styles.recordNote}>
      <p>{record.source==='Example'?'Fictional Example Record':record.source==='MLS'?'From a Saved MLS Record':'From a Saved Property Record'}</p>
      <p>{record.recordedAt?`Record updated ${new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(record.recordedAt))}. `:'Record date unavailable. '}Please check these details.</p>
      {record.totalBathrooms!==null?<p>The record lists {record.totalBathrooms} bathrooms in total. Confirm the full and half bathrooms below.</p>:null}
    </div>:null}
    {(Object.keys(factLabels) as FactField[]).map(field=>{
      const value=answered(facts[field]);
      const minimum=field==='yearBuilt'?1600:field==='squareFeet'||field==='stories'?1:0;
      const maximum=field==='yearBuilt'?new Date().getFullYear()+2:field==='squareFeet'?1_000_000:field==='stories'?100:30;
      const count=field!=='yearBuilt'&&field!=='squareFeet';
      return <div key={field} className={styles.fact}>
        <div><label htmlFor={`fact-${field}`} className={styles.fieldLabel}>{factLabels[field]}</label><span id={`fact-help-${field}`} className={styles.helper}>{facts[field].state==='unknown'?'Not Sure':record?.facts[field]!==undefined&&value===record.facts[field]?'From Property Record':''}</span></div>
        <div className={styles.factValue}><div className={count?styles.stepper:undefined}>
          {count?<button type="button" aria-label={`Decrease ${factLabels[field]}`} disabled={value===undefined||value<=minimum} onClick={()=>onChange(field,{state:'answered',value:value!-1})}>−</button>:null}
          <input id={`fact-${field}`} aria-describedby={`fact-help-${field}`} className={styles.input} type="number" inputMode="numeric" min={minimum} max={maximum} step="1" value={value??''}
            onChange={event=>onChange(field,event.target.value===''?{state:'unanswered'}:{state:'answered',value:Number(event.target.value)})}/>
          {count?<button type="button" aria-label={`Increase ${factLabels[field]}`} disabled={value!==undefined&&value>=maximum} onClick={()=>onChange(field,{state:'answered',value:value===undefined?Math.max(minimum,1):value+1})}>+</button>:null}
        </div><button type="button" className={styles.unknown} onClick={()=>onChange(field,{state:'unknown'})}>Not Sure</button></div>
      </div>;
    })}
    <button type="button" className={styles.unknown} onClick={onUnknownAll}>I’m Not Sure About These Details</button>
  </div>;
}
