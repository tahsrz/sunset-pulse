import {z} from 'zod';
import {deriveSteps,includesBuying,normalizeDraft,validateStep,type Answer,type GuidedJourneyDraft} from './guidedJourney';
import {normalizeCampaign,sellerPlanLeadSchema,type SellerPlanLeadInput} from './leadMagnetContract';
import {
  buyerPreferencesSchema,sellerPlanLeadV3PayloadSchema,sellerPlanLeadV3Schema,toLegacyTiming,toSellerRequestKind,
  type SellerJourneySubmission,type SellerPlanLeadV3Input,type SellerPlanLeadV3Payload,type WireAnswer,
} from './guidedJourneySchema';

type ErrorCode='invalid_request'|'unsupported_mode'|'unconfirmed_receipt'|'crypto_unavailable';
const messages:Record<ErrorCode,string>={
  invalid_request:'Complete the required answers and check your request details.',
  unsupported_mode:'Buyer requests use a separate intake flow.',
  unconfirmed_receipt:'We could not confirm your request. Please try again.',
  crypto_unavailable:'Your browser could not prepare the request. Please try again.',
};
export class JourneyRequestError extends Error {
  constructor(public readonly code:ErrorCode){super(messages[code]);this.name='JourneyRequestError';}
}
function invalid():never {throw new JourneyRequestError('invalid_request');}
function wire<T>(answer:Answer<T>):WireAnswer<T> {
  if(answer.state==='answered') return {state:'answered',value:answer.value};
  if(answer.state==='unknown'||answer.state==='skipped') return {state:answer.state};
  return invalid();
}
function finance(answer:Answer<'yes'|'no'>,amount:Answer<number>) {
  if(answer.state==='answered') {
    if(answer.value==='yes') return {state:'yes' as const,amount:wire(amount)};
    if(answer.value==='no') return {state:'no' as const};
    return invalid();
  }
  if(answer.state==='unknown'||answer.state==='skipped') return {state:answer.state};
  return invalid();
}
export function serializeBuyerContext(input:GuidedJourneyDraft):z.infer<typeof buyerPreferencesSchema> {
  const draft=normalizeDraft(input);
  if(!includesBuying(draft)) return invalid();
  const parsed=buyerPreferencesSchema.safeParse({
    destination:wire(draft.choices.destination),construction:wire(draft.choices.construction),
    representation:wire(draft.choices.representation),preApproval:finance(draft.choices['pre-approval'],draft.preApprovedAmountCents),
  });
  return parsed.success?parsed.data:invalid();
}
type Attribution={campaign?:SellerPlanLeadInput['campaign'];company?:string};

/** Whitelist only reviewed answers. Lookup IDs, raw provider data and draft UI state never leave here. */
export function serializeSellerJourney(input:GuidedJourneyDraft,attribution:Attribution={}):SellerPlanLeadV3Payload {
  const draft=normalizeDraft(input);
  if(draft.mode==='buy') throw new JourneyRequestError('unsupported_mode');
  if(draft.mode===null||deriveSteps(draft).some(step=>validateStep(step,draft)!==null)) return invalid();
  const facts={
    bedrooms:wire(draft.facts.bedrooms),fullBaths:wire(draft.facts.fullBaths),halfBaths:wire(draft.facts.halfBaths),
    stories:wire(draft.facts.stories),yearBuilt:wire(draft.facts.yearBuilt),squareFeet:wire(draft.facts.squareFeet),
  };
  const homeDetails=draft.detailLevel==='include'?{
    state:'included',renovations:wire(draft.renovations),countertop:wire(draft.choices.countertop),appliances:wire(draft.choices.appliances),
    kitchenFloor:wire(draft.choices['kitchen-floor']),garage:wire(draft.choices.garage),pool:wire(draft.choices.pool),
    foundation:wire(draft.choices.foundation),overallCondition:wire(draft.choices['overall-condition']),
  }:{state:'skipped'};
  const context=draft.address;
  const seller={
    address:{line1:context.line1,confirmed:context.confirmed,
      ...(context.city.trim()?{city:context.city}:{}),...(context.region.trim()?{region:context.region}:{}),...(context.postalCode.trim()?{postalCode:context.postalCode}:{}),
      entryMethod:draft.propertyMatch&&draft.propertyMatch.source!=='Example'?'record':'manual'},
    homeFacts:facts,homeDetails,relationship:wire(draft.choices.relationship),sellingWindow:wire(draft.choices['selling-window']),
    sellingPreference:wire(draft.choices['selling-preference']),currentMortgage:finance(draft.choices.mortgage,draft.mortgageBalanceCents),
  };
  const journey=draft.mode==='sell'?{mode:'sell',...seller}:{mode:'both',...seller,buyingStage:wire(draft.choices['buying-stage']),...(includesBuying(draft)?{buyerPreferences:serializeBuyerContext(draft)}:{})};
  const parsed=sellerPlanLeadV3PayloadSchema.safeParse({
    offerKey:'keller-westlake-seller-plan',offerVersion:'3',name:draft.contact.name,email:draft.contact.email,
    requestedContact:draft.contact.requestedContact,marketingOptIn:draft.contact.marketingOptIn,
    requestKind:toSellerRequestKind(seller.sellingPreference),timing:toLegacyTiming(seller.sellingWindow),
    company:attribution.company??'',campaign:attribution.campaign,journey,
  });
  if(!parsed.success) return invalid();
  return normalizeV3Payload(parsed.data);
}

function normalizeV3Payload(input:SellerPlanLeadV3Input|SellerPlanLeadV3Payload):SellerPlanLeadV3Payload {
  const parsed='submissionId' in input?sellerPlanLeadV3Schema.safeParse(input):sellerPlanLeadV3PayloadSchema.safeParse(input);
  if(!parsed.success) return invalid();
  const {submissionId:ignored,...payload}=parsed.data as SellerPlanLeadV3Payload&{submissionId?:string};void ignored;
  const campaign=normalizeCampaign(payload.campaign);
  const normalized=sellerPlanLeadV3PayloadSchema.safeParse({...payload,name:payload.name.trim(),email:payload.email.trim().toLowerCase(),company:payload.company??'',campaign});
  return normalized.success?normalized.data:invalid();
}

/** Original v2 property order is deliberate: preserve existing server replay hashes exactly. */
export function buildSellerLeadFingerprintFields(input:SellerPlanLeadInput|SellerPlanLeadV3Input|SellerPlanLeadV3Payload) {
  const parsed=input.offerVersion==='2'?sellerPlanLeadSchema.safeParse(input):null;
  const value=input.offerVersion==='2'?(parsed?.success?parsed.data:invalid()):normalizeV3Payload(input);
  const fields={
    offerKey:value.offerKey,offerVersion:value.offerVersion,name:value.name.trim(),email:value.email.trim().toLowerCase(),
    requestKind:value.requestKind,timing:value.timing,requestedContact:value.requestedContact,marketingOptIn:value.marketingOptIn,
    campaign:normalizeCampaign(value.campaign)||{},
  };
  return value.offerVersion==='3'?{...fields,journey:value.journey}:fields;
}
function stableJson(value:unknown):string {
  if(Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if(value&&typeof value==='object') return `{${Object.entries(value).filter(([,item])=>item!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,item])=>`${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
/** Internal canonical material only; never log, send or persist this string in the browser. */
export function canonicalSellerLeadFingerprint(input:SellerPlanLeadInput|SellerPlanLeadV3Input|SellerPlanLeadV3Payload):string {
  const fields=buildSellerLeadFingerprintFields(input);
  return input.offerVersion==='2'?JSON.stringify(fields):stableJson(fields);
}
export async function buildClientFingerprint(payload:SellerPlanLeadV3Payload):Promise<string> {
  if(!globalThis.crypto?.subtle) throw new JourneyRequestError('crypto_unavailable');
  const canonical=canonicalSellerLeadFingerprint(payload);
  try {
    const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical));
    return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  } catch {throw new JourneyRequestError('crypto_unavailable');}
}
export type PendingJourneyAttempt={readonly fingerprint:string;readonly submissionId:string};
export async function prepareSellerJourneyAttempt(draft:GuidedJourneyDraft,attribution:Attribution={},previous:PendingJourneyAttempt|null=null) {
  const payload=serializeSellerJourney(draft,attribution);
  const fingerprint=await buildClientFingerprint(payload);
  if(typeof globalThis.crypto.randomUUID!=='function') throw new JourneyRequestError('crypto_unavailable');
  const submissionId=previous?.fingerprint===fingerprint&&sellerPlanLeadSchema.shape.submissionId.safeParse(previous.submissionId).success
    ?previous.submissionId:globalThis.crypto.randomUUID();
  const parsed=sellerPlanLeadV3Schema.safeParse({...payload,submissionId});
  if(!parsed.success) return invalid();
  return {request:parsed.data,attempt:{fingerprint,submissionId} satisfies PendingJourneyAttempt};
}

const receiptSchema=z.object({success:z.literal(true),accepted:z.literal(true),duplicate:z.boolean().optional()});
export type SellerRequestReceipt<TOffer=never>={accepted:true;duplicate:boolean;bookingOffer?:TOffer};
/** The feature stack supplies its existing booking-offer validator; no second scheduling contract. */
export function readSellerReceipt<TOffer=never>(body:unknown,parseBookingOffer?:(input:unknown)=>TOffer|null):SellerRequestReceipt<TOffer> {
  const parsed=receiptSchema.safeParse(body);
  if(!parsed.success) throw new JourneyRequestError('unconfirmed_receipt');
  const receipt:SellerRequestReceipt<TOffer>={accepted:true,duplicate:parsed.data.duplicate??false};
  if(parseBookingOffer&&body&&typeof body==='object'&&'bookingOffer' in body) {
    try {const offer=parseBookingOffer(body.bookingOffer);if(offer!==null&&offer!==undefined)receipt.bookingOffer=offer;}catch {/* Saved receipt survives an unusable optional offer. */}
  }
  return receipt;
}

export type {SellerJourneySubmission};
