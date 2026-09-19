import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { command, pulseRoot } from './docker-acceptance.mjs';

// Explicit local-only acceptance. No .env reads, mock sessions, storageState,
// production host, broad DB reset, queue drain or persistent credentials.
const stack=process.argv[process.argv.indexOf('--stack')+1];
if (!process.argv.includes('--stack') || !/^[a-z0-9_-]+$/.test(stack)) throw new Error('Pass the existing local --stack ID.');
const api='http://127.0.0.1:54321', origin='http://127.0.0.1:3176';
const db=`supabase_db_${stack}`;
const sql=(input)=>command('docker',['exec','-i',db,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:`SET statement_timeout='20s';\n${input}`});
const migrated=await sql("SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;");
const migrations=[
  '20260916030000_scheduler_live_lease_and_event_replay.sql','20260916040000_scheduler_deferred_outcomes.sql',
  '20260917010000_platform_workspaces.sql','20260917020000_platform_scope_links.sql',
  '20260917030000_platform_property_scope_mutations.sql','20260917040000_platform_sprint_scope.sql',
  '20260918010000_platform_sprint_schedule_backlog_scope.sql','20260918020000_platform_json_runs_checkpoints.sql',
  '20260918030000_platform_scope_fencing.sql','20260918035000_platform_owner_planning_guard.sql',
  '20260918040000_platform_run_recovery.sql','20260918050000_platform_app_installs.sql',
];
for(const name of migrations){
  const version=name.split('_')[0];
  if(migrated.split('\n').includes(version)) continue;
  if(!process.argv.includes('--apply-local-migrations')) throw new Error(`Local migration missing: ${name}. Review and pass --apply-local-migrations.`);
  const migration=await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8');
  await sql(`BEGIN; ${migration}\nINSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES('${version}','${name}',ARRAY[]::TEXT[]); COMMIT;`);
  console.log(`Applied local migration: ${name}`);
}
await sql("NOTIFY pgrst,'reload schema';");
// Read only the two local test credentials needed; never log/persist them.
const envLines=JSON.parse(await command('docker',['inspect',`supabase_studio_${stack}`,'--format','{{json .Config.Env}}']));
const localValue=(name)=>envLines.find((line)=>line.startsWith(name+'='))?.slice(name.length+1);
const anon=localValue('SUPABASE_ANON_KEY'), service=localValue('SUPABASE_SERVICE_KEY');
assert(anon && service,'Local Studio keys are unavailable.');
const admin=createClient(api,service,{auth:{persistSession:false,autoRefreshToken:false}});
const enabled=await sql("SELECT enabled FROM workflow_event_contracts WHERE workflow_key='platform_run';");
const userIds=[], workspaceIds=[];
let server,browser;
try{
  await sql("UPDATE workflow_event_contracts SET enabled=true WHERE workflow_key='platform_run';");
  server=spawn(process.execPath,[fileURLToPath(new URL('../../../node_modules/next/dist/bin/next',import.meta.url)),'dev','--hostname','127.0.0.1','--port','3176'],{
    cwd:pulseRoot,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_ENV:'development',
      NEXT_PUBLIC_SUPABASE_URL:api,SUPABASE_URL:api,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:service,
      NEXT_PUBLIC_MOCK_MODE:'false',NEXT_PUBLIC_PULSE_MOCK_AUTH_ENABLED:'false',PULSE_ALLOW_PRODUCTION_MOCK_AUTH:'',
      E2E_OPERATOR_ACCESS:'false',NEXT_PUBLIC_E2E_MODE:'false',JAMIE_PUBLIC_GUIDE_E2E_FIXTURE:'false',
      OPENAI_API_KEY:'',GROQ_API_KEY:'',NEXT_PUBLIC_SITE_URL:origin,NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN:origin,
  }});
  // Drain logs without persisting secrets or account-bearing server output.
  for(const stream of [server.stdout,server.stderr]) stream.on('data',()=>{});
  server.on('error',()=>{});
  let ready=false;
  for(let i=0;i<90;i++){
    if(server.exitCode!==null) throw new Error('Local Next server exited before acceptance.');
    try{const response=await fetch(`${origin}/api/workspaces`,{signal:AbortSignal.timeout(2000)});if(response.status===401){ready=true;break;}}catch{}
    await delay(1000);
  }
  assert(ready,'Local unauthenticated workspace API did not return 401.');
  console.log('PASS: unauthenticated workspace API returns 401 on the local server');
  browser=await chromium.launch({headless:true});
  const artifacts=fileURLToPath(new URL('../.pulse-local/platform-auth-acceptance/',import.meta.url));
  await mkdir(artifacts,{recursive:true});
  async function login(){
    const email=`platform-${randomUUID()}@example.test`,password=`Test-${randomUUID()}!`;
    const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});
    assert(!error,`Local Auth account creation failed: ${error?.code}`);userIds.push(data.user.id);
    const context=await browser.newContext();
    const page=await context.newPage();
    const pageErrors=[];page.on('pageerror',(e)=>pageErrors.push(e.message));
    await page.goto(`${origin}/login?redirect=%2Fapi%2Fworkspaces`,{timeout:120000});
    await page.getByRole('heading',{name:'Sign In',exact:true}).waitFor();
    assert.equal(await page.locator('[data-nextjs-dialog]').count(),0);
    if(userIds.length===1) await page.screenshot({path:artifacts+'login.png'});
    await page.getByPlaceholder('Email Address').fill(email);
    await page.getByPlaceholder('Password',{exact:true}).fill(password);
    await page.getByRole('button',{name:'Sign In',exact:true}).click();
    await page.waitForURL(`${origin}/api/workspaces`,{timeout:60000});
    assert.equal(JSON.parse(await page.locator('body').innerText()).ok,true);
    assert(!(await context.cookies()).some((c)=>c.name==='pulse_mock_session'));
    assert.equal(pageErrors.length,0,`Browser errors: ${pageErrors.join('; ')}`);
    console.log('PASS: rendered login form and real Supabase password/cookie session (mock auth disabled)');
    return {page,context,userId:data.user.id,email,password};
  }
  const primary=await login();
  async function request(page,path,method='GET',body){
    return page.evaluate(async ({path,method,body})=>{
      const response=await fetch(path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
      return {status:response.status,data:await response.json()};
    },{path,method,body});
  }
  const created=await request(primary.page,'/api/workspaces','POST',{kind:'team',name:'Temporary real-auth acceptance'});
  assert.equal(created.status,201);const workspace=created.data.workspaceId;workspaceIds.push(workspace);
  const base=`/api/workspaces/${workspace}`;
  const graph={schemaVersion:1,key:'real-auth',version:1,entry:'question',nodes:[
    {id:'question',kind:'checkpoint',type:'question',prompt:'Which area?',responseSchema:{type:'string'},next:'done'},
    {id:'done',kind:'complete'},
  ]};
  const start=async()=>{
    const response=await request(primary.page,base+'/runs','POST',{requestKey:randomUUID(),definition:graph});
    assert.equal(response.status,200,`Start failed: ${response.data.error || response.status}`);return response.data.result;
  };
  async function tick(run,generation){
    // Lease only this fixture job. Do not claim/drain unrelated local work.
    const token=randomUUID();
    await sql(`UPDATE workflow_jobs SET status='running',lease_token='${token}',lease_until=clock_timestamp()+interval '1 minute'
      WHERE user_id='${primary.userId}' AND workflow_key='platform_run' AND payload->>'runId'='${run}' AND payload->>'generation'='${generation}' AND status='queued';
      SELECT run_status FROM platform_tick_run((SELECT id FROM workflow_jobs WHERE user_id='${primary.userId}' AND payload->>'runId'='${run}' AND payload->>'generation'='${generation}'),'${token}');`);
  }
  const run=await start();await tick(run.id,1);
  const inbox=await request(primary.page,base+'/checkpoints?limit=1');assert.equal(inbox.status,200);
  const checkpoint=inbox.data.result.items[0];assert.equal(checkpoint.run_id,run.id);
  const answered=await request(primary.page,base+'/checkpoints','POST',{checkpointId:checkpoint.id,expectedRevision:checkpoint.revision,submissionKey:randomUUID(),value:'Keller / Westlake'});
  assert.equal(answered.status,200);await tick(run.id,2);
  assert.equal(await sql(`SELECT status FROM platform_runs WHERE id='${run.id}';`),'completed');
  const pending=await start();await tick(pending.id,1);
  const cancelled=await request(primary.page,base+'/runs','PATCH',{runId:pending.id,expectedRevision:2});
  assert.equal(cancelled.status,200);assert.equal(cancelled.data.result.status,'cancelled');
  const first=await request(primary.page,base+'/runs?limit=1');assert(first.data.result.nextCursor);
  const second=await request(primary.page,base+'/runs?limit=1&cursor='+first.data.result.nextCursor);
  assert.notEqual(first.data.result.items[0].id,second.data.result.items[0].id);
  await primary.page.goto(origin+base+'/runs?limit=1');await primary.page.screenshot({path:artifacts+'runs.png'});
  const outsider=await login();
  assert.equal((await request(outsider.page,base+'/runs')).status,404);
  // Independently prove real JWT RLS, not just the server-side guard.
  const signed=createClient(api,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error:authError}=await signed.auth.signInWithPassword({email:outsider.email,password:outsider.password});assert(!authError);
  const {data:foreignRows,error:readError}=await signed.from('platform_runs').select('id').eq('workspace_id',workspace);
  assert(!readError);assert.deepEqual(foreignRows,[]);
  console.log('PASS: browser cookie APIs start → checkpoint → answer → complete, cancel, cursor pages and foreign-user denial; real JWT RLS denies foreign rows');
  console.log(`Browser evidence: ${artifacts}`);
}catch(error){
  // Server logs may contain account identifiers but no credentials are printed
  // by this runner. Keep failure output limited to the assertion boundary.
  console.error('Real-auth acceptance stopped:',error.message);process.exitCode=1;
}finally{
  await browser?.close();
  if(server && server.exitCode===null){
    if(process.platform==='win32') await command('taskkill',['/PID',String(server.pid),'/T','/F']);
    else server.kill();
    await delay(1000);
  }
  for(const workspace of workspaceIds){
    assert.match(workspace,/^[a-f0-9-]{36}$/);
    await sql(`BEGIN;
      DELETE FROM workflow_results WHERE job_id IN (SELECT id FROM workflow_jobs WHERE payload->>'workspaceId'='${workspace}');
      DELETE FROM workflow_jobs WHERE payload->>'workspaceId'='${workspace}';
      DELETE FROM platform_checkpoints WHERE workspace_id='${workspace}';
      DELETE FROM platform_runs WHERE workspace_id='${workspace}';
      DELETE FROM platform_app_installs WHERE workspace_id='${workspace}';
      DELETE FROM platform_workspaces WHERE id='${workspace}'; COMMIT;`);
  }
  for(const id of userIds){const {error}=await admin.auth.admin.deleteUser(id);if(error)throw new Error('Unable to remove temporary local Auth account.');}
  await sql(`UPDATE workflow_event_contracts SET enabled=${enabled==='t'?'true':'false'} WHERE workflow_key='platform_run';`);
  console.log('Removed temporary local accounts/workspace; restored admission flag. Applied local migrations are retained.');
}
