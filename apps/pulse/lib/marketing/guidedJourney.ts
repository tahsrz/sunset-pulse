import type {HomeFactsRecord} from './homeFactsLookup';

export type Answer<T> = { state: 'unanswered' | 'unknown' | 'skipped' } | { state: 'answered'; value: T };
export type JourneyMode = 'sell' | 'buy' | 'both';
type Option = { value: string; label: string; description?: string };
type Question = { title: string; section: 'home' | 'move' | 'buying'; options: readonly Option[]; help?: string };

export const choiceQuestions = {
  countertop: { title: 'What kind of kitchen countertops do you have?', section: 'home', options: [
    {value:'granite',label:'Granite'}, {value:'quartz',label:'Quartz'}, {value:'tile',label:'Tile'}, {value:'solid_surface',label:'Solid Surface'}, {value:'laminate',label:'Laminate'}, {value:'other',label:'Other'},
  ] },
  appliances: { title: 'What kind of appliances do you have?', section: 'home', options: [
    {value:'stainless',label:'Stainless Steel'}, {value:'black',label:'Black'}, {value:'white',label:'White'}, {value:'mixed',label:'A Mix'}, {value:'other',label:'Other'},
  ] },
  'kitchen-floor': { title: 'What flooring is in your kitchen?', section: 'home', options: [
    {value:'tile',label:'Tile'}, {value:'hardwood',label:'Hardwood'}, {value:'laminate',label:'Laminate'}, {value:'carpet',label:'Carpet'}, {value:'concrete',label:'Concrete'}, {value:'mixed',label:'A Mix'}, {value:'other',label:'Other'},
  ] },
  garage: { title: 'How many garage spaces do you have?', section: 'home', options: [
    {value:'0',label:'No Garage'}, {value:'1',label:'1'}, {value:'2',label:'2'}, {value:'3',label:'3'}, {value:'4_plus',label:'4 or More'},
  ] },
  pool: { title: 'Does your home have a pool?', section: 'home', options: [
    {value:'in_ground',label:'In-ground Pool'}, {value:'above_ground',label:'Above-ground Pool'}, {value:'community',label:'Community Pool'}, {value:'none',label:'No Pool'},
  ] },
  foundation: { title: 'What do you know about the foundation?', section: 'home', options: [
    {value:'no_known_issues',label:'No Known Issues'}, {value:'past_repairs',label:'Repairs Were Made'}, {value:'possible_repairs',label:'It May Need Repairs'},
  ] },
  'overall-condition': { title: 'How would you describe your home today?', section: 'home', options: [
    {value:'ready',label:'Ready to List',description:'Mostly ready after a clean and tidy.'},
    {value:'normal_wear',label:'Normal Wear',description:'A few updates or small fixes would help.'},
    {value:'repairs',label:'Some Repairs Needed',description:'There are specific things to work through.'},
    {value:'major_repairs',label:'Major Repairs Needed',description:'Several areas need attention.'},
  ] },
  relationship: { title: 'What is your connection to this home?', section: 'move', options: [
    {value:'owner',label:'I Own It'}, {value:'agent',label:'I’m an Agent'}, {value:'other',label:'Something Else'},
  ] },
  'selling-window': { title: 'When are you thinking about selling?', section: 'move', options: [
    {value:'within_3_months',label:'Within 3 Months'}, {value:'3_to_6_months',label:'3–6 Months'}, {value:'6_to_12_months',label:'6–12 Months'}, {value:'after_12_months',label:'More Than a Year Away'}, {value:'not_set',label:'I’m Still Exploring'},
  ] },
  'selling-preference': { title: 'What would you like help with first?', section: 'move', options: [
    {value:'pricing',label:'Discuss a Price'}, {value:'preparation',label:'Get Ready to List'}, {value:'move',label:'Plan My Sale and Move'}, {value:'explore',label:'Work Out My Options'},
  ] },
  mortgage: { title: 'Is there a mortgage on your current home?', section: 'move', options: [
    {value:'yes',label:'Yes'}, {value:'no',label:'No'},
  ] },
  'buying-stage': { title: 'Where are you in your home search?', section: 'buying', options: [
    {value:'exploring',label:'Just Starting'}, {value:'searching',label:'Looking at Homes'}, {value:'found_home',label:'I’ve Found a Home'}, {value:'under_contract',label:'I’m Under Contract'}, {value:'not_buying',label:'I’m Not Buying Right Now'},
  ] },
  destination: { title: 'Are you staying in North Texas?', section: 'buying', options: [
    {value:'local',label:'Yes'}, {value:'outside',label:'I’m Moving Elsewhere'}, {value:'open',label:'I’m Considering Both'},
  ] },
  construction: { title: 'What kind of home are you looking for?', section: 'buying', options: [
    {value:'new',label:'New Construction'}, {value:'resale',label:'An Existing Home'}, {value:'either',label:'I’m Open to Either'},
  ] },
  representation: { title: 'Are you already working with an agent?', section: 'buying', options: [
    {value:'yes',label:'Yes'}, {value:'no',label:'No'},
  ] },
  'pre-approval': { title: 'Have you been pre-approved for a mortgage?', section: 'buying', options: [
    {value:'yes',label:'Yes'}, {value:'no',label:'Not Yet'},
  ] },
} as const satisfies Record<string, Question>;

export type ChoiceField = keyof typeof choiceQuestions;
type ChoiceValue<K extends ChoiceField> = (typeof choiceQuestions)[K]['options'][number]['value'];
type ChoiceAnswers = { [K in ChoiceField]: Answer<ChoiceValue<K>> };
export const factLabels = { bedrooms:'Bedrooms', fullBaths:'Full Bathrooms', halfBaths:'Half Bathrooms', stories:'Stories', yearBuilt:'Year Built', squareFeet:'Square Feet' } as const;
export type FactField = keyof typeof factLabels;
export const renovations = [
  {value:'kitchen',label:'Kitchen Cabinets'}, {value:'bath',label:'Primary Bathroom'}, {value:'floors',label:'Flooring'}, {value:'paint',label:'Interior Paint'}, {value:'lighting',label:'Lighting'},
] as const;
export type Renovation = typeof renovations[number]['value'];
export type StepId = ChoiceField | 'intent' | 'address' | 'confirm-home' | 'home-facts' | 'detail-level' | 'renovations' | 'mortgage-balance' | 'approval-amount' | 'review' | 'contact';
export type SectionId = 'start' | 'home' | 'move' | 'buying' | 'review';
export type GuidedJourneyDraft = {
  mode: JourneyMode | null;
  address: {line1:string;city:string;region:string;postalCode:string;confirmed:boolean};
  facts: Record<FactField, Answer<number>>;
  propertyMatch: HomeFactsRecord | null;
  choices: ChoiceAnswers;
  detailLevel: 'unanswered' | 'include' | 'skip';
  renovations: Answer<Renovation[]>;
  mortgageBalanceCents: Answer<number>;
  preApprovedAmountCents: Answer<number>;
  contact: {name:string;email:string;requestedContact:boolean;marketingOptIn:boolean};
};
export const answered = <T,>(answer: Answer<T>): T | undefined => answer.state==='answered'?answer.value:undefined;
export const isAnswered = <T,>(answer: Answer<T>) => answer.state!=='unanswered';
export function createInitialJourneyDraft(): GuidedJourneyDraft {
  return {
    mode:null,address:{line1:'',city:'',region:'',postalCode:'',confirmed:false},propertyMatch:null,
    facts:{bedrooms:{state:'unanswered'},fullBaths:{state:'unanswered'},halfBaths:{state:'unanswered'},stories:{state:'unanswered'},yearBuilt:{state:'unanswered'},squareFeet:{state:'unanswered'}},
    choices:Object.fromEntries(Object.keys(choiceQuestions).map(key=>[key,{state:'unanswered'}])) as ChoiceAnswers,
    detailLevel:'unanswered',renovations:{state:'unanswered'},mortgageBalanceCents:{state:'unanswered'},preApprovedAmountCents:{state:'unanswered'},
    contact:{name:'',email:'',requestedContact:false,marketingOptIn:false},
  };
}
export function includesBuying(draft: GuidedJourneyDraft) {
  return draft.mode==='buy' || (draft.mode==='both' && answered(draft.choices['buying-stage'])!=='not_buying');
}
export function normalizeDraft(input: GuidedJourneyDraft): GuidedJourneyDraft {
  const draft = { ...input, choices:{...input.choices}, renovations:input.renovations.state==='answered'?{state:'answered' as const,value:[...new Set(input.renovations.value)].sort()}:input.renovations };
  if(draft.mode==='buy') {
    const empty=createInitialJourneyDraft();
    draft.address=empty.address;draft.facts=empty.facts;draft.propertyMatch=null;draft.detailLevel='unanswered';
    for(const field of ['relationship','selling-window','selling-preference','mortgage'] as const) draft.choices[field]={state:'unanswered'};
  }
  if(draft.detailLevel!=='include') {
    draft.renovations={state:'unanswered'};
    for(const field of ['countertop','appliances','kitchen-floor','garage','pool','foundation','overall-condition'] as const) draft.choices[field]={state:'unanswered'};
  }
  if(draft.mode==='sell') draft.choices['buying-stage']={state:'unanswered'};
  if(answered(draft.choices.mortgage)!=='yes') draft.mortgageBalanceCents={state:'unanswered'};
  if(!includesBuying(draft)) {
    for(const field of ['destination','construction','representation','pre-approval'] as const) draft.choices[field]={state:'unanswered'};
  }
  if(!includesBuying(draft) || answered(draft.choices['pre-approval'])!=='yes') draft.preApprovedAmountCents={state:'unanswered'};
  return draft;
}
export function setChoice<K extends ChoiceField>(draft: GuidedJourneyDraft, field:K, value:string): GuidedJourneyDraft {
  if(value==='__unknown') return normalizeDraft({...draft,choices:{...draft.choices,[field]:{state:'unknown'}}});
  if(!choiceQuestions[field].options.some(option=>option.value===value)) throw new Error('Unsupported answer.');
  if(draft.mode==='buy' && field==='buying-stage' && value==='not_buying') throw new Error('Choose a buying stage.');
  // The option membership check above bounds this dynamic property assignment.
  const choices={...draft.choices};choices[field]={state:'answered',value} as ChoiceAnswers[K];
  return normalizeDraft({...draft,choices});
}
/** A new property must not inherit another home's facts or condition/loan answers. */
export function changeJourneyAddress(draft:GuidedJourneyDraft,line1:string,force=false):GuidedJourneyDraft {
  if(!force&&line1===draft.address.line1) return draft;
  const empty=createInitialJourneyDraft();
  const choices={...draft.choices};
  for(const field of ['countertop','appliances','kitchen-floor','garage','pool','foundation','overall-condition','relationship','mortgage'] as const) choices[field]={state:'unanswered'};
  return {...draft,address:{...empty.address,line1},propertyMatch:null,facts:empty.facts,choices,
    detailLevel:'unanswered',renovations:{state:'unanswered'},mortgageBalanceCents:{state:'unanswered'}};
}
export function applyHomeFactsRecord(draft:GuidedJourneyDraft,record:HomeFactsRecord):GuidedJourneyDraft {
  const base=draft.propertyMatch&&draft.propertyMatch.id!==record.id?changeJourneyAddress(draft,record.address.line1,true):draft;
  const facts={...base.facts};
  for(const field of Object.keys(record.facts) as FactField[]) {
    const value=record.facts[field];
    if(facts[field].state==='unanswered'&&value!==undefined) facts[field]={state:'answered',value};
  }
  return {...base,address:{...record.address,confirmed:false},facts,propertyMatch:record};
}
export function toggleRenovation(draft:GuidedJourneyDraft,value:Renovation|'none'):GuidedJourneyDraft {
  const current=answered(draft.renovations)||[];
  const next=value==='none'?[]:current.includes(value)?current.filter(item=>item!==value):[...current,value];
  return normalizeDraft({...draft,renovations:{state:'answered',value:next}});
}
export function deriveSteps(draft:GuidedJourneyDraft):StepId[] {
  const result:StepId[]=['intent'];
  if(!draft.mode) return result;
  if(draft.mode!=='buy') {
    result.push('address','confirm-home','home-facts','detail-level');
    if(draft.detailLevel==='include') result.push('renovations','countertop','appliances','kitchen-floor','garage','pool','foundation','overall-condition');
    result.push('relationship','selling-window','selling-preference','mortgage');
    if(answered(draft.choices.mortgage)==='yes') result.push('mortgage-balance');
  }
  if(draft.mode!=='sell') result.push('buying-stage');
  if(includesBuying(draft)) {
    result.push('destination','construction','representation','pre-approval');
    if(answered(draft.choices['pre-approval'])==='yes') result.push('approval-amount');
  }
  return [...result,'review','contact'];
}
export function sectionFor(step:StepId):SectionId {
  if(step==='intent') return 'start';
  if(step==='review'||step==='contact') return 'review';
  if(step==='mortgage-balance') return 'move';
  if(step==='approval-amount') return 'buying';
  if(step in choiceQuestions) return choiceQuestions[step as ChoiceField].section;
  return 'home';
}
export function parseMoneyCents(value:string):number|null {
  const match=/^(0|[1-9]\d{0,8})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if(!match) return null;
  const cents=Number(match[1])*100+Number((match[2]||'').padEnd(2,'0'));
  return cents<=10_000_000_000?cents:null;
}
export function validateStep(step:StepId,draft:GuidedJourneyDraft,now=new Date()):string|null {
  if(step==='intent') return draft.mode?null:'Choose what you would like to do.';
  if(step==='address') return draft.address.line1.trim().length>0 && draft.address.line1.trim().length<=180?null:'Enter your street address.';
  if(step==='confirm-home') return draft.address.confirmed?null:'Confirm this is the home you mean.';
  if(step==='detail-level') return draft.detailLevel!=='unanswered'?null:'Choose to add details or leave them for later.';
  if(step==='renovations') return isAnswered(draft.renovations)?null:'Select any improvements, None or Not Sure.';
  if(step==='home-facts') {
    for(const field of Object.keys(factLabels) as FactField[]) {
      const fact=draft.facts[field];if(!isAnswered(fact)) return 'Enter the details you know, or choose Not Sure.';
      if(fact.state==='answered') {
        const min=field==='yearBuilt'?1600:field==='squareFeet'||field==='stories'?1:0;
        const max=field==='yearBuilt'?now.getFullYear()+2:field==='squareFeet'?1_000_000:field==='stories'?100:30;
        if(!Number.isInteger(fact.value)||fact.value<min||fact.value>max) return `Check ${factLabels[field].toLowerCase()}.`;
      }
    }
  }
  if(step==='mortgage-balance'||step==='approval-amount') {
    const answer=step==='mortgage-balance'?draft.mortgageBalanceCents:draft.preApprovedAmountCents;
    if(!isAnswered(answer)) return 'Enter an approximate amount or choose Not Sure.';
    if(answer.state==='answered' && (!Number.isSafeInteger(answer.value)||answer.value<0||answer.value>10_000_000_000)) return 'Check the amount.';
  }
  if(step in choiceQuestions && !isAnswered(draft.choices[step as ChoiceField])) return 'Choose an answer or Not Sure.';
  if(step==='contact') {
    if(draft.contact.name.trim().length<2||draft.contact.name.trim().length>120) return 'Enter your name.';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contact.email)||draft.contact.email.length>180) return 'Enter an email address.';
    if(!draft.contact.requestedContact) return 'Choose whether we may respond to this request.';
  }
  return null;
}
export function propertyLabel(draft:GuidedJourneyDraft) {
  return draft.mode==='buy'?'Your Next Home':draft.address.line1.trim()||'Your Home';
}
export function reviewRows(draft:GuidedJourneyDraft):Array<{step:StepId;label:string;value:string}> {
  const result:Array<{step:StepId;label:string;value:string}>=[];
  if(draft.mode!=='buy') {
    result.push({step:'address',label:'Home',value:[draft.address.line1,draft.address.city,draft.address.region,draft.address.postalCode].filter(Boolean).join(', ')});
    result.push({step:'home-facts',label:'Home Facts',value:(Object.keys(factLabels) as FactField[]).map(key=>`${factLabels[key]}: ${answered(draft.facts[key])??'Not Sure'}`).join(' · ')});
    result.push({step:'detail-level',label:'Home Details',value:draft.detailLevel==='include'?'Added Below':'We Can Discuss These Later'});
  }
  for(const step of deriveSteps(draft)) {
    if(step in choiceQuestions) {
      const field=step as ChoiceField,question=choiceQuestions[field],answer=draft.choices[field];
      const value=question.options.find(option=>option.value===answered(answer))?.label||'Not Sure';
      result.push({step,label:question.title,value});
    } else if(step==='renovations') {
      result.push({step,label:'Improvements',value:draft.renovations.state==='answered'?draft.renovations.value.map(value=>renovations.find(item=>item.value===value)!.label).join(', ')||'None':'Not Sure'});
    } else if(step==='mortgage-balance'||step==='approval-amount') {
      const value=answered(step==='mortgage-balance'?draft.mortgageBalanceCents:draft.preApprovedAmountCents);
      result.push({step,label:step==='mortgage-balance'?'Approximate Mortgage Balance':'Pre-approved Amount',value:value===undefined?'Not Sure':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value/100)});
    }
  }
  return result;
}
