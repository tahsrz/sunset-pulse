import {beforeEach,describe,expect,it,vi} from 'vitest';
import {applyHomeFactsRecord,changeJourneyAddress,createInitialJourneyDraft} from '@/lib/marketing/guidedJourney';
import {homeAddressSearchPrefix,homeFactsLookupInputSchema,homeFactsLookupSchema,matchHomeFacts,projectHomeFacts,type HomeFactsRecord,type PublicHomeFactsRow} from '@/lib/marketing/homeFactsLookup';
const {search}=vi.hoisted(()=>({search:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/data/listingRepository',()=>({searchPublicHomeFactsRows:search}));
import {lookupExampleHomeFacts,lookupSavedHomeFacts} from '@/lib/marketing/homeFactsLookup.server';

const row:PublicHomeFactsRow={id:'home-a',street:'100 Example Lane',city:'Keller',state:'TX',zip:'76248',beds:0,baths:2.5,sqft:2100,source:'MLS',last_updated:'2026-11-04T12:00:00Z',display_public:true,is_demo:false};
const home=()=>projectHomeFacts(row)!;
beforeEach(()=>{vi.clearAllMocks();search.mockResolvedValue([row]);});

describe('public home facts and address matching',()=>{
  it('projects only bounded public facts, preserving zero without splitting aggregate bathrooms',()=>{
    const result=projectHomeFacts({...row,owner:'private',metadata:{yearBuilt:2001,privateRemarks:'secret'}} as PublicHomeFactsRow);
    expect(result).toEqual({id:'home-a',address:{line1:'100 Example Lane',city:'Keller',region:'TX',postalCode:'76248'},facts:{bedrooms:0,squareFeet:2100},totalBathrooms:2.5,source:'MLS',recordedAt:'2026-11-04T12:00:00.000Z'});
    expect(JSON.stringify(result)).not.toMatch(/private|metadata|owner|fullBaths|halfBaths|yearBuilt/);
  });
  it('does not coerce missing or invalid numbers to zero',()=>{
    expect(projectHomeFacts({...row,beds:null,sqft:0,baths:NaN,last_updated:'bad'})!).toMatchObject({facts:{},totalBathrooms:null,recordedAt:null});
    expect(projectHomeFacts({...row,beds:'3',sqft:-1})!.facts).toEqual({});
  });
  it('rejects private, demo and invalid source records',()=>{
    expect(projectHomeFacts({...row,display_public:false})).toBeNull();expect(projectHomeFacts({...row,is_demo:true})).toBeNull();
    expect(projectHomeFacts({...row,source:'unverified'})).toBeNull();
  });
  it('normalizes street abbreviations but keeps house numbers and units distinct',()=>{
    expect(matchHomeFacts('100 Example Ln',[home()]).status).toBe('matched');
    expect(matchHomeFacts('100 Example Lane, Keller TX 76248',[home()]).status).toBe('matched');
    for(const query of ['10 Example Lane','100 Example Road','100 Example Lane Apt 2','100 Example Lane Arlington']) expect(matchHomeFacts(query,[home()]).status).toBe('not_found');
  });
  it('returns ambiguous addresses as choices instead of taking the first result',()=>{
    const second={...home(),id:'home-b',address:{...home().address,city:'Arlington',postalCode:'76013'}};
    const result=matchHomeFacts('100 Example Lane',[home(),second]);
    expect(result.status).toBe('multiple');if(result.status==='multiple') expect(result.candidates).toHaveLength(2);
    expect(matchHomeFacts('100 Example Ln, Arlington',[home(),second])).toMatchObject({status:'matched',property:{id:'home-b'}});
  });
  it('uses the newest whole record per full address without combining old facts',()=>{
    const newer={...home(),id:'newer',recordedAt:'2026-11-05T12:00:00.000Z',facts:{bedrooms:4}};
    expect(matchHomeFacts('100 Example Lane',[home(),newer])).toEqual({status:'matched',property:newer});
  });
  it('requires refinement when the candidate pool was truncated and bounds the choices',()=>{
    expect(matchHomeFacts('100 Example Lane',[home()],true)).toEqual({status:'refine'});
    const many=Array.from({length:8},(_,index)=>({...home(),id:`home-${index}`,address:{...home().address,city:`City ${index}`}}));
    expect(matchHomeFacts('100 Example Lane',many)).toMatchObject({status:'multiple',moreMatches:true,candidates:expect.any(Array)});
    const result=matchHomeFacts('100 Example Lane',many);if(result.status==='multiple') expect(result.candidates).toHaveLength(5);
  });
  it('rejects oversized, unknown and control-character input and unsafe response extras',()=>{
    for(const input of [{query:''},{query:'a'.repeat(181)},{query:'100 Example\nLane'},{query:'100 Example Lane',owner:true}]) expect(homeFactsLookupInputSchema.safeParse(input).success).toBe(false);
    expect(homeFactsLookupSchema.safeParse({status:'matched',property:{...home(),owner:'secret'}}).success).toBe(false);
    expect(homeAddressSearchPrefix('100 Example Ln, Keller')).toBe('100 Example');
    expect(homeAddressSearchPrefix('100 West Example Lane')).toBe('100 ');
    expect(homeAddressSearchPrefix('100 % OR private')).toBeNull();
  });
  it('fills only unanswered facts and preserves corrections and explicit unknowns',()=>{
    const draft={...createInitialJourneyDraft(),mode:'sell' as const};
    draft.facts.bedrooms={state:'answered',value:5};draft.facts.stories={state:'unknown'};
    const filled=applyHomeFactsRecord(draft,home());
    expect(filled.facts.bedrooms).toEqual({state:'answered',value:5});expect(filled.facts.squareFeet).toEqual({state:'answered',value:2100});
    expect(filled.facts.fullBaths.state).toBe('unanswered');expect(filled.facts.stories.state).toBe('unknown');expect(filled.address.confirmed).toBe(false);
    expect(draft.facts.squareFeet.state).toBe('unanswered');
  });
  it('clears previous property context and facts on address or selected-property changes',()=>{
    const filled=applyHomeFactsRecord({...createInitialJourneyDraft(),mode:'both'},home());filled.address.confirmed=true;
    const changed=changeJourneyAddress(filled,'200 Other Street');
    expect(changed.propertyMatch).toBeNull();expect(changed.facts.bedrooms.state).toBe('unanswered');expect(changed.address.city).toBe('');expect(changed.address.confirmed).toBe(false);
    const replacement:HomeFactsRecord={...home(),id:'different',facts:{squareFeet:1800}};
    expect(applyHomeFactsRecord(filled,replacement).facts.bedrooms.state).toBe('unanswered');
    expect(filled.facts.bedrooms).toEqual({state:'answered',value:0});
  });
});

describe('saved-record reader and explicit local examples',()=>{
  it('reads a bounded public pool and projects it before matching',async()=>{
    const signal=new AbortController().signal;
    expect(await lookupSavedHomeFacts('100 Example Ln',signal)).toMatchObject({status:'matched'});
    expect(search).toHaveBeenCalledWith('100 Example',signal,{});
    await lookupSavedHomeFacts('100 Example Lane, Keller TX 76248',signal);
    expect(search).toHaveBeenLastCalledWith('100 Example',signal,{city:'Keller',postalCode:'76248'});
  });
  it('does not query without a useful street prefix and does not mask database failure as no match',async()=>{
    expect(await lookupSavedHomeFacts('Example Lane',new AbortController().signal)).toEqual({status:'not_found'});expect(search).not.toHaveBeenCalled();
    search.mockRejectedValueOnce(new Error('DB unavailable'));
    await expect(lookupSavedHomeFacts('100 Example Lane',new AbortController().signal)).rejects.toThrow();
  });
  it('returns public-only matches and asks for refinement at the pool limit',async()=>{
    search.mockResolvedValueOnce([{...row,display_public:false}]);
    expect(await lookupSavedHomeFacts('100 Example Lane',new AbortController().signal)).toEqual({status:'not_found'});
    search.mockResolvedValueOnce(Array.from({length:31},()=>row));
    expect(await lookupSavedHomeFacts('100 Example Lane',new AbortController().signal)).toEqual({status:'refine'});
  });
  it('demonstrates ambiguous, unique and missing matches without a database read',()=>{
    expect(lookupExampleHomeFacts('100 Example Ln').status).toBe('multiple');
    expect(lookupExampleHomeFacts('100 Example Ln, Keller')).toMatchObject({status:'matched',property:{source:'Example',facts:{bedrooms:3}}});
    expect(lookupExampleHomeFacts('200 Example Street')).toEqual({status:'not_found'});expect(search).not.toHaveBeenCalled();
  });
});
