import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {command,pulseRoot} from './docker-acceptance.mjs';

const option=name=>{const index=process.argv.indexOf(name);return index<0?undefined:process.argv[index+1];};
const stack=option('--stack');assert.match(stack||'',/^pulse_auth_[a-f0-9]{8}$/,'Use the generated disposable acceptance runner.');
const production=process.argv.includes('--production');
const vibeCms=process.argv.includes('--vibe-cms');assert(!vibeCms || production,'CMS shortcut rejection must run in production mode.');
const api=new URL(option('--api-url')),serverOrigin=new URL(option('--origin'));
for(const target of [api,serverOrigin]) assert(target.protocol==='http:' && ['127.0.0.1','localhost'].includes(target.hostname) && target.port && !target.username && !target.password && target.pathname==='/' && !target.search && !target.hash,'Acceptance targets must be plain loopback HTTP origins.');
assert(!(await readdir(pulseRoot)).some(name=>/^\.env(?:\.(?:development|production|test))?(?:\.local)?$/.test(name)),'Use a checkout without runtime env files.');
const repositoryRoot=resolve(pulseRoot,'../..'),lockText=await readFile(join(repositoryRoot,'package-lock.json'),'utf8'),lock=JSON.parse(lockText);
const dependencyVersions={};
for(const name of ['next','zod']) {
  const installed=JSON.parse(await readFile(join(repositoryRoot,'node_modules',name,'package.json'),'utf8')).version;
  assert.equal(installed,lock.packages[`node_modules/${name}`]?.version,`Install this checkout's lockfile before security acceptance (${name}).`);dependencyVersions[name]=installed;
}
const origin=`http://admin.localhost:${serverOrigin.port}`,probe='/api/admin/mls/status';
const sql=input=>command('docker',['exec','-i',`supabase_db_${stack}`,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:`SET statement_timeout='20s';\n${input}`});
const expectedVersions=(await readdir(join(pulseRoot,'supabase','migrations'))).filter(name=>name.endsWith('.sql')).map(name=>name.split('_')[0]).sort();
const applied=(await sql('SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;')).split('\n');
assert.deepEqual(applied,expectedVersions,'The generated migration chain must match this standalone checkout.');
assert(applied.includes('20261103150000'));
const consultationTablesPresent=(await sql("SELECT to_regclass('public.seller_consultation_settings') IS NOT NULL;"))==='t';
const packet=await readFile(new URL('../supabase/tests/database/profile_role_assignment.sql',import.meta.url),'utf8');
const assertions=await sql(`SET search_path=public,extensions;\n${packet}`);
assert(!/^not ok\b/m.test(assertions),`Role database assertions failed:\n${assertions}`);assert.match(assertions,/\b1\.\.18\b/);
console.log(`PASS: 18 role database assertions on ${applied.length} standalone migrations; consultation tables ${consultationTablesPresent?'present':'absent'}.`);

const entries=JSON.parse(await command('docker',['inspect',`supabase_studio_${stack}`,'--format','{{json .Config.Env}}']));
const localValue=name=>entries.find(line=>line.startsWith(name+'='))?.slice(name.length+1);
const anon=localValue('SUPABASE_ANON_KEY'),service=localValue('SUPABASE_SERVICE_KEY');assert(anon && service,'Generated local credentials are unavailable.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(api.origin,service,options),publicAuth=createClient(api.origin,anon,options);
const osEnv=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(?:PATH|PATHEXT|SystemRoot|windir|ComSpec|TEMP|TMP|APPDATA|LOCALAPPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH|ProgramData|PROGRAMFILES|PROGRAMFILES\(X86\))$/i.test(key)));
const env={...osEnv,NODE_ENV:production?'production':'development',NODE_OPTIONS:'--max-old-space-size=6144',NEXT_TELEMETRY_DISABLED:'1',
  NEXT_PUBLIC_SUPABASE_URL:api.origin,SUPABASE_URL:api.origin,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:service,
  NEXT_PUBLIC_SITE_URL:origin,NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN:origin,NEXT_PUBLIC_ROOT_DOMAIN:'localhost',
  NEXT_PUBLIC_MOCK_MODE:'false',NEXT_PUBLIC_E2E_MODE:'false',NEXT_PUBLIC_PULSE_MOCK_AUTH_ENABLED:'false',E2E_OPERATOR_ACCESS:vibeCms?'true':'false',JAMIE_PUBLIC_GUIDE_E2E_FIXTURE:'false',
  OPERATOR_EMAIL:'',AUTHORIZED_EMAIL:'',SELLER_EMAIL_SEND_ENABLED:'false',RESEND_API_KEY:'',VIBE_CMS_PUBLIC_WRITE_WIP:vibeCms?'true':'false',
  MONGODB_URI:'mongodb://127.0.0.1:1/pulse_security_unavailable',GROQ_API_KEY:'local-test-placeholder',OPENAI_API_KEY:'local-test-placeholder',STRIPE_SECRET_KEY:'sk_test_local_only'};
const artifacts=join(pulseRoot,'.pulse-local',vibeCms?'vibe-cms-hotfix':'profile-role-hotfix');await mkdir(artifacts,{recursive:true});
const userIds=[],pageErrors=[],signals=[];let server,browser,build;
const cmsCases=[];
let callbackWrites=0,buildSeconds=null;
try {
  // Generated-project fixture grant exercises successful service writes. It is not a migration.
  await sql('GRANT SELECT,INSERT,UPDATE ON public.profiles TO service_role;');
  const next=fileURLToPath(new URL('../../../node_modules/next/dist/bin/next',import.meta.url));
  if(production) {
    console.log('Building the standalone hotfix with main-lockfile dependencies and generated local backends.');
    const buildStarted=Date.now();
    build=spawn(process.execPath,[next,'build','--no-lint'],{cwd:pulseRoot,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let log='',writes=Promise.resolve();
    for(const stream of [build.stdout,build.stderr]) stream.on('data',chunk=>{
      log+=chunk.toString().replaceAll(anon,'[local-anon-key]').replaceAll(service,'[local-service-key]').replace(/eyJ[A-Za-z0-9_.-]+/g,'[local-token]');
      const snapshot=log;writes=writes.then(()=>writeFile(join(artifacts,'build.log'),snapshot));
    });
    const code=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Standalone optimized build exceeded ten minutes.')),600000);
      build.once('error',error=>{clearTimeout(timer);reject(error);});build.once('exit',value=>{clearTimeout(timer);resolve(value);});
    });await writes;
    if(code!==0) {
      const diagnostics=log.split(/\r?\n/).filter(line=>/Error|Failed|Cannot|Type error|Module not found/.test(line)).slice(-12).join('\n');
      throw new Error('Standalone optimized build failed. Redacted build.log is retained.\n'+diagnostics);
    }
    console.log('PASS: standalone optimized production build.');
    buildSeconds=Math.round((Date.now()-buildStarted)/1000);
  }
  server=spawn(process.execPath,[next,production?'start':'dev','--hostname','127.0.0.1','--port',serverOrigin.port],{cwd:pulseRoot,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let serverSpawnFailed=false;server.once('error',()=>{serverSpawnFailed=true;});
  for(const stream of [server.stdout,server.stderr]) stream.on('data',chunk=>{
    for(const line of chunk.toString().split(/\r?\n/)) {
      const match=/\b(GET|POST|PATCH) (\/auth\/callback|\/api\/admin\/mls\/status|\/api\/vibes(?:\/[^ ?]*)?|\/api\/jamie\/vibes|\/login)(?:\?[^ ]*)? (\d{3})/.exec(line);
      if(match) signals.push({method:match[1],path:match[2],status:Number(match[3])});
      if(line.includes('[AUTH_CALLBACK] Profile sync failed:')) signals.push({profileSyncFailed:true});
    }
  });
  let ready=false;
  for(let attempt=0;attempt<90;attempt++) {
    assert(!serverSpawnFailed && server.exitCode===null,'Owned acceptance server exited early.');
    try {if((await fetch(serverOrigin.origin+'/api/workspaces',{signal:AbortSignal.timeout(2000)})).status===401){ready=true;break;}} catch {}
    await delay(1000);
  }
  assert(ready,'The local anonymous workspace read did not become ready.');
  if(vibeCms) {
    const spoofed=await fetch(serverOrigin.origin+probe,{headers:{host:`localhost:${serverOrigin.port}`},signal:AbortSignal.timeout(30000)});
    assert.equal(spoofed.status,403,'Production must ignore E2E operator access even with a loopback Host header.');
  }
  browser=await chromium.launch({headless:true});
  async function cmsAccess(page,label,allowed=false) {
    if(!vibeCms) return;
    const probes=[...(!allowed?[{path:'/api/vibes',method:'GET'},{path:'/api/vibes/taxonomy',method:'GET'},{path:'/api/vibes/fixture',method:'GET'},{path:'/api/jamie/vibes',method:'GET'}]:[]),
      {path:'/api/vibes',method:'POST'},{path:'/api/vibes/fixture',method:'PATCH'},{path:'/api/vibes/fixture/publish',method:'POST'},{path:'/api/vibes/bulk',method:'POST'},{path:'/api/jamie/vibes',method:'POST'}];
    for(const item of probes) {
      const code=await page.evaluate(async ({path,method})=>(await fetch(path,{method,cache:'no-store',headers:{'content-type':'application/json'},...(method==='GET'?{}:{body:'null'})})).status,item);
      assert.equal(code,allowed?400:403,`${label} ${item.method} ${item.path} must ${allowed?'reach validation only':'be denied'}.`);
    }
    cmsCases.push({actor:label,probes:probes.length,status:allowed?400:403});
  }
  const anonymousContext=await browser.newContext();
  try {
    const anonymousPage=await anonymousContext.newPage();
    assert.equal((await anonymousPage.goto(origin+probe,{timeout:120000})).status(),403,'The reserved hostname must not grant anonymous local operator access.');
    await cmsAccess(anonymousPage,'anonymous');
  } finally {await anonymousContext.close();}

  async function account(role,{untrusted=false}={}) {
    const email=`role-${randomUUID()}@example.test`,password=`Test-${randomUUID()}!`;
    const result=untrusted?await publicAuth.auth.signUp({email,password,options:{data:{role}}}):await admin.auth.admin.createUser({email,password,email_confirm:true});
    assert(!result.error,`Generated account creation failed: ${result.error?.code}`);
    const id=result.data.user?.id;assert.match(id,/^[a-f0-9-]{36}$/);userIds.push(id);
    if(!untrusted) {assert(['operator','admin'].includes(role));await sql(`UPDATE public.profiles SET role='${role}' WHERE id='${id}';`);}
    await sql(`UPDATE public.profiles SET welcome_email_sent=true WHERE id='${id}';`);
    const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',()=>pageErrors.push('browser_exception'));
    await page.goto(origin+'/login?redirect=%2Fapi%2Fworkspaces',{timeout:120000});
    await expect(page.getByRole('heading',{name:'Sign In',exact:true})).toBeVisible();
    const form=page.locator('form').filter({has:page.getByRole('button',{name:'Sign In',exact:true})});await expect(form).toHaveCount(1);
    await form.getByPlaceholder('Email Address').fill(email);await form.getByPlaceholder('Password',{exact:true}).fill(password);
    await form.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL(origin+'/api/workspaces',{timeout:60000});
    assert.equal(JSON.parse(await page.locator('body').innerText()).ok,true);
    assert(!(await context.cookies()).some(cookie=>cookie.name==='pulse_mock_session'));
    return {id,email,page};
  }
  const status=async account=>account.page.evaluate(async path=>(await fetch(path)).status,probe);
  const roleOf=account=>sql(`SELECT role FROM public.profiles WHERE id='${account.id}';`);
  async function callback(account) {
    await sql(`UPDATE public.profiles SET full_name='BEFORE CALLBACK ACCEPTANCE' WHERE id='${account.id}';`);
    const link=await admin.auth.admin.generateLink({type:'magiclink',email:account.email});
    const token=link.data?.properties?.hashed_token;assert(!link.error && token,'Local single-use callback link could not be generated.');
    try {await account.page.goto(origin+'/auth/callback?'+new URLSearchParams({token_hash:token,type:'magiclink',next:probe}),{timeout:120000});}
    catch {throw new Error('Local callback navigation failed; single-use credentials withheld.');}
    const destination=new URL(account.page.url());assert.equal(destination.origin,origin);assert.equal(destination.pathname,probe);
    assert.equal(await sql(`SELECT full_name=split_part(email,'@',1) FROM public.profiles WHERE id='${account.id}';`),'t','A benign profile field must prove the callback writer executed.');
    callbackWrites++;
  }
  const forged=await account('admin',{untrusted:true});assert.equal(await roleOf(forged),'consumer');assert.equal(await status(forged),403);
  await callback(forged);assert.equal(await roleOf(forged),'consumer');assert.equal(await status(forged),403);
  await cmsAccess(forged.page,'forged-admin-signup');
  console.log('PASS: actual public signup and callback cannot turn an administrator metadata claim into operator access.');
  for(const role of ['operator','admin']) {
    const approved=await account(role);assert.equal(await status(approved),200);await callback(approved);
    assert.equal(await roleOf(approved),role);assert.equal(await status(approved),200);
    await cmsAccess(approved.page,role,true);
  }
  const realtor=await account('realtor',{untrusted:true});assert.equal(await roleOf(realtor),'realtor');assert.equal(await status(realtor),200);
  await cmsAccess(realtor.page,'realtor');
  assert.equal(callbackWrites,3);assert.deepEqual(pageErrors,[]);assert(!signals.some(signal=>signal.profileSyncFailed));
  await writeFile(join(artifacts,'result.json'),JSON.stringify({checkedAt:new Date().toISOString(),mode:production?'production':'development',migrationCount:applied.length,consultationTablesPresent,
    buildSeconds,dependencyVersions,lockSha256:createHash('sha256').update(lockText.replaceAll('\r\n','\n')).digest('hex'),
    mockAuth:false,localOperatorBypass:false,forgedSignupRole:'consumer',forgedProtectedStatus:403,operatorStatus:200,adminStatus:200,realtorRegistration:'preserved',callbackProfileWrites:callbackWrites,
    ...(vibeCms?{cms:{wipFlag:true,e2eOperatorFlag:true,productionShortcutsDenied:true,contentWrites:0,cases:cmsCases}}:{})},null,2)+'\n');
  if(vibeCms) console.log('PASS: production ignores enabled WIP/E2E flags; CMS denies anonymous/consumer/realtor and admits operator/admin to validation without content writes.');
  console.log('PASS: real operator/admin roles survive three successful callback writes; public realtor registration remains available.');
} finally {
  await browser?.close();
  if(server?.pid && server.exitCode===null) {
    if(process.platform==='win32') await command('taskkill',['/PID',String(server.pid),'/T','/F']);else server.kill('SIGTERM');
  }
  if(build?.pid && build.exitCode===null) {
    if(process.platform==='win32') await command('taskkill',['/PID',String(build.pid),'/T','/F']);else build.kill('SIGTERM');
  }
  for(const id of userIds) {const result=await admin.auth.admin.deleteUser(id);assert(!result.error,'Generated account cleanup failed.');}
  await writeFile(join(artifacts,'route-signals.json'),JSON.stringify(signals,null,2)+'\n');
}
