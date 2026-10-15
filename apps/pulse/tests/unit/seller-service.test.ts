import { beforeEach,afterEach,describe,expect,it,vi } from 'vitest';
import { sellerPublicationSchema,sellerServiceActionSchema } from '@/lib/realtor-workspace/sellerServiceContract';
import { verifySellerEmailSignature } from '@/lib/realtor-workspace/sellerEmailSignature.server';
import { rankSellerPriorities } from '@/lib/realtor-workspace/sellerPriority';
vi.mock('server-only',()=>({}));
import type { SellerDailyData } from '@/lib/realtor-workspace/sellerDailyContract';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),configured:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabaseAdmin:{rpc:mocks.rpc}}));
vi.mock('@/lib/realtor-workspace/sellerService.server',()=>({sellerEmailConfigured:mocks.configured}));
import {runSellerEmail} from '@/lib/autonomous-workflows/sellerEmailWorkflow.server';
const id='f4583459-b7aa-4e35-b19d-cb3c2998aab9';
const identity={leadId:id,expectedRevision:1,requestKey:id};
describe('seller service boundaries',()=>{
  it('requires review, bounded evidence and HTTPS documents; rejects hidden client fields',()=>{
    expect(sellerServiceActionSchema.safeParse({...identity,action:'send_email',expectedLeadRevision:1,subject:'Hello',body:'Message',reviewed:false}).success).toBe(false);
    expect(sellerServiceActionSchema.safeParse({...identity,action:'milestone',milestone:'consultation_held',occurredOn:'2026-02-30',evidence:'held'}).success).toBe(false);
    expect(sellerPublicationSchema.safeParse({summary:'Update',milestones:[],checklist:[],documents:[],notes:'Internal'}).success).toBe(false);
    for(const url of ['javascript:alert(1)','http://example.test/doc','https://user:password@example.test/doc'])expect(sellerPublicationSchema.safeParse({summary:'Update',milestones:[],checklist:[],documents:[{label:'Agreement',url}]}).success).toBe(false);
  });
  it('checks raw bytes, timestamp, signature rotation and the official Svix test vector',()=>{
    const body='{"event_type":"ping","data":{"success":true}}';
    const headers=new Headers({'svix-id':'msg_loFOjxBNrRLzqYUf','svix-timestamp':'1731705121','svix-signature':'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0='});
    expect(verifySellerEmailSignature(body,headers,'whsec_plJ3nmyCDGBKInavdOK15jsl',1731705121000)).toBe(true);
    expect(verifySellerEmailSignature(body+' ',headers,'whsec_plJ3nmyCDGBKInavdOK15jsl',1731705121000)).toBe(false);
    expect(verifySellerEmailSignature(body,headers,'whsec_plJ3nmyCDGBKInavdOK15jsl',1731705422000)).toBe(false);
    expect(verifySellerEmailSignature(body,headers,'whsec_plJ3nmyCDGBKInavdOK15jsl',1731704820000)).toBe(false);
    headers.set('svix-signature','v1,invalid v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=');
    expect(verifySellerEmailSignature(body,headers,'whsec_plJ3nmyCDGBKInavdOK15jsl',1731705121000)).toBe(true);
  });
  it('orders urgent work deterministically and excludes distant consultations',()=>{
    const daily={overdueActions:[{occurrence_id:id,lead_id:id,name:'Overdue',effective_date:'2026-10-08',title_snapshot:'Response'}],unscheduledRequests:[{id,name:'New',created_at:'2026-10-09T00:00:00Z'}],consultations:[{event_id:id,lead_id:id,name:'Tomorrow',occurred_at:'2026-10-09T15:00:00Z'},{event_id:'far',lead_id:id,name:'Far',occurred_at:'2026-11-01T15:00:00Z'}]} as SellerDailyData;
    const extra=[{id:'reply:'+id,leadId:id,title:'Reply',reason:'Reply needs work',score:80,dueAt:'2026-10-09T02:00:00Z'}];
    expect(rankSellerPriorities(daily,extra,Date.parse('2026-10-09T04:00:00Z')).map((row)=>row.title)).toEqual(['Overdue','New','Tomorrow','Reply']);
    expect(daily.consultations).toHaveLength(2);
  });
});
describe('seller email shared worker',()=>{
  const job={id,user_id:id,workflow_key:'seller_email',trigger_kind:'event' as const,payload_version:1,payload:{messageId:id},scheduled_for:'2026-10-09T04:00:00Z',lease_token:id};
  beforeEach(()=>{mocks.rpc.mockReset();mocks.configured.mockReturnValue(true);vi.stubEnv('RESEND_API_KEY','synthetic');vi.stubEnv('RESEND_FROM_EMAIL','Sender <sender@example.test>');});
  afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
  it('sends the frozen one-recipient payload with stable retry identity and commits its receipt',async()=>{
    const message={send:true,messageId:id,to:'seller@example.test',replyTo:'owner@example.test',from:'Frozen <verified@example.test>',subject:'Reviewed',body:'Exact body'};
    mocks.rpc.mockImplementation(async(name)=>({data:name==='seller_email_prepare'?message:id,error:null}));
    const fetcher=vi.fn().mockImplementation(async()=>new Response(JSON.stringify({id:'provider-receipt'})));vi.stubGlobal('fetch',fetcher);
    await runSellerEmail(job);await runSellerEmail(job);
    for(const [,init] of fetcher.mock.calls){expect(init.headers['Idempotency-Key']).toBe(`seller-email:${id}`);expect(JSON.parse(init.body)).toEqual({from:message.from,to:[message.to],reply_to:message.replyTo,subject:message.subject,text:message.body});}
    expect(mocks.rpc).toHaveBeenCalledWith('seller_email_accept',{p_job_id:id,p_lease_token:id,p_provider_id:'provider-receipt'});
  });
  it('never calls a provider for terminal/unknown attempts or disabled configuration',async()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);mocks.rpc.mockResolvedValue({data:{send:false,messageId:id,status:'unknown'},error:null});
    expect(await runSellerEmail(job)).toEqual({kind:'committed',resultId:id,resultStatus:'unknown'});
    mocks.configured.mockReturnValue(false);expect((await runSellerEmail(job)).kind).toBe('defer');expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not record contact without a valid provider acceptance or live database lease',async()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);mocks.rpc.mockResolvedValue({data:null,error:{code:'PT409'}});
    await expect(runSellerEmail(job)).rejects.toThrow('prepare');expect(fetcher).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValue({data:{send:true,messageId:id,to:'seller@example.test',replyTo:'owner@example.test',from:'Sender',subject:'Reviewed',body:'Exact'},error:null});
    fetcher.mockResolvedValue(new Response('private failure',{status:500}));await expect(runSellerEmail(job)).rejects.toThrow('500');expect(mocks.rpc.mock.calls.every(([name])=>name!=='seller_email_accept')).toBe(true);
  });
});
