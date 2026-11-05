import {createInitialJourneyDraft,normalizeDraft,type GuidedJourneyDraft} from '@/lib/marketing/guidedJourney';

/** Fictional, complete answers for serialization tests; never an application fallback. */
export function createValidBothJourneyFixture():GuidedJourneyDraft {
  const draft=createInitialJourneyDraft();
  return normalizeDraft({...draft,mode:'both',
    address:{line1:'100 Example Lane',city:'Keller',region:'TX',postalCode:'76248',confirmed:true},
    facts:{bedrooms:{state:'answered',value:3},fullBaths:{state:'answered',value:2},halfBaths:{state:'answered',value:0},stories:{state:'answered',value:1},yearBuilt:{state:'answered',value:2005},squareFeet:{state:'answered',value:2100}},
    detailLevel:'include',renovations:{state:'answered',value:['paint','kitchen']},
    choices:{
      countertop:{state:'answered',value:'quartz'},appliances:{state:'answered',value:'mixed'},'kitchen-floor':{state:'answered',value:'tile'},
      garage:{state:'answered',value:'2'},pool:{state:'answered',value:'none'},foundation:{state:'answered',value:'no_known_issues'},'overall-condition':{state:'answered',value:'normal_wear'},
      relationship:{state:'answered',value:'owner'},'selling-window':{state:'answered',value:'3_to_6_months'},'selling-preference':{state:'answered',value:'preparation'},mortgage:{state:'answered',value:'yes'},
      'buying-stage':{state:'answered',value:'searching'},destination:{state:'answered',value:'local'},construction:{state:'answered',value:'either'},representation:{state:'answered',value:'no'},'pre-approval':{state:'answered',value:'yes'},
    },
    mortgageBalanceCents:{state:'answered',value:25_000_000},preApprovedAmountCents:{state:'answered',value:45_000_000},
    contact:{name:'Taylor Example',email:'Taylor@Example.Test',requestedContact:true,marketingOptIn:false},
  });
}
