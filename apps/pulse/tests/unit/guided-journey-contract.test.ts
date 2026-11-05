import {createHash,webcrypto} from 'node:crypto';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createValidBothJourneyFixture} from '../fixtures/guidedJourneyFixture';
import {createInitialJourneyDraft,setChoice} from '@/lib/marketing/guidedJourney';
import {sellerPlanLeadSchema} from '@/lib/marketing/leadMagnetContract';
import {
  createGuidedJourneySchemas,financialAnswerSchema,fitsJsonByteBudget,guidedJourneySubmissionSchema,
  sellerPlanLeadV3PayloadSchema,sellerPlanLeadV3Schema,sellerPlanLeadVersionedSchema,toLegacyTiming,
} from '@/lib/marketing/guidedJourneySchema';
import {
  buildClientFingerprint,buildSellerLeadFingerprintFields,canonicalSellerLeadFingerprint,JourneyRequestError,
  prepareSellerJourneyAttempt,readSellerReceipt,serializeBuyerContext,serializeSellerJourney,
} from '@/lib/marketing/guidedJourneyRequest';

const firstId='11111111-1111-4111-8111-111111111111',secondId='22222222-2222-4222-8222-222222222222';
const valid=()=>serializeSellerJourney(createValidBothJourneyFixture());
beforeEach(()=>vi.stubGlobal('crypto',{subtle:webcrypto.subtle,randomUUID:vi.fn().mockReturnValueOnce(firstId).mockReturnValue(secondId)}));
afterEach(()=>vi.unstubAllGlobals());

describe('strict guided journey wire contracts',()=>{
  it('serializes confirmed facts and precise intent without lookup data or private attribution',()=>{
    const draft=createValidBothJourneyFixture();
    draft.propertyMatch={id:'private-provider-id',address:{line1:draft.address.line1,city:'Keller',region:'TX',postalCode:'76248'},facts:{bedrooms:99},source:'MLS',recordedAt:'2026-11-04T12:00:00Z',totalBathrooms:2.5};
    const payload=serializeSellerJourney(draft,{campaign:{source:'google',content:'taylor@example.test',medium:'https://example.test'}});
    expect(payload.offerVersion).toBe('3');expect(payload.email).toBe('taylor@example.test');
    expect(payload.campaign).toEqual({source:'google'});expect(payload.timing).toBe('three-to-six-months');
    expect(payload.journey.homeFacts.bedrooms).toEqual({state:'answered',value:3});
    expect(payload.journey.address.entryMethod).toBe('record');
    expect(JSON.stringify(payload)).not.toMatch(/private-provider-id|recordedAt|totalBathrooms|propertyMatch|example\.test\/|metadata/);
    expect(payload.journey.homeDetails).toMatchObject({state:'included',renovations:{state:'answered',value:['kitchen','paint']}});
  });
  it('accepts a confirmed street-only manual address without inventing hidden location fields',()=>{
    const draft=createValidBothJourneyFixture();draft.address={line1:'100 Example Lane',city:'',region:'',postalCode:'',confirmed:true};
    expect(serializeSellerJourney(draft).journey.address).toEqual({line1:'100 Example Lane',confirmed:true,entryMethod:'manual'});
    draft.address.confirmed=false;expect(()=>serializeSellerJourney(draft)).toThrow(JourneyRequestError);
  });
  it('keeps zero, unknown, skipped and explicit None distinct',()=>{
    const draft=createValidBothJourneyFixture();draft.facts.bedrooms={state:'answered',value:0};draft.facts.fullBaths={state:'unknown'};draft.facts.yearBuilt={state:'skipped'};draft.renovations={state:'answered',value:[]};
    const journey=serializeSellerJourney(draft).journey;
    expect(journey.homeFacts).toMatchObject({bedrooms:{state:'answered',value:0},fullBaths:{state:'unknown'},yearBuilt:{state:'skipped'}});
    expect(journey.homeDetails).toMatchObject({renovations:{state:'answered',value:[]}});
    draft.facts.bedrooms={state:'unanswered'};expect(()=>serializeSellerJourney(draft)).toThrow(JourneyRequestError);
  });
  it('omits every optional home-detail field when the group is skipped',()=>{
    const draft=createValidBothJourneyFixture();draft.detailLevel='skip';
    const journey=serializeSellerJourney(draft).journey;expect(journey.homeDetails).toEqual({state:'skipped'});
    expect(guidedJourneySubmissionSchema.safeParse({...journey,homeDetails:{state:'skipped',garage:{state:'answered',value:'2'}}}).success).toBe(false);
  });
  it('normalizes hidden mortgage/approval amounts on the client and rejects forged extras at the wire',()=>{
    const draft=createValidBothJourneyFixture();draft.choices.mortgage={state:'answered',value:'no'};draft.choices['pre-approval']={state:'answered',value:'no'};
    const journey=serializeSellerJourney(draft).journey;
    expect(journey.currentMortgage).toEqual({state:'no'});
    if(journey.mode==='both') expect(journey.buyerPreferences?.preApproval).toEqual({state:'no'});
    expect(guidedJourneySubmissionSchema.safeParse({...journey,currentMortgage:{state:'no',amount:{state:'answered',value:100}}}).success).toBe(false);
    expect(financialAnswerSchema.safeParse({state:'yes'}).success).toBe(false);
    expect(financialAnswerSchema.safeParse({state:'yes',amount:{state:'answered',value:0}}).success).toBe(true);
    for(const value of [-1,0.5,Infinity,NaN,10_000_000_001]) expect(financialAnswerSchema.safeParse({state:'yes',amount:{state:'answered',value}}).success).toBe(false);
  });
  it('removes buyer context after Not Buying and rejects manually forged hidden preferences',()=>{
    const draft=setChoice(createValidBothJourneyFixture(),'buying-stage','not_buying');
    const journey=serializeSellerJourney(draft).journey;expect(journey).not.toHaveProperty('buyerPreferences');
    expect(guidedJourneySubmissionSchema.safeParse({...journey,buyerPreferences:serializeBuyerContext(createValidBothJourneyFixture())}).success).toBe(false);
    const original=valid().journey;if(original.mode==='both') {
      const {buyerPreferences:ignored,...missing}=original;void ignored;
      expect(guidedJourneySubmissionSchema.safeParse(missing).success).toBe(false);
    }
  });
  it('keeps buyer-only contracts separate from seller requests and seller capabilities',()=>{
    const both=valid().journey;if(both.mode!=='both') throw new Error('Fixture');
    const buyer={mode:'buy',buyingStage:both.buyingStage,buyerPreferences:both.buyerPreferences};
    expect(guidedJourneySubmissionSchema.safeParse(buyer).success).toBe(true);
    expect(guidedJourneySubmissionSchema.safeParse({...buyer,address:both.address}).success).toBe(false);
    expect(guidedJourneySubmissionSchema.safeParse({...buyer,buyingStage:{state:'answered',value:'not_buying'}}).success).toBe(false);
    expect(sellerPlanLeadV3PayloadSchema.safeParse({...valid(),journey:buyer}).success).toBe(false);
    expect(()=>serializeSellerJourney({...createValidBothJourneyFixture(),mode:'buy'})).toThrow('separate intake');
    const seller=serializeSellerJourney({...createValidBothJourneyFixture(),mode:'sell'}).journey;
    expect(seller).not.toHaveProperty('buyerPreferences');expect(seller).not.toHaveProperty('buyingStage');
    expect(guidedJourneySubmissionSchema.safeParse({...seller,buyingStage:both.buyingStage}).success).toBe(false);
  });
  it('requires explicit contact permission while preserving optional marketing consent',()=>{
    const draft=createValidBothJourneyFixture();expect(serializeSellerJourney(draft).marketingOptIn).toBe(false);
    draft.contact.requestedContact=false;expect(()=>serializeSellerJourney(draft)).toThrow(JourneyRequestError);
    expect(sellerPlanLeadV3PayloadSchema.safeParse({...valid(),requestedContact:false}).success).toBe(false);
  });
  it('bounds years using the injected clock and rejects unsupported wire values at every group',()=>{
    const schema=createGuidedJourneySchemas(()=>new Date('2026-11-04T12:00:00Z')).journey,journey=valid().journey;
    expect(schema.safeParse({...journey,homeFacts:{...journey.homeFacts,yearBuilt:{state:'answered',value:2028}}}).success).toBe(true);
    expect(schema.safeParse({...journey,homeFacts:{...journey.homeFacts,yearBuilt:{state:'answered',value:2029}}}).success).toBe(false);
    expect(schema.safeParse({...journey,relationship:{state:'answered',value:'administrator'}}).success).toBe(false);
    expect(schema.safeParse({...journey,ownerId:'injected'}).success).toBe(false);
    expect(schema.safeParse({...journey,homeFacts:{...journey.homeFacts,bedrooms:{state:'unanswered'}}}).success).toBe(false);
    expect(schema.safeParse({...journey,homeFacts:{...journey.homeFacts,bedrooms:{state:'unknown',value:0}}}).success).toBe(false);
  });
  it.each([
    ['within_3_months','one-to-three-months'],['3_to_6_months','three-to-six-months'],['6_to_12_months','later'],['after_12_months','later'],['not_set','exploring'],
  ] as const)('retains precise %s while mapping compatibility timing to %s',(value,expected)=>{
    const payload=serializeSellerJourney(setChoice(createValidBothJourneyFixture(),'selling-window',value));
    expect(payload.timing).toBe(expected);expect(payload.journey.sellingWindow).toEqual({state:'answered',value});
  });
  it('maps unknown/skipped timing to exploring and enforces top-level kind/timing consistency',()=>{
    expect(toLegacyTiming({state:'unknown'})).toBe('exploring');expect(toLegacyTiming({state:'skipped'})).toBe('exploring');
    const pricing=serializeSellerJourney(setChoice(createValidBothJourneyFixture(),'selling-preference','pricing'));
    expect(pricing.requestKind).toBe('pricing_review');
    expect(sellerPlanLeadV3PayloadSchema.safeParse({...pricing,requestKind:'seller_plan'}).success).toBe(false);
    expect(sellerPlanLeadV3PayloadSchema.safeParse({...valid(),timing:'later'}).success).toBe(false);
  });
  it('enforces UTF-8 byte accounting, strict envelopes and generic validation errors',()=>{
    expect(fitsJsonByteBudget('é',4)).toBe(true);expect(fitsJsonByteBudget('é',3)).toBe(false);
    expect(fitsJsonByteBudget('😀'.repeat(1500),6000)).toBe(false);
    expect(fitsJsonByteBudget({value:1n},6000)).toBe(false);
    expect(sellerPlanLeadV3Schema.safeParse({...valid(),submissionId:firstId,agentId:'injected'}).success).toBe(false);
    expect(sellerPlanLeadV3PayloadSchema.safeParse({...valid(),submissionId:firstId}).success).toBe(false);
    const draft=createValidBothJourneyFixture();draft.contact.email='private-invalid-address';
    try {serializeSellerJourney(draft);throw new Error('Expected invalid');} catch(error) {
      expect(error).toBeInstanceOf(JourneyRequestError);expect((error as Error).message).not.toContain('private-invalid-address');
    }
  });
});

describe('compatibility and retry identity',()=>{
  it('preserves the original v2 replay hash and does not activate v3 on the live validator',()=>{
    const old=sellerPlanLeadSchema.parse({offerKey:'keller-westlake-seller-plan',offerVersion:'2',submissionId:firstId,name:' Taylor Example ',email:'Taylor@Example.Test',requestKind:'seller_plan',timing:'within-30-days',requestedContact:true,marketingOptIn:false,campaign:{source:'google',medium:'organic',campaign:'local-seller',content:'hero'}});
    expect(Object.keys(buildSellerLeadFingerprintFields(old))).toEqual(['offerKey','offerVersion','name','email','requestKind','timing','requestedContact','marketingOptIn','campaign']);
    expect(createHash('sha256').update(canonicalSellerLeadFingerprint(old)).digest('hex')).toBe('db463d03fc0add088beb882305ca0da40d5a19bb6b358910ce67e2a7eed43e26');
    expect(sellerPlanLeadVersionedSchema.safeParse(old).success).toBe(true);
    const next={...valid(),submissionId:firstId};expect(sellerPlanLeadVersionedSchema.safeParse(next).success).toBe(true);expect(sellerPlanLeadSchema.safeParse(next).success).toBe(false);
  });
  it('uses the same fingerprint for canonicalized sets, object order and equivalent contact/campaign values',async()=>{
    const first=createValidBothJourneyFixture(),second=createValidBothJourneyFixture();
    second.renovations={state:'answered',value:['kitchen','paint','kitchen']};second.contact.name=' Taylor Example ';second.contact.email='taylor@example.test';
    const a=serializeSellerJourney(first,{campaign:{source:'google',medium:'organic'}}),b=serializeSellerJourney(second,{campaign:{medium:'organic',source:'google'}});
    expect(await buildClientFingerprint(a)).toBe(await buildClientFingerprint(b));
    const reordered=JSON.parse(JSON.stringify(a),(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).reverse()):value);
    expect(await buildClientFingerprint(a)).toBe(await buildClientFingerprint(reordered));
    expect(await buildClientFingerprint(a)).toBe(createHash('sha256').update(canonicalSellerLeadFingerprint(a)).digest('hex'));
  });
  it('changes identity for material nested facts, financing, consent, address and detailed timing',async()=>{
    const baseline=await buildClientFingerprint(valid());
    const changes=[
      (draft:ReturnType<typeof createValidBothJourneyFixture>)=>{draft.facts.bedrooms={state:'answered',value:4};},
      (draft:ReturnType<typeof createValidBothJourneyFixture>)=>{draft.mortgageBalanceCents={state:'answered',value:0};},
      (draft:ReturnType<typeof createValidBothJourneyFixture>)=>{draft.preApprovedAmountCents={state:'unknown'};},
      (draft:ReturnType<typeof createValidBothJourneyFixture>)=>{draft.contact.marketingOptIn=true;},
      (draft:ReturnType<typeof createValidBothJourneyFixture>)=>{draft.address.line1='200 Example Street';},
      (draft:ReturnType<typeof createValidBothJourneyFixture>)=>{draft.choices['selling-window']={state:'answered',value:'after_12_months'};},
    ];
    for(const change of changes){const draft=createValidBothJourneyFixture();change(draft);expect(await buildClientFingerprint(serializeSellerJourney(draft))).not.toBe(baseline);}
    const six=serializeSellerJourney(setChoice(createValidBothJourneyFixture(),'selling-window','6_to_12_months'));
    const later=serializeSellerJourney(setChoice(createValidBothJourneyFixture(),'selling-window','after_12_months'));
    expect(six.timing).toBe(later.timing);expect(await buildClientFingerprint(six)).not.toBe(await buildClientFingerprint(later));
  });
  it('does not include hidden finance or display-only lookup context in identity',async()=>{
    const draft=createValidBothJourneyFixture();draft.choices['pre-approval']={state:'answered',value:'no'};
    const first=await buildClientFingerprint(serializeSellerJourney(draft));draft.preApprovedAmountCents={state:'answered',value:9_000_000};
    expect(await buildClientFingerprint(serializeSellerJourney(draft))).toBe(first);
    expect(createValidBothJourneyFixture().preApprovedAmountCents).toEqual({state:'answered',value:45_000_000});
  });
  it('reuses the ID on uncertain delivery and mints a new ID after a material edit',async()=>{
    const draft=createValidBothJourneyFixture();const first=await prepareSellerJourneyAttempt(draft);
    expect(first.request.submissionId).toBe(firstId);expect(first.attempt.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect((await prepareSellerJourneyAttempt(draft,{},first.attempt)).request.submissionId).toBe(firstId);
    draft.facts.squareFeet={state:'answered',value:2200};
    expect((await prepareSellerJourneyAttempt(draft,{},first.attempt)).request.submissionId).toBe(secondId);
    expect(globalThis.crypto.randomUUID).toHaveBeenCalledTimes(2);
  });
  it('fails safely when secure fingerprinting is unavailable',async()=>{
    vi.stubGlobal('crypto',{});await expect(buildClientFingerprint(valid())).rejects.toMatchObject({code:'crypto_unavailable'});
    vi.stubGlobal('crypto',{subtle:{digest:async()=>{throw new Error('private runtime error');}}});
    await expect(buildClientFingerprint(valid())).rejects.toMatchObject({code:'crypto_unavailable'});
    expect(()=>serializeSellerJourney(createInitialJourneyDraft())).toThrow(JourneyRequestError);
  });
});

describe('accepted receipt and optional existing scheduling validator',()=>{
  it('requires success and accepted rather than treating arbitrary JSON as a save',()=>{
    for(const body of [{success:true},{success:true,accepted:false},{success:false,accepted:true},{success:true,accepted:true,duplicate:'yes'},null]) expect(()=>readSellerReceipt(body)).toThrow('could not confirm');
    expect(readSellerReceipt({success:true,accepted:true,duplicate:true,agentId:'private'})).toEqual({accepted:true,duplicate:true});
  });
  it('keeps the accepted receipt when optional booking data is missing, invalid or throws',()=>{
    const rejected=()=>null,throwing=()=>{throw new Error('private capability');};
    expect(readSellerReceipt({success:true,accepted:true})).toEqual({accepted:true,duplicate:false});
    expect(readSellerReceipt({success:true,accepted:true,bookingOffer:{token:'bad'}},rejected)).toEqual({accepted:true,duplicate:false});
    expect(readSellerReceipt({success:true,accepted:true,bookingOffer:{}},throwing)).toEqual({accepted:true,duplicate:false});
    expect(readSellerReceipt({success:true,accepted:true,bookingOffer:{}},()=>undefined)).toEqual({accepted:true,duplicate:false});
  });
  it('uses the injected scheduling validator instead of copying a second booking contract',()=>{
    const parsed={capability:'validated-example'};const validator=vi.fn(()=>parsed);
    expect(readSellerReceipt({success:true,accepted:true,bookingOffer:{token:'opaque'}},validator)).toEqual({accepted:true,duplicate:false,bookingOffer:parsed});
    expect(validator).toHaveBeenCalledWith({token:'opaque'});
  });
});
