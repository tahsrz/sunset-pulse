import {z} from 'zod';
import {choiceQuestions,type ChoiceField} from './guidedJourney';
import {sellerPlanLeadSchema} from './leadMagnetContract';

export const MAX_JOURNEY_BYTES=6000;
export const MAX_SELLER_REQUEST_BYTES=12000;
export type WireAnswer<T>={state:'answered';value:T}|{state:'unknown'|'skipped'};
type ChoiceValue<K extends ChoiceField>=typeof choiceQuestions[K]['options'][number]['value'];

export function wireAnswer<T extends z.ZodTypeAny>(value:T) {
  return z.discriminatedUnion('state',[
    z.object({state:z.literal('answered'),value}).strict(),
    z.object({state:z.literal('unknown')}).strict(),
    z.object({state:z.literal('skipped')}).strict(),
  ]);
}
function choice<K extends ChoiceField>(field:K) {
  // Values come from the same literal definitions used by the visible choices.
  const values=choiceQuestions[field].options.map(option=>option.value) as [ChoiceValue<K>,...ChoiceValue<K>[]];
  return z.enum(values);
}
export function fitsJsonByteBudget(value:unknown,maximum:number):boolean {
  try {const json=JSON.stringify(value);return typeof json==='string'&&new TextEncoder().encode(json).byteLength<=maximum;}
  catch {return false;}
}
function checkJourneyBudget(value:unknown,context:z.RefinementCtx) {
  if(!fitsJsonByteBudget(value,MAX_JOURNEY_BYTES)) context.addIssue({code:z.ZodIssueCode.custom,message:'Journey is too large.'});
}
export const moneyCentsSchema=z.number().int().min(0).max(10_000_000_000);
export const financialAnswerSchema=z.discriminatedUnion('state',[
  z.object({state:z.literal('yes'),amount:wireAnswer(moneyCentsSchema)}).strict(),
  z.object({state:z.literal('no')}).strict(),
  z.object({state:z.literal('unknown')}).strict(),
  z.object({state:z.literal('skipped')}).strict(),
]);
export const journeyAddressSchema=z.object({
  line1:z.string().trim().min(1).max(180),
  // Resolved context is optional: the owner requested one street-address input.
  city:z.string().trim().min(1).max(100).optional(),
  region:z.string().trim().min(1).max(32).optional(),
  postalCode:z.string().trim().min(1).max(20).optional(),
  entryMethod:z.enum(['manual','record']),confirmed:z.literal(true),
}).strict();
const renovationSchema=z.array(z.enum(['kitchen','bath','floors','paint','lighting'])).max(5)
  .transform(values=>[...new Set(values)].sort());
export const homeDetailsSchema=z.discriminatedUnion('state',[
  z.object({state:z.literal('skipped')}).strict(),
  z.object({
    state:z.literal('included'),renovations:wireAnswer(renovationSchema),
    countertop:wireAnswer(choice('countertop')),appliances:wireAnswer(choice('appliances')),
    kitchenFloor:wireAnswer(choice('kitchen-floor')),garage:wireAnswer(choice('garage')),
    pool:wireAnswer(choice('pool')),foundation:wireAnswer(choice('foundation')),
    overallCondition:wireAnswer(choice('overall-condition')),
  }).strict(),
]);
export const buyerPreferencesSchema=z.object({
  destination:wireAnswer(choice('destination')),construction:wireAnswer(choice('construction')),
  representation:wireAnswer(choice('representation')),preApproval:financialAnswerSchema,
}).strict();

/** Inject the clock for year bounds; included answers never accept 'unanswered'. */
export function createGuidedJourneySchemas(now:()=>Date=()=>new Date()) {
  const homeFacts=z.object({
    bedrooms:wireAnswer(z.number().int().min(0).max(30)),
    fullBaths:wireAnswer(z.number().int().min(0).max(30)),
    halfBaths:wireAnswer(z.number().int().min(0).max(30)),
    stories:wireAnswer(z.number().int().min(1).max(100)),
    yearBuilt:wireAnswer(z.number().int().min(1600).max(2200).refine(value=>value<=now().getFullYear()+2,'Check year built.')),
    squareFeet:wireAnswer(z.number().int().min(1).max(1_000_000)),
  }).strict();
  const sellerFields={
    address:journeyAddressSchema,homeFacts,homeDetails:homeDetailsSchema,
    relationship:wireAnswer(choice('relationship')),sellingWindow:wireAnswer(choice('selling-window')),
    sellingPreference:wireAnswer(choice('selling-preference')),currentMortgage:financialAnswerSchema,
  };
  const sell=z.object({mode:z.literal('sell'),...sellerFields}).strict();
  const both=z.object({mode:z.literal('both'),...sellerFields,buyingStage:wireAnswer(choice('buying-stage')),buyerPreferences:buyerPreferencesSchema.optional()}).strict();
  const buy=z.object({
    mode:z.literal('buy'),buyingStage:wireAnswer(choice('buying-stage').exclude(['not_buying'])),buyerPreferences:buyerPreferencesSchema,
  }).strict();
  function checkBranches(value:z.infer<typeof both>|z.infer<typeof sell>|z.infer<typeof buy>,context:z.RefinementCtx) {
    if(value.mode==='both') {
      const notBuying=value.buyingStage.state==='answered'&&value.buyingStage.value==='not_buying';
      if(notBuying&&value.buyerPreferences!==undefined) context.addIssue({code:z.ZodIssueCode.custom,path:['buyerPreferences'],message:'Hidden buying details are not allowed.'});
      if(!notBuying&&value.buyerPreferences===undefined) context.addIssue({code:z.ZodIssueCode.custom,path:['buyerPreferences'],message:'Complete the buying details or choose Not Sure.'});
    }
    checkJourneyBudget(value,context);
  }
  return {
    homeFacts,
    ownerSummary: sell.pick({ address:true,homeFacts:true,sellingWindow:true,sellingPreference:true }),
    seller:z.discriminatedUnion('mode',[sell,both]).superRefine(checkBranches),
    journey:z.discriminatedUnion('mode',[sell,both,buy]).superRefine(checkBranches),
  };
}
const schemas=createGuidedJourneySchemas();
export const guidedJourneySubmissionSchema=schemas.journey;
export const sellerJourneySubmissionSchema=schemas.seller;
export const sellerJourneyOwnerSummarySchema=schemas.ownerSummary;
export type SellerJourneySubmission=z.infer<typeof sellerJourneySubmissionSchema>;
export type GuidedJourneySubmission=z.infer<typeof guidedJourneySubmissionSchema>;

export function toLegacyTiming(answer:WireAnswer<ChoiceValue<'selling-window'>>):z.infer<typeof sellerPlanLeadSchema>['timing'] {
  if(answer.state!=='answered') return 'exploring';
  return ({within_3_months:'one-to-three-months','3_to_6_months':'three-to-six-months','6_to_12_months':'later',after_12_months:'later',not_set:'exploring'} as const)[answer.value];
}
export function toSellerRequestKind(answer:WireAnswer<ChoiceValue<'selling-preference'>>):'seller_plan'|'pricing_review' {
  return answer.state==='answered'&&answer.value==='pricing'?'pricing_review':'seller_plan';
}

const v3Fields=sellerPlanLeadSchema.omit({offerVersion:true,submissionId:true}).extend({
  offerVersion:z.literal('3'),journey:sellerJourneySubmissionSchema,
}).strict();
function checkRequest(value:z.infer<typeof v3Fields>,context:z.RefinementCtx) {
  if(value.timing!==toLegacyTiming(value.journey.sellingWindow)) context.addIssue({code:z.ZodIssueCode.custom,path:['timing'],message:'Timing does not match the selected journey.'});
  if(value.requestKind!==toSellerRequestKind(value.journey.sellingPreference)) context.addIssue({code:z.ZodIssueCode.custom,path:['requestKind'],message:'Request kind does not match the selected journey.'});
  if(!fitsJsonByteBudget(value,MAX_SELLER_REQUEST_BYTES)) context.addIssue({code:z.ZodIssueCode.custom,message:'Request is too large.'});
}
export const sellerPlanLeadV3PayloadSchema=v3Fields.superRefine(checkRequest);
export const sellerPlanLeadV3Schema=v3Fields.extend({submissionId:sellerPlanLeadSchema.shape.submissionId}).superRefine(checkRequest);
/** The intake route keeps v2 as its default until guided intake is enabled. */
export const sellerPlanLeadVersionedSchema=z.union([sellerPlanLeadSchema,sellerPlanLeadV3Schema]);
export type SellerPlanLeadV3Payload=z.infer<typeof sellerPlanLeadV3PayloadSchema>;
export type SellerPlanLeadV3Input=z.infer<typeof sellerPlanLeadV3Schema>;
