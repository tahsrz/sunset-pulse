import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {SellerOfferMeasurement} from '@/components/lead-capture/SellerOfferMeasurement';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),rate:vi.fn(),tenant:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/supabase',()=>({supabaseAdmin:{rpc:mocks.rpc}}));
vi.mock('@/lib/core/publicApiRateLimit',()=>({applyPublicApiRateLimit:mocks.rate}));
vi.mock('@/lib/sites/siteData',()=>({getTenantSite:mocks.tenant}));
import {POST} from '@/app/api/seller-offer-events/route';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.clearAllMocks();});
it('records neither visits nor request actions until the visitor opts in; disabling detaches measurement',async()=>{
  const fetcher=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({ok:true}));vi.stubGlobal('fetch',fetcher);
  render(<><form id="request"><button>Request</button></form><SellerOfferMeasurement/></>);
  fireEvent.submit(document.getElementById('request')!);expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox'));await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());
  fireEvent.submit(document.getElementById('request')!);await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));
  const visit=JSON.parse(String(fetcher.mock.calls[0][1]?.body)),click=JSON.parse(String(fetcher.mock.calls[1][1]?.body));
  expect(visit).toMatchObject({consent:true,type:'visit'});expect(click).toMatchObject({consent:true,type:'offer_click',visitId:visit.visitId});
  expect(Object.keys(click).sort()).toEqual(['campaign','consent','type','visitId']);
  fireEvent.click(screen.getByRole('checkbox'));fireEvent.submit(document.getElementById('request')!);expect(fetcher).toHaveBeenCalledTimes(2);
});
it('resolves the configured published tenant on the server and scrubs campaign identifiers',async()=>{
  vi.stubEnv('KELLER_WESTLAKE_AGENT_SITE','seller-site');mocks.rate.mockResolvedValue(null);mocks.tenant.mockResolvedValue({isPublished:true,status:'active',agentId:'server-resolved-agent'});mocks.rpc.mockResolvedValue({error:null});
  const request=new NextRequest('http://localhost/api/seller-offer-events',{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://localhost'},body:JSON.stringify({consent:true,visitId:'11111111-1111-4111-8111-111111111111',type:'visit',campaign:'private@example.test'})});
  expect((await POST(request)).status).toBe(200);expect(mocks.rpc).toHaveBeenCalledWith('seller_offer_record',{p_agent_id:'server-resolved-agent',p_site:'seller-site',p_visit_id:'11111111-1111-4111-8111-111111111111',p_type:'visit',p_campaign:'unattributed/unknown'});
  expect(mocks.rate).toHaveBeenCalledWith(request,'seller-offer-measurement',12,60,{requireDistributed:true});
});
it('rejects missing consent and foreign origins and fails closed when distributed limiting is unavailable',async()=>{
  vi.stubEnv('KELLER_WESTLAKE_AGENT_SITE','seller-site');
  const input={consent:true,visitId:'11111111-1111-4111-8111-111111111111',type:'visit',campaign:null};
  const create=(body:unknown,origin='http://localhost')=>new NextRequest('http://localhost/api/seller-offer-events',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
  expect((await POST(create({...input,consent:false}))).status).toBe(400);expect((await POST(create(input,'https://foreign.example'))).status).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.rate.mockResolvedValue(new Response('{}',{status:503}));expect((await POST(create(input))).status).toBe(503);expect(mocks.tenant).not.toHaveBeenCalled();
});
