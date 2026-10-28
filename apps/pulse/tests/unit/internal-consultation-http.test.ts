import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({resolve:vi.fn(),limit:vi.fn(),list:vi.fn(),reserve:vi.fn()}));
vi.mock('@/lib/core/publicApiRateLimit',()=>({applyPublicApiRateLimit:mocks.limit}));
vi.mock('@/lib/scheduling/sellerConsultationAuthority.server',()=>({resolveSellerConsultationAuthority:mocks.resolve,SellerConsultationAccessError:class extends Error{}}));
import {sellerConsultationHttp} from '@/lib/scheduling/sellerConsultationHttp.server';
import {createSellerBookingCapability} from '@/lib/scheduling/sellerBookingCapability.server';
import {SellerConsultationAccessError} from '@/lib/scheduling/sellerConsultationAuthority.server';
const secret='test-internal-calendar-signing-secret-at-least-32-bytes';
const identity={leadId:'af638465-83b5-411b-aa27-a4be94195a85',funnelId:'8cc56813-93be-4018-afd4-e152c329f4b3',agentId:'test-site',site:'test'};
const requestId='dc953f78-07fb-4196-9e61-c83f1c4d185a';
const window={from:'2026-11-01T00:00:00Z',to:'2026-11-10T00:00:00Z',timeZone:'America/Chicago'};
function request(value:unknown,origin='https://sunsetpulse.app') {return new Request('https://sunsetpulse.app/api/seller-consultations/availability',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify(value)});}
const token=()=>createSellerBookingCapability(identity,secret).token;
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('SELLER_BOOKING_CAPABILITY_SECRET',secret);mocks.limit.mockResolvedValue(null);mocks.resolve.mockResolvedValue({listSlots:mocks.list,reserve:mocks.reserve});mocks.list.mockResolvedValue({status:'available',slots:[]});});
describe('internal consultation public boundary',()=>{
  it('derives identity only from a signed capability and requires distributed limiting',async()=>{
    const response=await sellerConsultationHttp(request({capability:token(),window}),'availability');
    expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.list).toHaveBeenCalledWith({...window,identity});
    expect(mocks.limit).toHaveBeenCalledWith(expect.any(Request),'seller-consultation-availability',20,60,{requireDistributed:true});
  });
  it('rejects tampering, expiry and client-selected lead identity before database access',async()=>{
    for(const body of [{capability:token()+'x',window},{capability:createSellerBookingCapability(identity,secret,Date.now()-3600000).token,window},{capability:token(),window,identity}]) {
      expect([400,403]).toContain((await sellerConsultationHttp(request(body),'availability')).status);
    }
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it('rejects foreign origin, non-JSON and oversized bodies before lookup',async()=>{
    expect((await sellerConsultationHttp(request({},'https://evil.test'),'availability')).status).toBe(403);
    expect((await sellerConsultationHttp(new Request('https://sunsetpulse.app/api/test',{method:'POST',headers:{origin:'https://sunsetpulse.app'},body:'{}'}),'availability')).status).toBe(415);
    expect((await sellerConsultationHttp(request({padding:'x'.repeat(13000)}),'availability')).status).toBe(413);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it('fails closed without signing configuration or calendar authority',async()=>{
    const capability=token();vi.stubEnv('SELLER_BOOKING_CAPABILITY_SECRET','');
    expect((await sellerConsultationHttp(request({capability,window}),'availability')).status).toBe(503);
    vi.stubEnv('SELLER_BOOKING_CAPABILITY_SECRET',secret);mocks.resolve.mockResolvedValue(null);
    expect((await sellerConsultationHttp(request({capability,window}),'availability')).status).toBe(503);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it('preserves reservation identity and marks lost responses as uncertain',async()=>{
    mocks.reserve.mockResolvedValueOnce({status:'uncertain'}).mockRejectedValueOnce(new Error('connection lost'));
    const body={capability:token(),slotId:'valid-slot',requestId};
    for(let i=0;i<2;i++) {const response=await sellerConsultationHttp(request(body),'reservation');expect(response.status).toBe(202);expect(await response.json()).toEqual({status:'uncertain'});}
    expect(mocks.reserve).toHaveBeenCalledWith({identity,slotId:'valid-slot',requestId});
  });
  it('returns a definitive conflict or revoked access without claiming confirmation',async()=>{
    mocks.reserve.mockResolvedValueOnce({status:'conflict'}).mockRejectedValueOnce(new SellerConsultationAccessError());
    const body={capability:token(),slotId:'valid-slot',requestId};
    expect((await sellerConsultationHttp(request(body),'reservation')).status).toBe(409);
    expect((await sellerConsultationHttp(request(body),'reservation')).status).toBe(403);
  });
});
