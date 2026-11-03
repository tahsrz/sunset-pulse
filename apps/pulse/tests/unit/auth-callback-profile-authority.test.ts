import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';

const mocks=vi.hoisted(()=>({server:vi.fn(),service:vi.fn(),read:vi.fn(),upsert:vi.fn(),getUser:vi.fn()}));
vi.mock('@supabase/ssr',()=>({createServerClient:mocks.server}));
vi.mock('@supabase/supabase-js',()=>({createClient:mocks.service}));
import {GET} from '@/app/auth/callback/route';

beforeEach(()=>{
  vi.clearAllMocks();vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','http://127.0.0.1:54321');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','local-test-placeholder');
  vi.stubEnv('NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN','');
  mocks.read.mockResolvedValue({data:{role:'operator'},error:null});
  mocks.getUser.mockResolvedValue({data:{user:{id:'actor',email:'person@example.test',user_metadata:{role:'admin',isSubscribed:true}}},error:null});
  mocks.server.mockReturnValue({auth:{getUser:mocks.getUser,exchangeCodeForSession:vi.fn().mockResolvedValue({error:null})},
    from:()=>({select:()=>({eq:()=>({maybeSingle:mocks.read})})})});
  mocks.upsert.mockReturnValue({select:()=>({single:async()=>({data:{welcome_email_sent:true},error:null})})});
  mocks.service.mockReturnValue({from:()=>({upsert:mocks.upsert})});
});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
const callback=()=>GET(new NextRequest('https://sunsetpulse.app/auth/callback?code=single-use-test-code'));

describe('auth callback profile authority',()=>{
  it.each(['consumer','realtor','operator','admin'])('preserves server-assigned %s authority regardless of metadata',async role=>{
    mocks.read.mockResolvedValue({data:{role},error:null});
    expect((await callback()).status).toBe(307);
    const payload=mocks.upsert.mock.calls[0][0];
    expect(payload).not.toHaveProperty('role');expect(payload).not.toHaveProperty('is_subscribed');expect(payload).not.toHaveProperty('is_advanced_mode');
    expect(payload.email).toBe('person@example.test');
  });
  it.each(['admin','operator','unknown'])('creates only an ordinary missing profile for an untrusted %s claim',async role=>{
    mocks.read.mockResolvedValue({data:null,error:null});
    mocks.getUser.mockResolvedValue({data:{user:{id:'actor',email:'person@example.test',user_metadata:{role,isSubscribed:true}}},error:null});
    await callback();expect(mocks.upsert.mock.calls[0][0]).toMatchObject({role:'consumer',is_subscribed:false,is_advanced_mode:false});
    expect(mocks.upsert.mock.calls[0][1]).toEqual({onConflict:'id',ignoreDuplicates:true});
  });
  it('preserves the existing public realtor registration path',async()=>{
    mocks.read.mockResolvedValue({data:null,error:null});
    mocks.getUser.mockResolvedValue({data:{user:{id:'actor',email:'person@example.test',user_metadata:{role:'realtor'}}},error:null});
    await callback();expect(mocks.upsert.mock.calls[0][0]).toMatchObject({role:'realtor',is_advanced_mode:true});
  });
  it('does not write when the authoritative profile cannot be read',async()=>{
    vi.spyOn(console,'error').mockImplementation(()=>{});mocks.read.mockResolvedValue({data:null,error:{code:'UNAVAILABLE'}});
    await callback();expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it('does not log single-use callback credentials',async()=>{
    const log=vi.spyOn(console,'log').mockImplementation(()=>{});await callback();
    expect(JSON.stringify(log.mock.calls)).not.toContain('single-use-test-code');
  });
  it('uses the explicit auth origin when the server URL normalizes a local hostname',async()=>{
    vi.stubEnv('NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN','http://admin.localhost:3187');
    const response=await GET(new NextRequest('http://localhost:3187/auth/callback?code=single-use-test-code'));
    expect(response.headers.get('location')).toBe('http://admin.localhost:3187/auth/success');
  });
  it.each(['javascript:alert(1)','https://example.test/path','https://user:password@example.test'])('ignores invalid configured origin %s',async origin=>{
    vi.stubEnv('NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN',origin);
    expect((await callback()).headers.get('location')).toBe('https://sunsetpulse.app/auth/success');
  });
});
