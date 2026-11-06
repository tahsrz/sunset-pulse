import React, {useSyncExternalStore,type ReactNode,type RefObject} from 'react';
import Link from 'next/link';
import {type SectionId} from '@/lib/marketing/guidedJourney';
import styles from './GuidedJourney.module.css';

export const sectionLabels:Record<SectionId,string>={start:'Getting Started',home:'Your Home',move:'Your Move',buying:'Your Search',review:'Your Plan'};
type Props={
  title:string;description?:string;section:SectionId;sections:SectionId[];property:string;
  headingRef:RefObject<HTMLHeadingElement|null>;children:ReactNode;aside:ReactNode;
  exitLink?: { href: string; label: string };
  onSubmit():void;onBack():void;canGoBack:boolean;busy:boolean;error:string;final:boolean;returnToReview:boolean;complete:boolean;live?:boolean;
};
const subscribeToHydration=()=>()=>{};
const browserReady=()=>true;
const serverReady=()=>false;

export default function GuidedJourneyShell(props:Props) {
  const hydrated=useSyncExternalStore(subscribeToHydration,browserReady,serverReady);
  const controlsDisabled=props.busy||(props.live&&!hydrated);
  // Leaving the focused layout also needs a fresh document and its normal site chrome.
  const SiteLink=props.live?'a':Link;
  return <div className={styles.root}>
    <header className={styles.masthead}>
      <SiteLink href="/" className={styles.brand}>Sunset Pulse<span>North Texas Real Estate</span></SiteLink>
      {!props.live?<span className={styles.preview}>Design Preview · No Request Is Saved</span>:null}
      <SiteLink href={props.exitLink?.href ?? '/seller-plan#request'} className={props.live?styles.shortLink:styles.liveLink}>
        {props.exitLink?.label ?? (props.live?'Short Seller Form':'Current Seller Form ↗')}
      </SiteLink>
    </header>
    <div className={styles.layout} data-start={props.section==='start'}>
      <aside className={styles.aside}>{props.aside}</aside>
      <main className={styles.main} id="journey-content">
        <nav className={styles.progress} aria-label="Your journey">
          <ol>{props.sections.map((section,index)=><li key={section} aria-current={props.section===section?'step':undefined}>
            <span aria-hidden="true">{String(index+1).padStart(2,'0')}</span>{sectionLabels[section]}
          </li>)}</ol>
        </nav>
        <form onSubmit={event=>{event.preventDefault();props.onSubmit();}} noValidate className={styles.form}>
          <div className={styles.questionHeader}>
            <p className={styles.eyebrow}>{sectionLabels[props.section]}</p>
            <h1 ref={props.headingRef} tabIndex={-1} className={styles.question}>{props.title}</h1>
            {props.description?<p className={styles.description}>{props.description}</p>:null}
          </div>
          <fieldset disabled={controlsDisabled} className={styles.fields}>{props.children}</fieldset>
          <p role="alert" className={styles.error}>{props.error}</p>
          {!props.complete||props.canGoBack?<footer className={styles.footer}>
            <div className={styles.footerContext}><span className={styles.contextDot} aria-hidden="true"/><span>{props.property}</span></div>
            <div className={styles.actions}>
              <button type="button" disabled={!props.canGoBack||controlsDisabled} onClick={props.onBack} className={styles.back}>{props.complete?'Review My Answers':'← Back'}</button>
              {!props.complete?<button type="submit" disabled={controlsDisabled} aria-busy={props.busy} className={styles.next}>
                {props.busy?'Loading…':props.returnToReview?'Back to Review':props.final?(props.live?'Send Request':'Preview My Request'):'Next →'}
              </button>:null}
            </div>
          </footer>:null}
        </form>
      </main>
    </div>
  </div>;
}
