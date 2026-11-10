import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {POST} from '@/app/api/seller-plan/preview/property-lookup/route';
const {saved,examples}=vi.hoisted(()=>({saved:vi.fn(),examples:vi.fn()}));
vi.mock('@/lib/marketing/homeFactsLookup.server',()=>({lookupSavedHomeFacts:saved,lookupExampleHomeFacts:examples}));
const url='http://localhost:3000/api/seller-plan/preview/property-lookup';
const request=(body:unknown,origin?:string)=>new Request(url,{method:'POST',headers:origin?{origin}:undefined,body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('NODE_ENV','development');saved.mockResolvedValue({status:'not_found'});examples.mockReturnValue({status:'not_found'});});
afterEach(()=>vi.unstubAllEnvs());
it('denies production before any reader or example invocation',async()=>{
  vi.stubEnv('NODE_ENV','production');expect((await POST(request({query:'100 Example Lane',examples:true}))).status).toBe(404);
  expect(saved).not.toHaveBeenCalled();expect(examples).not.toHaveBeenCalled();
});
it('validates origin, body bounds and exact input keys before reading data',async()=>{
  expect((await POST(request({query:'100 Example Lane'},'https://elsewhere.test'))).status).toBe(403);
  expect((await POST(request({query:'100 Example Lane',owner:true}))).status).toBe(400);
  expect((await POST(request({query:'x'.repeat(1100)}))).status).toBe(413);
  expect((await POST(new Request(url,{method:'POST',body:'{bad'}))).status).toBe(400);
  expect(saved).not.toHaveBeenCalled();
});
it('performs a no-store server read with a timeout signal',async()=>{
  const response=await POST(request({query:'100 Example Lane'}));
  expect(await response.json()).toEqual({status:'not_found'});expect(response.headers.get('cache-control')).toBe('no-store');
  expect(saved).toHaveBeenCalledWith('100 Example Lane',expect.any(AbortSignal));expect(examples).not.toHaveBeenCalled();
});
it('accepts the browser origin when Next dev normalizes the internal URL hostname',async()=>{
  const local=new Request(url,{method:'POST',headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000'},body:JSON.stringify({query:'100 Example Lane',examples:true})});
  expect((await POST(local)).status).toBe(200);expect(examples).toHaveBeenCalledOnce();
});
it('keeps explicitly selected examples separate from the saved reader',async()=>{
  await POST(request({query:'100 Example Lane',examples:true}));expect(examples).toHaveBeenCalledWith('100 Example Lane');expect(saved).not.toHaveBeenCalled();
});
it('returns a distinct unavailable state without leaking provider details or address logs',async()=>{
  saved.mockRejectedValueOnce(new Error('private provider error and address'));
  expect(await (await POST(request({query:'100 Example Lane'}))).json()).toEqual({status:'unavailable'});
});
