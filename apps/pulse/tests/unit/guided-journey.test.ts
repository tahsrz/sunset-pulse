import {describe,it,expect} from 'vitest';
import {answered,choiceQuestions,createInitialJourneyDraft,deriveSteps,normalizeDraft,parseMoneyCents,reviewRows,setChoice,toggleRenovation,validateStep} from '@/lib/marketing/guidedJourney';

describe('guided journey branches and private draft state',()=>{
  it('starts without invented answers',()=>{
    const draft=createInitialJourneyDraft();expect(deriveSteps(draft)).toEqual(['intent']);expect(validateStep('intent',draft)).toBeTruthy();
    expect(draft.facts.bedrooms.state).toBe('unanswered');expect(draft.contact.marketingOptIn).toBe(false);
  });
  it('keeps the short seller path free of optional and buyer questions',()=>{
    const draft={...createInitialJourneyDraft(),mode:'sell' as const,detailLevel:'skip' as const};
    expect(deriveSteps(draft)).toEqual(['intent','address','confirm-home','home-facts','detail-level','relationship','selling-window','selling-preference','mortgage','review','contact']);
  });
  it('includes home details only when explicitly requested',()=>{
    const draft={...createInitialJourneyDraft(),mode:'sell' as const,detailLevel:'include' as const};
    expect(deriveSteps(draft)).toContain('foundation');expect(deriveSteps({...draft,detailLevel:'skip'})).not.toContain('foundation');
  });
  it('does not ask buyer-only visitors about a current home',()=>{
    const steps=deriveSteps({...createInitialJourneyDraft(),mode:'buy'});
    expect(steps).toEqual(['intent','buying-stage','destination','construction','representation','pre-approval','review','contact']);
  });
  it('clears a mortgage amount when No is selected and does not resurrect it',()=>{
    let draft=setChoice({...createInitialJourneyDraft(),mode:'both'},'mortgage','yes');
    draft={...draft,mortgageBalanceCents:{state:'answered',value:0}};
    expect(deriveSteps(draft)).toContain('mortgage-balance');expect(answered(draft.mortgageBalanceCents)).toBe(0);
    draft=setChoice(draft,'mortgage','no');expect(deriveSteps(draft)).not.toContain('mortgage-balance');
    expect(draft.mortgageBalanceCents.state).toBe('unanswered');
    expect(setChoice(draft,'mortgage','yes').mortgageBalanceCents.state).toBe('unanswered');
  });
  it('clears pre-approval amount and review text when the parent changes',()=>{
    let draft=setChoice({...createInitialJourneyDraft(),mode:'both'},'pre-approval','yes');
    draft={...draft,preApprovedAmountCents:{state:'answered',value:45000000}};
    expect(deriveSteps(draft)).toContain('approval-amount');
    draft=setChoice(draft,'pre-approval','no');expect(deriveSteps(draft)).not.toContain('approval-amount');
    expect(draft.preApprovedAmountCents.state).toBe('unanswered');expect(reviewRows(draft).some(row=>row.step==='approval-amount')).toBe(false);
  });
  it('removes buyer context when someone is no longer buying',()=>{
    let draft=setChoice({...createInitialJourneyDraft(),mode:'both'},'pre-approval','yes');
    draft=setChoice(draft,'buying-stage','not_buying');
    expect(deriveSteps(draft)).not.toContain('pre-approval');expect(draft.choices['pre-approval'].state).toBe('unanswered');
  });
  it('keeps None exclusive and canonicalizes renovation choices',()=>{
    let draft=toggleRenovation({...createInitialJourneyDraft(),mode:'sell',detailLevel:'include'},'kitchen');draft=toggleRenovation(draft,'paint');
    expect(answered(draft.renovations)).toEqual(['kitchen','paint']);
    draft=toggleRenovation(draft,'none');expect(answered(draft.renovations)).toEqual([]);
    expect(answered(toggleRenovation(draft,'lighting').renovations)).toEqual(['lighting']);
  });
  it('clears optional home answers when they are left for later',()=>{
    const original=setChoice(toggleRenovation({...createInitialJourneyDraft(),mode:'sell',detailLevel:'include'},'kitchen'),'countertop','quartz');
    const next=normalizeDraft({...original,detailLevel:'skip'});
    expect(next.renovations.state).toBe('unanswered');expect(next.choices.countertop.state).toBe('unanswered');
    expect(answered(original.choices.countertop)).toBe('quartz');
    expect(normalizeDraft({...next,detailLevel:'include'}).renovations.state).toBe('unanswered');
  });
  it('removes hidden seller context when switching to buying only',()=>{
    const original=setChoice({...createInitialJourneyDraft(),mode:'both',address:{line1:'100 Example Lane',city:'Keller',region:'TX',postalCode:'76248',confirmed:true}},'relationship','owner');
    const next=normalizeDraft({...original,mode:'buy'});
    expect(next.address.line1).toBe('');expect(next.address.confirmed).toBe(false);
    expect(next.choices.relationship.state).toBe('unanswered');expect(original.address.line1).toBe('100 Example Lane');
    const seller=normalizeDraft({...setChoice({...createInitialJourneyDraft(),mode:'both'},'buying-stage','searching'),mode:'sell'});
    expect(seller.choices['buying-stage'].state).toBe('unanswered');
  });
  it('does not mutate the draft while normalizing hidden fields',()=>{
    const initial={...createInitialJourneyDraft(),mode:'sell' as const,preApprovedAmountCents:{state:'answered' as const,value:100}};
    const next=normalizeDraft(initial);expect(answered(initial.preApprovedAmountCents)).toBe(100);expect(next.preApprovedAmountCents.state).toBe('unanswered');
  });
  it('rejects a choice that is absent from the current definition',()=>{
    expect(()=>setChoice(createInitialJourneyDraft(),'pool','guaranteed_offer')).toThrow('Unsupported');
    expect(()=>setChoice({...createInitialJourneyDraft(),mode:'buy'},'buying-stage','not_buying')).toThrow();
  });
  it('validates all defined choice options and explicit unknowns',()=>{
    for(const field of Object.keys(choiceQuestions) as Array<keyof typeof choiceQuestions>) {
      for(const option of choiceQuestions[field].options) expect(validateStep(field,setChoice({...createInitialJourneyDraft(),mode:'both',detailLevel:'include'},field,option.value))).toBeNull();
      expect(validateStep(field,setChoice({...createInitialJourneyDraft(),mode:'both',detailLevel:'include'},field,'__unknown'))).toBeNull();
    }
  });
  it.each([['',null],['250000',25000000],['12.34',1234],['0',0],['-1',null],['1.001',null],['1e5',null],['NaN',null],['100000001',null]])('parses dollars without silently coercing %s', (value,expected)=>{
    expect(parseMoneyCents(String(value))).toBe(expected);
  });
  it('requires confirmation after editing an address and rejects invalid address pieces',()=>{
    const draft=createInitialJourneyDraft();expect(validateStep('address',draft)).toBeTruthy();expect(validateStep('confirm-home',draft)).toBeTruthy();
    draft.address={line1:'100 Example Lane',city:'Keller',region:'TX',postalCode:'76248',confirmed:true};
    expect(validateStep('address',draft)).toBeNull();expect(validateStep('confirm-home',draft)).toBeNull();
  });
  it('bounds future years and preserves explicit unknown versus zero',()=>{
    const draft=createInitialJourneyDraft();for(const field of Object.keys(draft.facts) as Array<keyof typeof draft.facts>) draft.facts[field]={state:'unknown'};
    draft.facts.halfBaths={state:'answered',value:0};expect(validateStep('home-facts',draft,new Date('2026-11-04'))).toBeNull();
    draft.facts.yearBuilt={state:'answered',value:2030};expect(validateStep('home-facts',draft,new Date('2026-11-04'))).toMatch(/year built/);
  });
  it('keeps marketing permission optional but requires requested contact',()=>{
    const draft=createInitialJourneyDraft();draft.contact={name:'Taylor Example',email:'taylor@example.test',requestedContact:true,marketingOptIn:false};
    expect(validateStep('contact',draft)).toBeNull();draft.contact.requestedContact=false;expect(validateStep('contact',draft)).toBeTruthy();
  });
});
