import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),query:vi.fn(),maybe:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabaseAdmin:{from:mocks.from,rpc:mocks.rpc}}));
import {createSellerBookingOffer,resolveSellerConsultationAuthority,SellerConsultationAccessError} from '@/lib/scheduling/sellerConsultationAuthority.server';
const identity={leadId:'af638465-83b5-411b-aa27-a4be94195a85',funnelId:'8cc56813-93be-4018-afd4-e152c329f4b3',agentId:'test-site',site:'test'};
const query={select:mocks.query,eq:mocks.query,abortSignal:mocks.query,maybeSingle:mocks.maybe};
const result=(data:unknown,error:unknown=null)=>Object.assign(Promise.resolve({data,error}),{abortSignal:vi.fn().mockResolvedValue({data,error})});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('SELLER_BOOKING_CAPABILITY_SECRET','test-internal-calendar-signing-key-at-least-32-bytes');mocks.from.mockReturnValue(query);mocks.query.mockReturnValue(query);mocks.maybe.mockReturnValue(result({id:'config',enabled:true}));mocks.rpc.mockReturnValue(result({status:'available',slots:[]}));});
describe('internal scheduling authority',()=>{
  it('issues an expiring offer only with a configured authority and signing secret',async()=>{
    expect(await createSellerBookingOffer(identity)).toMatchObject({token:expect.any(String),expiresAt:expect.any(String)});
    expect(mocks.rpc).toHaveBeenCalledWith('seller_consultation_availability',expect.objectContaining({p_identity:identity}));
    vi.stubEnv('SELLER_BOOKING_CAPABILITY_SECRET','');mocks.from.mockClear();expect(await createSellerBookingOffer(identity)).toBeNull();expect(mocks.from).not.toHaveBeenCalled();
  });
  it('preserves the inquiry when configuration, availability or storage is unavailable',async()=>{
    mocks.maybe.mockReturnValue(result(null));expect(await createSellerBookingOffer(identity)).toBeNull();
    mocks.maybe.mockReturnValue(result({id:'config',enabled:false}));mocks.rpc.mockReturnValue(result({status:'unavailable',reason:'not_configured'}));expect(await createSellerBookingOffer(identity)).toBeNull();
    mocks.rpc.mockReturnValue(result(null,{code:'08006'}));expect(await createSellerBookingOffer(identity)).toBeNull();
  });
  it('keeps uncertain transactions uncertain and distinguishes known conflicts and access revocation',async()=>{
    const authority=await resolveSellerConsultationAuthority(identity);
    const input={identity,slotId:'slot',requestId:'dc953f78-07fb-4196-9e61-c83f1c4d185a'};
    mocks.rpc.mockReturnValue(result(null,{code:'08006'}));expect(await authority!.reserve(input)).toEqual({status:'uncertain'});
    mocks.rpc.mockReturnValue(result({status:'confirmed'}));expect(await authority!.reserve(input)).toEqual({status:'uncertain'});
    mocks.rpc.mockReturnValue(result(null,{code:'23P01'}));expect(await authority!.reserve(input)).toEqual({status:'conflict'});
    mocks.rpc.mockReturnValue(result(null,{code:'42501'}));await expect(authority!.reserve(input)).rejects.toBeInstanceOf(SellerConsultationAccessError);
  });
});
