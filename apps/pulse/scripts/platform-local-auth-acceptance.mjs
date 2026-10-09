import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { homepageBrowserAcceptance } from './homepage-browser-acceptance.mjs';
import { createClient } from '@supabase/supabase-js';
import { command, pulseRoot } from './docker-acceptance.mjs';

// Explicit local-only acceptance. No .env reads, mock sessions, storageState,
// production host, broad DB reset, queue drain or persistent credentials.
function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}
const stack=option('--stack');
if (!stack || !/^[a-z0-9_-]+$/.test(stack)) throw new Error('Pass a local --stack ID.');
const apiUrl = new URL(option('--api-url', 'http://127.0.0.1:54321'));
const originUrl = new URL(option('--origin', 'http://127.0.0.1:3176'));
const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
if (!loopbackHosts.has(apiUrl.hostname) || !loopbackHosts.has(originUrl.hostname)
  || apiUrl.protocol !== 'http:' || originUrl.protocol !== 'http:') {
  throw new Error('Auth acceptance only supports HTTP loopback API and browser origins.');
}
const api=apiUrl.origin, origin=originUrl.origin;
const realtorOnly=process.argv.includes('--realtor-only');
const sellerVideoOnly=process.argv.includes('--seller-video-only');
const sellerBusinessOnly=process.argv.includes('--seller-business-only');
const sellerScheduleRecoveryOnly=process.argv.includes('--seller-schedule-recovery-only');
assert(!sellerScheduleRecoveryOnly || sellerBusinessOnly,'Scheduling recovery requires seller-business mode.');
const liveJamie=process.argv.includes('--live-jamie');
assert([realtorOnly,sellerVideoOnly,sellerBusinessOnly].filter(Boolean).length<=1,'Choose only one focused acceptance suite.');
assert(!liveJamie || (sellerBusinessOnly && process.env.GROQ_API_KEY),'Live Jamie acceptance requires seller-business mode and a configured provider key.');
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
  '20260918090000_platform_app_launch_admission.sql',
  '20260918090100_platform_scoped_sprint_replay_fix.sql','20260918090200_platform_scoped_property_replay_fix.sql',
  '20260922100000_platform_condition_nodes.sql','20260922110000_platform_capability_receipts.sql',
  '20260922120000_platform_capability_admission.sql','20260922130000_platform_connector_snapshots.sql',
  '20260922140000_platform_effect_receipt_transitions.sql','20260923100000_platform_connector_response_provenance.sql',
  '20260923110000_platform_connector_health.sql','20260923120000_platform_connector_health_scheduler.sql',
  '20260923130000_platform_connector_health_summary.sql','20260923140000_platform_connector_health_history_receipts.sql',
  '20260923150000_platform_connector_health_schedule_audit.sql','20260923160000_platform_quota_budget_settlement.sql',
  '20260923170000_platform_quota_overrun_fences.sql','20260923180000_platform_provider_adapter_reviews.sql',
  '20260923190000_platform_provider_quotas.sql','20260924100000_platform_quota_reconciliation_event.sql',
  '20260924110000_platform_provider_exception_read_model.sql','20260924120000_platform_exception_recovery_evidence.sql',
  '20260924130000_platform_unknown_effect_inbox.sql','20260924140000_platform_workspace_invitations.sql',
  '20260924150000_platform_retry_intent_idempotency_race.sql','20260924160000_platform_user_layouts.sql',
  '20260924170000_platform_workspace_member_email_cast.sql',
  '20260925100000_realtor_personal_workspace.sql',
  '20260925110000_realtor_reminder_worker.sql',
  '20260925120000_realtor_occurrence_materialization.sql',
  '20260925130000_realtor_planner_refill.sql',
  '20260925140000_realtor_financial_lifecycle.sql',
  '20260925150000_realtor_weekly_review_progress.sql',
  '20260925160000_realtor_progress_history.sql',
  '20260925170000_realtor_planner_property_scope.sql',
  '20260925180000_realtor_planner_sprint_task_identity.sql',
  '20260925190000_realtor_service_role_read_grants.sql',
  '20260925200000_realtor_digest_search_path.sql',
  '20260925210000_realtor_property_task_read_grants.sql',
  '20261005100000_seller_video_brief_store.sql',
  '20261005110000_platform_workspace_service_reads.sql',
  '20261005120000_seller_video_review_checkpoint.sql',
  '20261006130000_platform_connector_health_job_read_model.sql',
  '20261006140000_platform_connector_health_audit_read_model.sql',
  '20261006150000_seller_video_publication_records.sql',
  '20261007120000_seller_video_publication_outcomes.sql',
  '20261007140000_seller_lead_publication_attributions.sql',
  '20261007150000_realtor_seller_campaign_tasks.sql',
  '20261007160000_seller_outcome_scoreboard.sql',
  '20261007170000_realtor_weekly_business_review_v2.sql',
  '20261007180000_seller_outcome_read_models.sql',
  '20261008100000_seller_nonretryable_conflicts.sql',
  '20261008110000_seller_planner_link_read.sql',
  '20261008120000_realtor_reminder_nonretryable_conflicts.sql',
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
if (sellerBusinessOnly) {
  for (const name of [
    'seller_lead_actions.sql',
    'seller_planner_link_read.sql',
    'realtor_reminder_lifecycle.sql',
    'seller_outcome_read_models.sql',
    'realtor_planner_task_identity.sql',
    'realtor_seller_campaign_tasks.sql',
    'seller_outcome_scoreboard.sql',
    'realtor_weekly_review_v2.sql',
  ]) {
    const testSql = await readFile(new URL(`../supabase/tests/database/${name}`, import.meta.url), 'utf8');
    const output = await sql(`SET search_path = public, extensions;\n${testSql}`);
    assert(!/^not ok\b/m.test(output), `${name} reported a failed pgTAP assertion`);
    assert.match(output, /\b1\.\.\d+\b/, `${name} did not emit a pgTAP plan`);
    console.log(`PASS: ${name} database assertions`);
  }
}
if (sellerBusinessOnly && process.argv.includes('--database-only')) {
  console.log('PASS: disposable seller-business database regression packet completed.');
  process.exit(0);
}
// Read only the two local test credentials needed; never log/persist them.
const envLines=JSON.parse(await command('docker',['inspect',`supabase_studio_${stack}`,'--format','{{json .Config.Env}}']));
const localValue=(name)=>envLines.find((line)=>line.startsWith(name+'='))?.slice(name.length+1);
const anon=localValue('SUPABASE_ANON_KEY'), service=localValue('SUPABASE_SERVICE_KEY');
assert(anon && service,'Local Studio keys are unavailable.');
const admin=createClient(api,service,{auth:{persistSession:false,autoRefreshToken:false}});
const {error:realtorSchemaError}=await admin.from('realtor_preferences').select('user_id').limit(1);
assert.equal(realtorSchemaError,null,
  `Disposable Supabase REST schema probe failed: ${realtorSchemaError?.code || 'unknown'} ${realtorSchemaError?.message || ''}`);
for (const [table, columns] of [
  ['platform_memberships', 'workspace_id,user_id,role,status,created_at'],
  ['platform_workspaces', 'id,kind,name,status,revision'],
  ['seller_video_briefs', 'workspace_id,brief_id,revision,brief_data,created_at'],
]) {
  const {error}=await admin.from(table).select(columns).limit(1);
  assert.equal(error,null,`Disposable ${table} REST schema probe failed: ${error?.code || 'unknown'} ${error?.message || ''}`);
}
for (const [table, columns] of [
  ['property_shortlist_entries', 'id,owner_id,area_key,status,revision'],
  ['sprint_backlog_items', 'id,owner_id,title,source_type,property_id,property_task_kind,input_revision'],
  ['realtor_planner_items', 'source_sprint_task_id'],
]) {
  const {error}=await admin.from(table).select(columns).limit(1);
  assert.equal(error,null,`Disposable ${table} REST schema probe failed: ${error?.code || 'unknown'} ${error?.message || ''}`);
}
const enabled=await sql("SELECT enabled FROM workflow_event_contracts WHERE workflow_key='platform_run';");
const userIds=[], workspaceIds=[], sellerFixtureAgents=[];
let server,browser;
const plannerServerSignals=[];
const acceptanceMongo = process.env.PULSE_TEST_MONGO_URI || '';
if (acceptanceMongo) assert.match(acceptanceMongo, /^mongodb:\/\/127\.0\.0\.1:\d+\/pulse_homepage_acceptance$/);
try{
  await sql("UPDATE workflow_event_contracts SET enabled=true WHERE workflow_key='platform_run';");
  server=spawn(process.execPath,[fileURLToPath(new URL('../../../node_modules/next/dist/bin/next',import.meta.url)),'dev','--hostname','127.0.0.1','--port',String(originUrl.port || 80)],{
    cwd:pulseRoot,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_ENV:'development',
      NEXT_PUBLIC_SUPABASE_URL:api,SUPABASE_URL:api,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:service,
      NEXT_PUBLIC_MOCK_MODE:'false',NEXT_PUBLIC_PULSE_MOCK_AUTH_ENABLED:'false',PULSE_ALLOW_PRODUCTION_MOCK_AUTH:'',
      E2E_OPERATOR_ACCESS:'false',NEXT_PUBLIC_E2E_MODE:'false',JAMIE_PUBLIC_GUIDE_E2E_FIXTURE:'false',
      OPENAI_API_KEY:'',GROQ_API_KEY:liveJamie?process.env.GROQ_API_KEY:'',NEXT_PUBLIC_SITE_URL:origin,NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN:origin,
      // Homepage reads legacy listing/config stores; only the disposable runner
      // may supply its Mongo URI. Never inherit a hosted connection.
      MONGODB_URI:acceptanceMongo || 'mongodb://127.0.0.1:1/pulse_auth_unavailable',
  }});
  // Drain logs without persisting secrets or account-bearing server output.
  for(const stream of [server.stdout,server.stderr]) stream.on('data',(chunk)=>{
    // Only retain route compilation/timing signals, never arbitrary server logs.
    const signal=chunk.toString().match(/(?:Compiling|Compiled|POST|GET) \/api\/realtor\/planner(?:[^\r\n]*)/g);
    if(signal) plannerServerSignals.push(...signal.map((line)=>line.slice(0,160)));
  });
  server.on('error',()=>{});
  let ready=false;
  for(let i=0;i<90;i++){
    if(server.exitCode!==null) throw new Error('Local Next server exited before acceptance.');
    try{const response=await fetch(`${origin}/api/workspaces`,{signal:AbortSignal.timeout(2000)});if(response.status===401){ready=true;break;}}catch{}
    await delay(1000);
  }
  assert(ready,'Local unauthenticated workspace API did not return 401.');
  const realtorUnauthenticated = await fetch(`${origin}/api/realtor/preferences`);
  assert.equal(realtorUnauthenticated.status,401,'personal realtor APIs reject anonymous requests');
  console.log('PASS: unauthenticated realtor preferences API returns 401 on the local server');
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
    const loginTarget=sellerVideoOnly||sellerBusinessOnly||realtorOnly?'/api/realtor/preferences':'/api/workspaces';
    await page.goto(`${origin}/login?redirect=${encodeURIComponent(loginTarget)}`,{timeout:120000});
    await page.getByRole('heading',{name:'Sign In',exact:true}).waitFor();
    assert.equal(await page.locator('[data-nextjs-dialog]').count(),0);
    if(userIds.length===1) await page.screenshot({path:artifacts+'login.png'});
    await page.getByPlaceholder('Email Address').fill(email);
    await page.getByPlaceholder('Password',{exact:true}).fill(password);
    await page.getByRole('button',{name:'Sign In',exact:true}).click();
    await page.waitForURL(`${origin}${loginTarget}`,{timeout:60000});
    const authenticatedApiResult = JSON.parse(await page.locator('body').innerText());
    assert.equal(authenticatedApiResult.ok,true,
      `Signed-in API did not accept the browser session: ${authenticatedApiResult.error || 'unknown response'}`);
    assert(!(await context.cookies()).some((c)=>c.name==='pulse_mock_session'));
    assert.equal(pageErrors.length,0,`Browser errors: ${pageErrors.join('; ')}`);
    console.log('PASS: rendered login form and real Supabase password/cookie session (mock auth disabled)');
    return {page,context,userId:data.user.id,email,password,pageErrors};
  }
  const primary=await login();
  async function request(page,path,method='GET',body){
    return page.evaluate(async ({path,method,body})=>{
      const response=await fetch(path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
      return {status:response.status,data:await response.json()};
    },{path,method,body});
  }
  if (sellerBusinessOnly) {
    const timeZone='America/Chicago';
    const localDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
    const addDays=(date,days)=>{const [year,month,day]=date.split('-').map(Number);return new Date(Date.UTC(year,month-1,day+days)).toISOString().slice(0,10);};
    const startAt=new Date(Date.now()+24*60*60*1000);
    startAt.setSeconds(0,0);
    const localParts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(startAt);
    const part=(type)=>localParts.find((candidate)=>candidate.type===type)?.value||'';
    const appointmentDate=`${part('year')}-${part('month')}-${part('day')}`;
    const appointmentTime=`${part('hour')}:${part('minute')}`;
    const utcOffsetMinutes=Math.round((Date.UTC(Number(part('year')),Number(part('month'))-1,Number(part('day')),Number(part('hour')),Number(part('minute')))-startAt.getTime())/60_000);
    const today=localDate();
    const setup=await request(primary.page,'/api/realtor/preferences','POST',{
      timeZone,remindersEnabled:true,gamificationEnabled:true,celebrationsEnabled:false,hideAmountsOnToday:false,
      recordsStartDate:today,expectedRevision:null,requestKey:randomUUID(),
    });
    assert.equal(setup.status,200,`Seller workspace setup failed: ${setup.data.error||setup.status}`);
    const workspace=setup.data.result.workspace_id;
    workspaceIds.push(workspace);
    const plannerCountBefore=Number(await sql(`SELECT count(*) FROM public.realtor_planner_items WHERE workspace_id='${workspace}';`));
    const personalChat=await request(primary.page,'/api/chat','POST',{
      context:'personal_realtor',
      messages:[{role:'user',content:'Hi Jamie. In one sentence, explain what you can help with in my private business workspace. Do not change or save anything.'}],
    });
    assert.equal(personalChat.status,200,`Authenticated personal Jamie request failed: ${personalChat.data.error||personalChat.status}`);
    assert.equal(personalChat.data.role,'assistant');
    assert.equal(personalChat.data.personal?.context,'personal_realtor');
    assert(Array.isArray(personalChat.data.personal?.proposals),'Personal Jamie returns validated proposal cards.');
    assert.equal(personalChat.data.personal?.links?.today,'/today');
    if(liveJamie) assert(!/provider is not configured|could not reach its model|ran out of time|unavailable/i.test(personalChat.data.content),
      `Provider-backed personal Jamie should produce a model response: ${personalChat.data.content}`);
    else {
      assert.deepEqual(personalChat.data.personal?.proposals,[],'A missing provider returns no unprepared proposal cards.');
      assert.match(personalChat.data.content,/provider is not configured/i);
    }
    const plannerCountAfter=Number(await sql(`SELECT count(*) FROM public.realtor_planner_items WHERE workspace_id='${workspace}';`));
    assert.equal(plannerCountAfter,plannerCountBefore,'A personal Jamie chat must not write planner items before explicit confirmation.');
    console.log(`PASS: signed-in personal Jamie ${liveJamie?'provider-backed':'provider-disabled'} chat returns its private response schema without a planner write.`);
    const agentId=`seller-acceptance-${randomUUID()}`;
    const leadId=randomUUID();
    const subdomain=`seller-${randomUUID().replaceAll('-','').slice(0,12)}`;
    await sql(`
      INSERT INTO public.site_config(id,agent_id,owner_id,subdomain,status)
        VALUES('${randomUUID()}','${agentId}','${primary.userId}','${subdomain}','active');
      INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata)
        VALUES('${leadId}','${agentId}','${subdomain}','seller_plan','Synthetic Seller','synthetic@example.test','Fixture request',
          jsonb_build_object('sellerPlan',jsonb_build_object('requestKind','seller_plan','timing','one-to-three-months',
            'requestedContact',jsonb_build_object('granted',true,'capturedAt',now())),
            'campaign',jsonb_build_object('campaign','auth-acceptance')));
    `);
    sellerFixtureAgents.push(agentId);
    if (!sellerScheduleRecoveryOnly) {
    const dailyRecoveryLead=randomUUID();
    await sql(`INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata)
      VALUES('${dailyRecoveryLead}','${agentId}','${subdomain}','seller_plan','Synthetic Daily Recovery Seller','daily@example.test','Today recovery fixture',
        jsonb_build_object('sellerPlan',jsonb_build_object('requestedContact',jsonb_build_object('granted',true,'capturedAt',now()))));`);
    const dailyReadUrl=`${origin}/api/realtor/today`;
    let dailyReads=0;
    await primary.page.route(dailyReadUrl,async (route)=>{
      dailyReads++;
      if(dailyReads===2)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false})});
      const response=await route.fetch();
      const payload=await response.json();
      if(dailyReads===1)payload.result.seller={status:'available',value:{status:'available',counts:{newRequests:'invalid'}}};
      await route.fulfill({response,json:payload});
    });
    await primary.page.goto(`${origin}/today`);
    await primary.page.getByRole('button',{name:'Retry seller activity',exact:true}).waitFor();
    assert.equal(await primary.page.getByText('No seller requests need an initial response.',{exact:true}).count(),0);
    await primary.page.getByRole('button',{name:'Retry seller activity',exact:true}).click();
    await primary.page.getByText('Seller activity could not be reloaded. Try again.',{exact:true}).waitFor();
    await primary.page.getByRole('heading',{name:'Business progress',exact:true}).waitFor();
    await primary.page.getByRole('button',{name:'Retry seller activity',exact:true}).click();
    const dailyCard=primary.page.getByText('Synthetic Daily Recovery Seller',{exact:true}).locator('..').locator('..');
    await dailyCard.getByRole('button',{name:'Schedule response',exact:true}).waitFor();
    await primary.page.unroute(dailyReadUrl);
    await dailyCard.getByRole('button',{name:'Schedule response',exact:true}).click();
    const dailyDialog=primary.page.getByRole('dialog',{name:'Schedule seller response'});
    await dailyDialog.getByLabel('Date',{exact:true}).fill(appointmentDate);
    await dailyDialog.getByLabel('Time',{exact:true}).fill('10:15');
    await primary.page.route(dailyReadUrl,(route)=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false})}));
    await dailyDialog.getByRole('button',{name:'Schedule response',exact:true}).click();
    await dailyDialog.waitFor({state:'hidden'});
    await primary.page.getByText('Seller activity could not be reloaded. Try again.',{exact:true}).waitFor();
    await primary.page.unroute(dailyReadUrl);
    await primary.page.getByText('Schedule changed. Refresh to see the latest tasks and reminders.',{exact:true}).waitFor();
    await primary.page.getByRole('button',{name:'Refresh schedule',exact:true}).waitFor();
    await primary.page.getByRole('button',{name:'Retry seller activity',exact:true}).click();
    await primary.page.getByRole('heading',{name:'Unscheduled requests',exact:true}).waitFor();
    assert.equal(await primary.page.getByText('Synthetic Daily Recovery Seller',{exact:true}).count(),0,
      'a successful owner reread removes the scheduled request from the unscheduled seller panel');
    await primary.page.getByText('Respond to seller request — Synthetic Daily Recovery Seller',{exact:true}).waitFor();
    assert.equal(await primary.page.getByText('Schedule changed. Refresh to see the latest tasks and reminders.',{exact:true}).count(),0);
    assert.equal(await sql(`SELECT count(*) FROM public.realtor_planner_items WHERE source_lead_id='${dailyRecoveryLead}';`),'1');
    assert.equal(await sql(`SELECT count(*) FROM public.realtor_reminders reminder JOIN public.realtor_planner_occurrences occurrence ON occurrence.id=reminder.occurrence_id
      JOIN public.realtor_planner_items item ON item.id=occurrence.item_id WHERE item.source_lead_id='${dailyRecoveryLead}';`),'1');
    const dailyOccurrenceId=await sql(`SELECT occurrence.id FROM public.realtor_planner_occurrences occurrence
      JOIN public.realtor_planner_items item ON item.id=occurrence.item_id WHERE item.source_lead_id='${dailyRecoveryLead}';`);
    const dailyTaskCard=primary.page.locator(`[data-planner-occurrence-id="${dailyOccurrenceId}"]`);
    await dailyTaskCard.getByText(`follow up · ${appointmentDate} · 10:15 (${timeZone})`,{exact:true}).waitFor();
    for (const width of [390,768,1440]) {
      await primary.page.setViewportSize({width,height:900});
      await dailyTaskCard.getByRole('link',{name:'Open planner task',exact:true}).waitFor();
      await dailyTaskCard.getByRole('link',{name:'Open seller request',exact:true}).waitFor();
      assert(await primary.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),
        'Today task links and their local time fit the viewport');
    }
    assert.equal(await dailyTaskCard.getByRole('link',{name:'Open planner task',exact:true}).getAttribute('href'),`/planner?date=${appointmentDate}`);
    assert.equal(await dailyTaskCard.getByRole('link',{name:'Open seller request',exact:true}).getAttribute('href'),`/seller-inbox?leadId=${dailyRecoveryLead}`);
    await dailyTaskCard.getByRole('link',{name:'Open planner task',exact:true}).click();
    await primary.page.getByText(`Showing schedule for ${appointmentDate}.`,{exact:false}).waitFor();
    const dailyPlannerCard=primary.page.locator(`[data-planner-occurrence-id="${dailyOccurrenceId}"]`);
    await dailyPlannerCard.getByRole('link',{name:'Open seller request',exact:true}).click();
    await primary.page.getByRole('heading',{name:'Synthetic Daily Recovery Seller',exact:true}).waitFor();
    await primary.page.goto(`${origin}/today`);
    await dailyTaskCard.getByRole('link',{name:'Open seller request',exact:true}).click();
    await primary.page.getByRole('heading',{name:'Synthetic Daily Recovery Seller',exact:true}).waitFor();
    await sql(`UPDATE public.site_config SET owner_id=NULL WHERE agent_id='${agentId}' AND owner_id='${primary.userId}';`);
    try {
      await primary.page.goto(`${origin}/today`);
      await dailyTaskCard.getByRole('link',{name:'Open planner task',exact:true}).waitFor();
      assert.equal(await dailyTaskCard.getByRole('link',{name:'Open seller request',exact:true}).count(),0,
        'fresh Today data removes the seller request handoff after ownership is lost');
      const lostOwnerToday=await request(primary.page,'/api/realtor/today');
      assert.equal(lostOwnerToday.status,200);
      const lostOwnerTask=lostOwnerToday.data.result.agenda.value.upcoming.find((item)=>item.id===dailyOccurrenceId);
      assert(lostOwnerTask,'the private planner task remains available to its owner');
      assert.equal(lostOwnerTask.seller_source_available,false);
      assert.equal(lostOwnerTask.seller_lead,null,'the server does not attach a stale seller source');
      await dailyTaskCard.getByRole('link',{name:'Open planner task',exact:true}).click();
      await dailyPlannerCard.getByText('Respond to seller request — Synthetic Daily Recovery Seller',{exact:true}).waitFor();
      assert.equal(await dailyPlannerCard.getByRole('link',{name:'Open seller request',exact:true}).count(),0);
      const lostOwnerLead=await request(primary.page,`/api/realtor/leads?leadId=${dailyRecoveryLead}`);
      assert.equal(lostOwnerLead.status,200);
      assert.equal(lostOwnerLead.data.result.leads.length,0,'a direct seller read rechecks current ownership');
    } finally {
      await sql(`UPDATE public.site_config SET owner_id='${primary.userId}' WHERE agent_id='${agentId}' AND owner_id IS NULL;`);
    }
    assert.equal(await sql(`SELECT revision FROM public.agent_site_leads WHERE id='${dailyRecoveryLead}';`),'1');
    assert.equal(await sql(`SELECT count(*) FROM public.seller_lead_events WHERE lead_id='${dailyRecoveryLead}';`),'0',
      'following task/request links records no seller contact or outcome');
    console.log('PASS: responsive Today task links open the due-date planner and current-owner seller request; fresh ownership loss removes both request handoffs without a write.');
    await sql(`DELETE FROM public.workflow_jobs WHERE user_id='${primary.userId}' AND workflow_key='realtor_reminder'
      AND payload->>'reminderId' IN (SELECT reminder.id::text FROM public.realtor_reminders reminder JOIN public.realtor_planner_occurrences occurrence ON occurrence.id=reminder.occurrence_id
        JOIN public.realtor_planner_items item ON item.id=occurrence.item_id WHERE item.source_lead_id='${dailyRecoveryLead}');
      DELETE FROM public.realtor_planner_items WHERE user_id='${primary.userId}' AND source_lead_id='${dailyRecoveryLead}';
      DELETE FROM public.agent_site_leads WHERE id='${dailyRecoveryLead}' AND agent_id='${agentId}';`);
    console.log('PASS: Today seller recovery preserves other panels; a saved response appears in Coming up with one reminder through the existing planner scheduler.');
    const anonymousLeads=await request(primary.page,`/api/realtor/leads?limit=10`);
    assert.equal(anonymousLeads.status,200);
    assert(anonymousLeads.data.result.leads.some((lead)=>lead.id===leadId));
    assert.equal(JSON.stringify(anonymousLeads.data.result.leads.find((lead)=>lead.id===leadId)).includes('synthetic@example.test'),true,
      'the authenticated site owner receives permissioned contact details for seller follow-up');
    await primary.page.goto(`${origin}/seller-inbox?leadId=${leadId}`);
    await primary.page.getByRole('heading',{name:'Synthetic Seller',exact:true}).waitFor();
    for (const width of [390,768,1440]) {
      await primary.page.setViewportSize({width,height:900});
      await primary.page.getByRole('button',{name:'Schedule response',exact:true}).click();
      const dialog=primary.page.getByRole('dialog',{name:'Schedule seller response'});
      await dialog.waitFor();
      const bounds=await dialog.boundingBox();
      assert(bounds && bounds.x>=0 && bounds.x+bounds.width<=width,'personal inbox scheduler fits the viewport');
      await primary.page.keyboard.press('Escape');
      assert(await primary.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),
        'the authenticated personal seller inbox has no horizontal overflow');
    }
    assert.equal(await sql(`SELECT revision FROM public.agent_site_leads WHERE id='${leadId}';`),'1',
      'browsing the personal inbox and opening scheduling drafts performs no lead write');
    console.log('PASS: a real non-operator owner opens the personal seller inbox and scheduling drafts at phone/tablet/desktop widths.');
    const overdueDate=`${Number(today.slice(0,4))-1}-12-31`;
    const overdueTask=await request(primary.page,'/api/realtor/planner','POST',{
      itemId:null,expectedRevision:null,item:{kind:'follow_up',title:'Synthetic overdue seller response',notes:'',
        due:{anchorDate:overdueDate,localTime:'09:00',timeZone,recurrence:{frequency:'once'},endsOn:overdueDate,
          reminderOffsetsDays:[0,1,2]},expectedAmountCents:null,property:null,sourceSprintTaskId:null,
        sellerLead:{leadId,actionKey:'initial-response:v1',expectedLeadRevision:1},requestKey:randomUUID()},
    });
    assert.equal(overdueTask.status,200,`Past-year seller action setup failed: ${overdueTask.data.error||overdueTask.status}`);
    const overdueOccurrenceId=await sql(`SELECT id FROM public.realtor_planner_occurrences WHERE item_id='${overdueTask.data.result.item_id}';`);
    const reminderJobIds=JSON.parse(await sql(`SELECT jsonb_agg(id ORDER BY id) FROM public.workflow_jobs
      WHERE user_id='${primary.userId}' AND workflow_key='realtor_reminder' AND payload->>'occurrenceId'='${overdueOccurrenceId}';`));
    assert.equal(reminderJobIds.length,3,'opt-in planner reminders enqueue through the existing event trigger');
    assert.equal(await sql(`SELECT count(*) FROM public.workflow_jobs WHERE status='queued' AND scheduled_for<=now();`),'3',
      'only these three synthetic reminder jobs are due before the bounded worker claim');
    const claimedReminders=JSON.parse(await sql(`SET request.jwt.claim.role='service_role';
      SELECT jsonb_agg(jsonb_build_object('id',id,'lease',lease_token) ORDER BY id) FROM public.claim_workflow_jobs(3,300);`));
    assert.deepEqual(claimedReminders.map((job)=>job.id),reminderJobIds,'the existing scheduler claims exactly the synthetic jobs');
    for (const job of claimedReminders) {
      assert.equal(await sql(`SET request.jwt.claim.role='service_role';
        SELECT committed AND result_status='visible' FROM public.realtor_commit_reminder_job('${job.id}','${job.lease}');`),'t',
        'the existing lease-fenced reminder handler delivers the reminder');
    }
    await primary.page.goto(`${origin}/today`);
    await primary.page.locator('[data-reminder-id]').first().waitFor();
    const reminderTask=primary.page.getByRole('link',{name:'Open reminder task',exact:true}).first();
    assert.equal(await reminderTask.getAttribute('href'),`/planner?date=${overdueDate}`);
    await reminderTask.click();
    await primary.page.getByText(`Showing schedule for ${overdueDate}.`,{exact:false}).waitFor();
    await primary.page.getByText('Synthetic overdue seller response',{exact:true}).waitFor();
    await primary.page.goto(`${origin}/today`);
    await primary.page.locator('[data-reminder-id]').first().waitFor();
    const reminderUrl=`${origin}/api/realtor/reminders`;
    const staleReminderCard=primary.page.locator('[data-reminder-id]').first();
    const staleReminderId=await staleReminderCard.getAttribute('data-reminder-id');
    const visibleReminders=await request(primary.page,'/api/realtor/reminders?limit=5');
    assert.equal(visibleReminders.status,200);
    const staleReminder=visibleReminders.data.result.find((reminder)=>reminder.id===staleReminderId);
    assert(staleReminder,'the real owner can read the reminder before a concurrent change');
    const concurrentDismiss=await request(primary.page,'/api/realtor/reminders','PATCH',{
      reminderId:staleReminderId,action:'dismiss',expectedRevision:staleReminder.revision,requestKey:randomUUID(),
    });
    assert.equal(concurrentDismiss.status,200);
    const staleReminderResponse=primary.page.waitForResponse((response)=>response.url()===reminderUrl && response.request().method()==='PATCH');
    await staleReminderCard.getByRole('button',{name:'Dismiss reminder',exact:true}).click();
    const staleResponse=await staleReminderResponse;
    assert.equal(staleResponse.status(),409,'a real stale reminder returns 409 without serialization retries');
    await staleReminderCard.getByText('This reminder changed. Refresh reminders before making another change.',{exact:true}).waitFor();
    assert.equal(await staleReminderCard.getByRole('button',{name:'Dismiss reminder',exact:true}).isEnabled(),false);
    assert.equal(await staleReminderCard.getByRole('button',{name:'Snooze 24 hours',exact:true}).isEnabled(),false);
    const todayReadUrl=`${origin}/api/realtor/today`;
    await primary.page.route(todayReadUrl,(route)=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false})}));
    await staleReminderCard.getByRole('button',{name:'Refresh reminders',exact:true}).click();
    await staleReminderCard.getByText('Reminders could not be refreshed. Try again.',{exact:true}).waitFor();
    assert.equal(await staleReminderCard.getByRole('button',{name:'Dismiss reminder',exact:true}).isEnabled(),false);
    await primary.page.unroute(todayReadUrl);
    await staleReminderCard.getByRole('button',{name:'Refresh reminders',exact:true}).click();
    await primary.page.locator(`[data-reminder-id="${staleReminderId}"]`).waitFor({state:'hidden'});
    assert.equal(await sql(`SELECT count(*) FROM public.realtor_mutation_receipts WHERE resource_id='${staleReminderId}' AND operation='reminder';`),'1',
      'the stale browser attempt creates no second reminder receipt');
    console.log('PASS: a real stale reminder returns 409, pauses both actions through a failed read, and disappears after a fresh owner read.');
    for (const action of ['snooze','dismiss']) {
      const bodies=[];
      let savedRevision;
      await primary.page.route(reminderUrl,async (route)=>{
        if(route.request().method()!=='PATCH')return route.continue();
        bodies.push(route.request().postData());
        const response=await route.fetch();
        assert.equal(response.status(),200,'the real reminder action commits before its response is withheld');
        const payload=await response.json();
        if (bodies.length===1) {
          savedRevision=payload.result.revision;
          await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'Synthetic reminder response unavailable.'})});
        } else {
          assert.equal(payload.result.reused,true,'the same reminder request replays its saved receipt');
          assert.equal(payload.result.revision,savedRevision,'the retry does not advance the reminder revision');
          await route.fulfill({response});
        }
      });
      const card=primary.page.locator('[data-reminder-id]').first();
      const reminderId=await card.getAttribute('data-reminder-id');
      const actionLabel=action==='snooze'?'Snooze 24 hours':'Dismiss reminder';
      await card.getByRole('button',{name:actionLabel,exact:true}).click();
      await card.getByText('The reminder change could not be confirmed. Retry the same action or refresh reminders before choosing another action.',{exact:true}).waitFor();
      assert.equal(await card.getByRole('button',{name:action==='snooze'?'Dismiss reminder':'Snooze 24 hours',exact:true}).isEnabled(),false);
      await card.getByRole('button',{name:actionLabel,exact:true}).click();
      await primary.page.getByText(action==='snooze'?'Reminder snoozed for 24 hours.':'Reminder dismissed.',{exact:true}).waitFor();
      await primary.page.locator(`[data-reminder-id="${reminderId}"]`).waitFor({state:'hidden'});
      await primary.page.unroute(reminderUrl);
      assert.equal(bodies.length,2);
      assert.equal(bodies[0],bodies[1],'the reminder retry preserves its entire original payload, including the snooze deadline');
      assert.equal(await sql(`SELECT count(*) FROM public.realtor_mutation_receipts WHERE resource_id='${reminderId}' AND operation='reminder';`),'1');
      assert.equal(await sql(`SELECT count(*) FROM public.platform_audit_events WHERE resource_id='${reminderId}' AND action='realtor.reminder.${action}';`),'1');
      if(action==='snooze') {
        const body=JSON.parse(bodies[0]);
        assert.equal(await sql(`SELECT scheduled_at= '${body.until}'::timestamptz AND snoozed_until=scheduled_at AND status='scheduled'
          FROM public.realtor_reminders WHERE id='${reminderId}';`),'t');
        assert.equal(await sql(`SELECT count(*) FROM public.workflow_jobs WHERE workflow_key='realtor_reminder'
          AND payload->>'reminderId'='${reminderId}' AND (payload->>'reminderRevision')::integer=${savedRevision} AND status='queued';`),'1',
          'snooze creates one future event job through the existing durable reminder trigger');
      }
    }
    assert.equal(await sql(`SELECT count(*) FROM public.seller_lead_events WHERE lead_id='${leadId}';`),'0');
    console.log('PASS: lease-fenced scheduler delivery opens a past-year task; lost snooze/dismiss responses replay once, and snooze queues one durable reminder job.');
    await primary.page.goto(`${origin}/today`);
    const scheduledAction=primary.page.getByRole('link',{name:'Open scheduled action →',exact:true});
    await scheduledAction.waitFor();
    assert.equal(await scheduledAction.getAttribute('href'),`/planner?date=${overdueDate}`);
    await scheduledAction.click();
    await primary.page.getByText(`Showing schedule for ${overdueDate}.`,{exact:false}).waitFor();
    const overdueRow=primary.page.getByText('Synthetic overdue seller response',{exact:true}).locator('..').locator('..');
    const completionUrl=`${origin}/api/realtor/planner/${overdueOccurrenceId}`;
    const completionBodies=[];
    let firstCompletionRevision;
    await primary.page.route(completionUrl,async (route)=>{
      completionBodies.push(route.request().postData());
      const response=await route.fetch();
      assert.equal(response.status(),200,'real completion succeeds before its response is withheld');
      const payload=await response.json();
      if (completionBodies.length===1) {
        firstCompletionRevision=payload.result.revision;
        await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'Synthetic committed response unavailable.'})});
      } else {
        assert.equal(payload.result.reused,true,'retry replays the existing completion receipt');
        assert.equal(payload.result.revision,firstCompletionRevision,'retry does not advance the saved occurrence revision');
        await route.fulfill({response});
      }
    });
    await overdueRow.getByRole('button',{name:'Mark complete',exact:true}).click();
    await primary.page.getByText('Synthetic committed response unavailable.',{exact:true}).waitFor();
    assert.equal(await sql(`SELECT status FROM public.realtor_planner_occurrences WHERE id='${overdueOccurrenceId}';`),'completed');
    await overdueRow.getByRole('button',{name:'Mark complete',exact:true}).click();
    await primary.page.getByText('Marked complete.',{exact:true}).waitFor();
    await primary.page.unroute(completionUrl);
    assert.equal(completionBodies.length,2);
    assert.equal(completionBodies[0],completionBodies[1],'the browser retry preserves the exact completion payload');
    assert.equal(await sql(`SELECT count(*) FROM public.realtor_mutation_receipts WHERE resource_id='${overdueOccurrenceId}' AND operation='occurrence_action';`),'1');
    assert.equal(await sql(`SELECT status FROM public.realtor_planner_occurrences WHERE item_id='${overdueTask.data.result.item_id}';`),'completed',
      'the due-date planner completion is persisted for the past-year occurrence');
    assert.equal(await sql(`SELECT count(*) FROM public.seller_lead_events WHERE lead_id='${leadId}';`),'0',
      'completing a planner action does not manufacture seller contact or reply evidence');
    assert.equal(await sql(`SELECT revision FROM public.agent_site_leads WHERE id='${leadId}';`),'1');
    console.log('PASS: Today opens a past-year seller action on its due date; real-owner completion persists without manufacturing seller receipts.');
    console.log('PASS: a completion response lost after commit retries the same browser request and replays one receipt without another revision.');
    await primary.page.goto(`${origin}/seller-inbox?leadId=${leadId}`);
    await primary.page.getByRole('heading',{name:'Synthetic Seller',exact:true}).waitFor();
    await primary.page.getByRole('button',{name:'Schedule response',exact:true}).click();
    const completedScheduleDialog=primary.page.getByRole('dialog',{name:'Schedule seller response'});
    const completedScheduleLink=completedScheduleDialog.getByRole('link',{name:'Open saved planner task',exact:true});
    await completedScheduleLink.waitFor();
    assert.equal(await completedScheduleLink.getAttribute('href'),`/planner?date=${overdueDate}`);
    await completedScheduleDialog.getByText(`completed · ${overdueDate}`,{exact:false}).waitFor();
    assert.equal(await completedScheduleDialog.getByRole('button',{name:'Schedule response',exact:true}).count(),0,
      'the completed source opens its existing task instead of another create action');
    await completedScheduleLink.click();
    await primary.page.getByText('Synthetic overdue seller response',{exact:true}).waitFor();
    await primary.page.goto(`${origin}/seller-inbox?leadId=${leadId}`);
    await primary.page.getByRole('heading',{name:'Synthetic Seller',exact:true}).waitFor();
    await primary.page.getByText('Record an earlier contact or reply',{exact:true}).click();
    async function enterReceiptTime(instant) {
      const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant);
      const value=(type)=>parts.find((candidate)=>candidate.type===type)?.value||'';
      await primary.page.getByLabel(`Contact or reply time (${timeZone})`,{exact:true}).fill(`${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`);
      const repeated=primary.page.getByLabel('Occurrence of the repeated hour',{exact:true});
      if (await repeated.count()) {
        const offset=(Date.UTC(Number(value('year')),Number(value('month'))-1,Number(value('day')),Number(value('hour')),Number(value('minute')))-instant.getTime())/60_000;
        await repeated.selectOption(offset===-300?'earlier':'later');
      }
    }
    const contactAt=new Date(Date.now()-2*60_000);contactAt.setSeconds(0,0);
    await enterReceiptTime(contactAt);
    const contactResponse=primary.page.waitForResponse((response)=>response.url()===`${origin}/api/realtor/leads` && response.request().method()==='POST');
    await primary.page.getByRole('button',{name:'Record email contact',exact:true}).click();
    const savedContactResponse=await contactResponse;
    const contact={status:savedContactResponse.status(),data:await savedContactResponse.json()};
    assert.equal(contact.status,200,`Opted-in seller contact receipt failed: ${contact.data.error||contact.status}`);
    await primary.page.getByText('Email contact attempt recorded.',{exact:true}).waitFor();
    assert.equal(await sql(`SELECT (contact_attempted_at='${contactAt.toISOString()}'::timestamptz)::text FROM public.agent_site_leads WHERE id='${leadId}';`),'true');
    await primary.page.getByRole('button',{name:'Record customer reply',exact:true}).waitFor({state:'visible'});
    const replyAt=new Date(Date.now()-60_000);replyAt.setSeconds(0,0);
    await enterReceiptTime(replyAt);
    const replyResponse=primary.page.waitForResponse((response)=>response.url()===`${origin}/api/realtor/leads` && response.request().method()==='POST');
    await primary.page.getByRole('button',{name:'Record customer reply',exact:true}).click();
    const savedReplyResponse=await replyResponse;
    const reply={status:savedReplyResponse.status(),data:await savedReplyResponse.json()};
    assert.equal(reply.status,200,`Seller reply receipt failed: ${reply.data.error||reply.status}`);
    assert.equal(await sql(`SELECT (responded_at='${replyAt.toISOString()}'::timestamptz)::text FROM public.agent_site_leads WHERE id='${leadId}';`),'true');
    console.log('PASS: real-owner contact and reply receipts preserve the earlier local times chosen in the rendered inbox.');
    const replyFollowUp=await request(primary.page,'/api/realtor/planner','POST',{
      itemId:null,expectedRevision:null,item:{kind:'follow_up',title:'Synthetic seller reply follow-up',notes:'',
        due:{anchorDate:appointmentDate,localTime:appointmentTime,timeZone,recurrence:{frequency:'once'},endsOn:appointmentDate,
          reminderOffsetsDays:[0]},expectedAmountCents:null,property:null,sourceSprintTaskId:null,
        sellerLead:{leadId,actionKey:`reply:${reply.data.result.eventId}`,expectedLeadRevision:reply.data.result.leadRevision},requestKey:randomUUID()},
    });
    assert.equal(replyFollowUp.status,200,`Reply follow-up setup failed: ${replyFollowUp.data.error||replyFollowUp.status}`);
    const replyPlannerId=replyFollowUp.data.result.item_id;
    const consultation=await request(primary.page,'/api/realtor/leads','POST',{
      leadId,expectedRevision:reply.data.result.leadRevision,requestKey:randomUUID(),action:'confirm_consultation',
      startsAt:startAt.toISOString(),confirmationBasis:'confirmed_booking',
    });
    assert.equal(consultation.status,200,`Consultation confirmation failed: ${consultation.data.error||consultation.status}`);
    const consultationEventId=consultation.data.result.eventId;
    const activeConsultations=await request(primary.page,`/api/realtor/leads/outcomes?leadId=${leadId}&kind=consultation`);
    assert.equal(activeConsultations.status,200);
    assert.equal(activeConsultations.data.result.events[0]?.id,consultationEventId,
      'the current owner can load the active consultation independently of recent contact history');
    await primary.page.goto(`${origin}/seller-inbox?leadId=${leadId}`);
    await primary.page.getByRole('heading',{name:'Synthetic Seller',exact:true}).waitFor();
    assert(await primary.page.getByRole('button',{name:'Schedule response',exact:true}).isDisabled(),
      'initial response scheduling is disabled after the first contact');
    await primary.page.getByRole('button',{name:/Schedule follow-up for reply/}).click();
    const savedReplyLink=primary.page.getByRole('dialog',{name:'Schedule seller follow-up'}).getByRole('link',{name:'Open saved planner task',exact:true});
    await savedReplyLink.waitFor();
    assert.equal(await savedReplyLink.getAttribute('href'),`/planner?date=${appointmentDate}`);
    await primary.page.keyboard.press('Escape');
    await primary.page.getByRole('button',{name:'Schedule confirmed consultation',exact:true}).click();
    await primary.page.getByRole('button',{name:'Schedule consultation appointment',exact:true}).click();
    await primary.page.getByRole('dialog',{name:'Schedule confirmed consultation'}).waitFor();
    await primary.page.keyboard.press('Escape');
    assert.equal(await sql(`SELECT revision FROM public.agent_site_leads WHERE id='${leadId}';`),String(consultation.data.result.leadRevision),
      'reopening saved reply and consultation scheduling drafts performs no lead write');
    const planner=await request(primary.page,'/api/realtor/planner','POST',{
      itemId:null,expectedRevision:null,item:{kind:'appointment',title:'Confirmed seller consultation',notes:'Synthetic acceptance appointment',
        due:{anchorDate:appointmentDate,localTime:appointmentTime,timeZone,recurrence:{frequency:'once'},endsOn:appointmentDate,
          reminderOffsetsDays:[0],utcOffsetMinutes},expectedAmountCents:null,property:null,sourceSprintTaskId:null,
        sellerLead:{leadId,actionKey:`consultation:${consultationEventId}`,expectedLeadRevision:consultation.data.result.leadRevision},requestKey:randomUUID()},
    });
    assert.equal(planner.status,200,`Exact-time consultation planner link failed: ${planner.data.error||planner.status}`);
    const linkedPlannerId=planner.data.result.item_id;
    assert.match(linkedPlannerId,/^[0-9a-f-]{36}$/i);
    await primary.page.getByRole('button',{name:'Schedule consultation appointment',exact:true}).click();
    const savedConsultationLink=primary.page.getByRole('dialog',{name:'Schedule confirmed consultation'}).getByRole('link',{name:'Open saved planner task',exact:true});
    await savedConsultationLink.waitFor();
    assert.equal(await savedConsultationLink.getAttribute('href'),`/planner?date=${appointmentDate}`);
    await primary.page.keyboard.press('Escape');
    const scheduleRow=await sql(`SELECT count(*)::text FROM public.realtor_planner_occurrences occurrence JOIN public.realtor_planner_items item ON item.id=occurrence.item_id WHERE item.id='${linkedPlannerId}' AND occurrence.status='pending';`);
    assert.equal(scheduleRow,'1','the confirmed consultation creates exactly one pending appointment');
    const cancellation=await request(primary.page,'/api/realtor/leads','POST',{
      leadId,expectedRevision:consultation.data.result.leadRevision,requestKey:randomUUID(),action:'cancel_consultation',consultationEventId,
    });
    assert.equal(cancellation.status,200,`Consultation cancellation failed: ${cancellation.data.error||cancellation.status}`);
    const cancelledOutcomes=await request(primary.page,`/api/realtor/leads/outcomes?leadId=${leadId}&kind=consultation`);
    assert.equal(cancelledOutcomes.status,200);
    assert.deepEqual(cancelledOutcomes.data.result.events,[],
      'cancelled consultations are excluded from the actionable outcome picker');
    assert.equal(await sql(`SELECT status FROM public.realtor_planner_occurrences WHERE item_id='${linkedPlannerId}';`),'cancelled',
      'cancellation transaction cancels the linked pending appointment');
    assert.equal(await sql(`SELECT status FROM public.realtor_reminders WHERE occurrence_id IN (SELECT id FROM public.realtor_planner_occurrences WHERE item_id='${linkedPlannerId}');`),'superseded',
      'cancellation transaction supersedes the linked pending reminder');
    const closing=await request(primary.page,'/api/realtor/leads','POST',{
      leadId,expectedRevision:cancellation.data.result.leadRevision,requestKey:randomUUID(),action:'record_closing',
      closedOn:today,reference:`acceptance-${leadId}`,
    });
    assert.equal(closing.status,200,`Closing evidence failed: ${closing.data.error||closing.status}`);
    const activeClosings=await request(primary.page,`/api/realtor/leads/outcomes?leadId=${leadId}&kind=closing`);
    assert.equal(activeClosings.status,200);
    assert.equal(activeClosings.data.result.events[0]?.id,closing.data.result.eventId,
      'the current owner can load the active closing for correction');
    console.log('PASS: authenticated active-outcome reads show the current consultation/closing state.');
    const todayResult=await request(primary.page,'/api/realtor/today');
    assert.equal(todayResult.status,200);
    assert.equal(todayResult.data.result.seller.value.counts.newRequests,1);
    assert.equal(todayResult.data.result.seller.value.counts.customerReplies,1);
    assert.equal(todayResult.data.result.seller.value.counts.confirmedConsultations,0,
      'cancelled consultation does not remain active in the owner-local outcome scoreboard');
    assert.equal(todayResult.data.result.seller.value.counts.recordedClosings,1,
      'seller closing outcome is visible as a distinct seller measure');
    assert.equal(todayResult.data.result.seller.value.campaigns.find((entry)=>entry.campaignKey==='auth-acceptance')?.requests,1);
    const cashSummary=await request(primary.page,`/api/realtor/business-summary?year=${Number(today.slice(0,4))}`);
    assert.equal(cashSummary.status,200);
    assert.equal(Number(cashSummary.data.result.recordedNetCents||0),0,
      'a seller closing outcome does not create or imply a financial cash record');
    await primary.page.goto(`${origin}/today`);
    await primary.page.getByRole('heading',{name:'Seller business'}).waitFor();
    await primary.page.getByText('Recorded closings',{exact:true}).waitFor();

    const reviewTask=await request(primary.page,'/api/realtor/planner','POST',{
      itemId:null,expectedRevision:null,item:{kind:'weekly_review',title:'Seller acceptance weekly review',notes:'',
        due:{anchorDate:today,localTime:null,timeZone,recurrence:{frequency:'once'},endsOn:today,reminderOffsetsDays:[]},
        expectedAmountCents:null,property:null,sourceSprintTaskId:null,requestKey:randomUUID()},
    });
    assert.equal(reviewTask.status,200,`Weekly review task creation failed: ${reviewTask.data.error||reviewTask.status}`);
    const plannerRead=await request(primary.page,`/api/realtor/planner?from=${today}&through=${today}&status=pending&limit=100`);
    const reviewOccurrence=plannerRead.data.result.items.find((item)=>item.item_id===reviewTask.data.result.item_id);
    assert(reviewOccurrence,'weekly review occurrence is visible to its owner');
    const completedReview=await request(primary.page,`/api/realtor/planner/${reviewOccurrence.id}`,'PATCH',{
      action:'complete',expectedRevision:reviewOccurrence.revision,requestKey:randomUUID(),completionDetails:{weeklyReview:{
        version:2,reviewedUpcomingDates:true,reviewedMissingExpenses:true,reviewedSellerOutcomes:true,
        priority:'Improve seller follow-up',chosenNextAction:'Call opted-in requests',friction:null,
      }},
    });
    assert.equal(completedReview.status,200,`Version-2 weekly review save failed: ${completedReview.data.error||completedReview.status}`);
    const persistedReview=await sql(`SELECT completion_details->'weeklyReview'->>'localWeekKey' FROM public.realtor_planner_occurrences WHERE id='${reviewOccurrence.id}';`);
    assert.match(persistedReview,/^\d{4}-\d{2}-\d{2}$/,'server generates the local review week key');
    assert.equal(await sql(`SELECT completion_details->'weeklyReview'->>'version' FROM public.realtor_planner_occurrences WHERE id='${reviewOccurrence.id}';`),'2');

    await primary.page.goto(`${origin}/seller-inbox?leadId=${leadId}`);
    await primary.page.getByRole('heading',{name:'Synthetic Seller',exact:true}).waitFor();
    await primary.page.getByRole('button',{name:'Revoke requested contact',exact:true}).click();
    await primary.page.getByRole('button',{name:'Keep requested contact',exact:true}).click();
    assert.equal(await sql(`SELECT revision FROM public.agent_site_leads WHERE id='${leadId}';`),String(closing.data.result.leadRevision),
      'cancelling permission revocation performs no write');
    await primary.page.getByRole('button',{name:'Revoke requested contact',exact:true}).click();
    await primary.page.getByRole('button',{name:'Confirm contact revocation',exact:true}).click();
    await primary.page.getByText('Requested-contact permission: not active.',{exact:true}).waitFor();
    assert.equal(await sql(`SELECT count(*) FROM public.seller_lead_events WHERE lead_id='${leadId}' AND event_type='contact_permission_revoked';`),'1');
    assert.equal(await sql(`SELECT status FROM public.realtor_planner_occurrences WHERE item_id='${replyPlannerId}';`),'cancelled');
    assert.equal(await sql(`SELECT status FROM public.realtor_reminders WHERE occurrence_id IN (SELECT id FROM public.realtor_planner_occurrences WHERE item_id='${replyPlannerId}');`),'superseded');
    console.log('PASS: owner reopens saved reply/consultation drafts without a write, then confirms contact revocation through the inbox and cancels its pending reply reminder.');

    const outsider=await login();
    const outsiderSetup=await request(outsider.page,'/api/realtor/preferences','POST',{
      timeZone,remindersEnabled:false,gamificationEnabled:false,celebrationsEnabled:false,hideAmountsOnToday:false,
      recordsStartDate:today,expectedRevision:null,requestKey:randomUUID(),
    });
    assert.equal(outsiderSetup.status,200);
    workspaceIds.push(outsiderSetup.data.result.workspace_id);
    const foreignLeads=await request(outsider.page,`/api/realtor/leads?leadId=${leadId}`);
    assert.equal(foreignLeads.status,200);
    assert.deepEqual(foreignLeads.data.result.leads,[],'a real unrelated owner cannot see the synthetic seller lead');
    const foreignSchedule=await request(outsider.page,`/api/realtor/leads/schedule?leadId=${leadId}&actionKey=initial-response%3Av1`);
    assert.equal(foreignSchedule.status,200);
    assert.equal(foreignSchedule.data.result,null,'an unrelated owner receives no seller planner link or task details');
    const foreignOutcomes=await request(outsider.page,`/api/realtor/leads/outcomes?leadId=${leadId}&kind=closing`);
    assert.equal(foreignOutcomes.status,200);
    assert.deepEqual(foreignOutcomes.data.result.events,[],
      'a real unrelated owner cannot load seller outcome details');
    await outsider.page.goto(`${origin}/seller-inbox?leadId=${leadId}`);
    await outsider.page.getByText('This seller request is unavailable to your workspace.',{exact:true}).waitFor();
    assert.equal(await outsider.page.getByRole('heading',{name:'Synthetic Seller',exact:true}).count(),0,
      'the personal inbox never renders another owner’s seller request');
    assert.equal(outsider.pageErrors.length,0,`Foreign-user browser errors: ${outsider.pageErrors.join('; ')}`);
    console.log('PASS: real owner auth reads a private seller request, records contact/reply/consultation/closing, links and cancels its appointment/reminder, and completes v2 weekly review.');
    console.log('PASS: owner-local scoreboard preserves campaign cohorts and separates a seller closing from manual cash; another authenticated owner cannot read the lead.');
    }

    const recoveryLeadId=randomUUID();
    await sql(`INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata)
      VALUES('${recoveryLeadId}','${agentId}','${subdomain}','seller_plan','Synthetic Recovery Seller','recovery@example.test','Scheduling recovery fixture',
        jsonb_build_object('sellerPlan',jsonb_build_object('requestedContact',jsonb_build_object('granted',true,'capturedAt',now()))));`);
    await primary.page.goto(`${origin}/seller-inbox?leadId=${recoveryLeadId}`);
    await primary.page.getByRole('heading',{name:'Synthetic Recovery Seller',exact:true}).waitFor();
    await primary.page.getByRole('button',{name:'Schedule response',exact:true}).click();
    const recoveryDialog=primary.page.getByRole('dialog',{name:'Schedule seller response'});
    await recoveryDialog.getByLabel('Date',{exact:true}).fill(appointmentDate);
    await recoveryDialog.getByLabel('Time',{exact:true}).fill('16:45');
    await recoveryDialog.getByLabel('Remind me at the scheduled time',{exact:true}).uncheck();
    await recoveryDialog.getByLabel('Time zone',{exact:true}).fill('America/');
    await recoveryDialog.getByText('Choose a valid time zone, such as America/Chicago.',{exact:true}).waitFor();
    assert.equal(await recoveryDialog.getByRole('button',{name:'Schedule response',exact:true}).isEnabled(),false,
      'an incomplete time zone remains editable and blocks scheduling');
    assert.equal(await recoveryDialog.getByLabel('Date',{exact:true}).inputValue(),appointmentDate);
    assert.equal(await recoveryDialog.getByLabel('Time',{exact:true}).inputValue(),'16:45');
    assert.equal(await sql(`SELECT count(*) FROM public.realtor_planner_items WHERE source_lead_id='${recoveryLeadId}';`),'0',
      'invalid scheduling drafts do not write planner items');
    await recoveryDialog.getByLabel('Time zone',{exact:true}).fill('  America/Chicago  ');
    await recoveryDialog.getByText('Choose a valid time zone, such as America/Chicago.',{exact:true}).waitFor({state:'hidden'});
    const changedRecoveryLead=await request(primary.page,'/api/realtor/leads','POST',{
      leadId:recoveryLeadId,expectedRevision:1,requestKey:randomUUID(),action:'record_response',
      source:'customer_reply',occurredAt:new Date().toISOString(),
    });
    assert.equal(changedRecoveryLead.status,200,'a real concurrent owner action changes the open draft revision');
    const staleRecoveryAction=await request(primary.page,'/api/realtor/leads','POST',{
      leadId:recoveryLeadId,expectedRevision:1,requestKey:randomUUID(),action:'record_response',
      source:'customer_reply',occurredAt:new Date().toISOString(),
    });
    assert.equal(staleRecoveryAction.status,409,'a stale seller action returns a business conflict without transaction retries');
    assert.equal(await recoveryDialog.getByLabel('Date',{exact:true}).inputValue(),appointmentDate,'recovery draft retains its date before the first save');
    assert.equal(await recoveryDialog.getByLabel('Time',{exact:true}).inputValue(),'16:45','recovery draft retains its time before the first save');
    assert.equal(await recoveryDialog.getByRole('button',{name:'Schedule response',exact:true}).isEnabled(),true,
      'the populated recovery draft is ready to submit');
    const plannerBaseline=await request(primary.page,`/api/realtor/planner?from=${today}&through=${appointmentDate}`);
    assert.equal(plannerBaseline.status,200,'real owner planner read is available before submitting the stale draft');
    await primary.page.screenshot({path:artifacts+'seller-schedule-recovery.png'});
    await recoveryDialog.getByRole('button',{name:'Schedule response',exact:true}).click({trial:true,timeout:5000});
    const scheduleNetwork=[];
    const observeScheduleRequest=(req)=>{if(new URL(req.url()).pathname==='/api/realtor/planner')scheduleNetwork.push(`request ${req.method()}`);};
    const observeScheduleResponse=(res)=>{if(new URL(res.url()).pathname==='/api/realtor/planner')scheduleNetwork.push(`response ${res.status()}`);};
    primary.page.on('request',observeScheduleRequest);
    primary.page.on('response',observeScheduleResponse);
    let staleSaveResponse;
    try {
      [staleSaveResponse]=await Promise.all([
        primary.page.waitForResponse((response)=>response.url()===`${origin}/api/realtor/planner` && response.request().method()==='POST'),
        recoveryDialog.getByRole('button',{name:'Schedule response',exact:true}).click({timeout:5000}),
      ]);
    } catch (error) {
      const databaseActivity=await sql(`SELECT COALESCE(json_agg(json_build_object('state',state,'wait',wait_event_type||':'||wait_event,'blockedBy',cardinality(pg_blocking_pids(pid)),
        'plannerRpc',query ILIKE '%realtor_save_planner_item%')), '[]'::json) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND state<>'idle';`);
      throw new Error(`Scheduling browser boundary: ${error.message}; browser errors: ${primary.pageErrors.join('; ')}; network: ${scheduleNetwork.join(', ')}; dialog errors: ${(await recoveryDialog.getByRole('alert').allTextContents()).join('; ')}; server: ${plannerServerSignals.join('; ')}; database: ${databaseActivity}`);
    } finally {
      primary.page.off('request',observeScheduleRequest);
      primary.page.off('response',observeScheduleResponse);
    }
    assert.equal(staleSaveResponse.status(),409,'the real planner API rejects the stale lead revision');
    await recoveryDialog.getByText('Scheduling is paused until the seller request is available and current.',{exact:true}).waitFor();
    assert(await recoveryDialog.getByRole('button',{name:'Schedule response',exact:true}).isDisabled());
    assert.equal(await sql(`SELECT count(*) FROM public.realtor_planner_items WHERE source_lead_id='${recoveryLeadId}';`),'0',
      'a stale schedule write creates no planner item');
    const recoveryReadUrl=`${origin}/api/realtor/leads?leadId=${recoveryLeadId}`;
    await primary.page.route(recoveryReadUrl,async (route)=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false})}));
    await recoveryDialog.getByRole('button',{name:'Reload seller request',exact:true}).click();
    await recoveryDialog.getByText('Could not reload this seller request. Try reloading again.',{exact:true}).waitFor();
    assert(await recoveryDialog.getByRole('button',{name:'Schedule response',exact:true}).isDisabled());
    await primary.page.unroute(recoveryReadUrl);
    await recoveryDialog.getByRole('button',{name:'Reload seller request',exact:true}).click();
    await recoveryDialog.getByText('Scheduling is paused until the seller request is available and current.',{exact:true}).waitFor({state:'hidden'});
    assert.equal(await recoveryDialog.getByLabel('Date',{exact:true}).inputValue(),appointmentDate);
    assert.equal(await recoveryDialog.getByLabel('Time',{exact:true}).inputValue(),'16:45');
    assert.equal(await recoveryDialog.getByLabel('Remind me at the scheduled time',{exact:true}).isChecked(),false);
    const recoveredSaveResponse=primary.page.waitForResponse((response)=>response.url()===`${origin}/api/realtor/planner` && response.request().method()==='POST');
    await recoveryDialog.getByRole('button',{name:'Schedule response',exact:true}).click();
    const recoveredSave=await recoveredSaveResponse;
    assert.equal(recoveredSave.status(),200,'the recovered draft saves through the real planner API');
    const recoveredBody=recoveredSave.request().postDataJSON();
    assert.equal(recoveredBody.item.due.timeZone,'America/Chicago','the existing scheduling API receives the normalized time zone');
    assert.equal(recoveredBody.item.sellerLead.expectedLeadRevision,changedRecoveryLead.data.result.leadRevision);
    await recoveryDialog.waitFor({state:'hidden'});
    assert.equal(await sql(`SELECT count(*) FROM public.realtor_planner_items WHERE source_lead_id='${recoveryLeadId}' AND source_lead_revision=${changedRecoveryLead.data.result.leadRevision};`),'1');
    assert.equal(await sql(`SELECT count(*) FROM public.seller_lead_events WHERE lead_id='${recoveryLeadId}';`),'1',
      'scheduling recovery creates no extra seller receipt');
    await primary.page.getByRole('button',{name:'Schedule response',exact:true}).click();
    const reopenedRecoveryLink=primary.page.getByRole('dialog',{name:'Schedule seller response'}).getByRole('link',{name:'Open saved planner task',exact:true});
    await reopenedRecoveryLink.waitFor();
    assert.equal(await reopenedRecoveryLink.getAttribute('href'),`/planner?date=${appointmentDate}`);
    await reopenedRecoveryLink.click();
    await primary.page.getByText('Respond to seller request — Synthetic Recovery Seller',{exact:true}).waitFor();
    assert.equal(await sql(`SELECT count(*) FROM public.realtor_planner_items WHERE source_lead_id='${recoveryLeadId}';`),'1',
      'reopening and following a saved planner link creates no duplicate task');
    console.log('PASS: saved seller response/reply/consultation links open their persisted dates, including completed past-year tasks; foreign owners receive no link.');
    console.log('PASS: a real stale seller schedule is rejected; failed reload preserves the draft, and fresh owner revision creates exactly one planner item.');
    assert.equal(primary.pageErrors.length,0,`Owner browser errors: ${primary.pageErrors.join('; ')}`);
  } else if (sellerVideoOnly) {
    const created = await request(primary.page, '/api/workspaces', 'POST', { kind: 'personal', name: 'Seller video browser acceptance' });
    assert.equal(created.status, 201, `Real-auth workspace creation failed: ${created.data.error || created.status}`);
    const workspace = created.data.workspaceId;
    workspaceIds.push(workspace);
    const noSellerSiteAttributions = await request(primary.page, `/api/seller-video-briefs/attributions?workspaceId=${workspace}`);
    assert.equal(noSellerSiteAttributions.status, 200, 'an owner without a configured seller site still loads the seller workspace');
    assert.deepEqual(noSellerSiteAttributions.data.leads, []);
    const task = await request(primary.page, '/api/sprints', 'POST', {
      action: 'add_backlog_item', workspaceId: workspace,
      title: 'Acceptance video brief task', description: 'Disposable browser-only fixture', priority: 2,
      estimateMinutes: 30, sourceType: 'manual', sourceId: `auth-${randomUUID()}`,
    });
    assert.equal(task.status, 201, `Real-auth backlog creation failed: ${task.data.error || task.status}`);
    assert.match(task.data.backlogItem?.id || '', /^[0-9a-f-]{36}$/i, `Workspace backlog creation returned no item: ${JSON.stringify(task.data)}`);
    const workspaceBacklog = await request(primary.page, `/api/sprints?workspaceId=${workspace}`);
    assert.equal(workspaceBacklog.status, 200, `Real-auth workspace backlog read failed: ${JSON.stringify(workspaceBacklog.data)}`);
    assert(workspaceBacklog.data.backlog.some((item) => item.id === task.data.backlogItem.id),
      `Created task is not present in workspace backlog: ${JSON.stringify(workspaceBacklog.data.backlog)}`);
    await primary.page.goto(`${origin}/sprints`);
    await primary.page.getByRole('heading', { name: 'Shape a short-form video brief' }).waitFor();
    await primary.page.reload();
    await primary.page.getByRole('heading', { name: 'Shape a short-form video brief' }).waitFor();
    await primary.page.getByLabel('Seller video workspace').selectOption(workspace);
    try {
      await primary.page.locator(`select[aria-label="Linked backlog task"] option[value="${task.data.backlogItem.id}"]`).waitFor({ state: 'attached', timeout: 10000 });
    } catch (error) {
      console.error(`Seller editor after workspace select: ${await primary.page.locator('body').innerText()}`);
      throw error;
    }
    await primary.page.getByLabel('Linked backlog task').selectOption(task.data.backlogItem.id);
    await primary.page.getByLabel('Topic').fill('Seller photo-day preparation');
    await primary.page.getByLabel('Audience need').fill('Homeowners need a clear and practical photo-day checklist.');
    await primary.page.getByLabel('Opening hook').fill('Make photo day feel easier with these steps.');
    await primary.page.getByLabel('Script').fill('Start with the entryway, put away everyday items, and prepare each room for the photographer.');
    await primary.page.getByLabel('Shot list · one per line').fill('A clear entryway before the checklist');
    await primary.page.getByLabel('Campaign key').fill('acceptance-video');
    await primary.page.getByRole('button', { name: 'Save private draft' }).click();
    await primary.page.getByRole('status').filter({ hasText: 'Private draft saved.' }).waitFor();
    await primary.page.getByRole('heading', { name: 'Seller photo-day preparation' }).waitFor();
    const saved = await request(primary.page, `/api/seller-video-briefs?workspaceId=${workspace}`);
    assert.equal(saved.status, 200);
    assert.equal(saved.data.briefs.length, 1);
    assert.equal(saved.data.briefs[0].brief_data.reviewStatus, 'draft');
    assert.equal(saved.data.briefs[0].backlog_item_id, task.data.backlogItem.id);
    const exactRead = await request(primary.page, `/api/seller-video-briefs?workspaceId=${workspace}&briefId=${saved.data.briefs[0].brief_id}&revision=1`);
    assert.equal(exactRead.status, 200);
    assert.equal(exactRead.data.briefs.length, 1, 'review UI can fetch an exact immutable brief revision');
    const outsider = await login();
    const foreignRead = await request(outsider.page, `/api/seller-video-briefs?workspaceId=${workspace}`);
    assert.equal(foreignRead.status, 404, 'a real authenticated non-member cannot read private briefs');
    assert.equal(await outsider.page.getByRole('heading', { name: 'Seller video workspace' }).count(), 0);
    await sql(`INSERT INTO platform_memberships(workspace_id,user_id,role,status) VALUES('${workspace}','${outsider.userId}','reviewer','active');`);
    const nonWriterDraft = { ...saved.data.briefs[0].brief_data, briefId: randomUUID() };
    assert.equal((await request(outsider.page, '/api/seller-video-briefs', 'POST', { workspaceId: workspace, brief: nonWriterDraft })).status, 403,
      'a real authenticated reviewer may read but cannot save creator-only drafts');
    await outsider.page.goto(`${origin}/sprints`);
    await outsider.page.getByLabel('Seller video workspace').selectOption(workspace);
    await outsider.page.getByText('Your workspace role can view drafts but cannot create or save them.').waitFor();
    assert.equal(await outsider.page.getByRole('button', { name: 'Save private draft' }).count(), 0);
    const reviewButton = primary.page.getByRole('button', { name: 'Request human review' });
    await reviewButton.click();
    await primary.page.getByRole('status').filter({ hasText: 'Review is' }).waitFor();
    const reviewRun = await sql(`SELECT id FROM platform_runs WHERE workspace_id='${workspace}' AND definition->>'key'='seller_video_review' AND definition#>>'{nodes,0,target,resourceId}'='${saved.data.briefs[0].brief_id}' AND definition#>>'{nodes,0,target,revision}'='1';`);
    assert.match(reviewRun, /^[0-9a-f-]{36}$/i);
    const reviewJob = await sql(`SELECT id FROM claim_workflow_jobs(100,30) WHERE workflow_key='platform_run' AND payload->>'runId'='${reviewRun}';`);
    const reviewLease = await sql(`SELECT lease_token FROM workflow_jobs WHERE id='${reviewJob}';`);
    assert.equal(await sql(`SELECT run_status FROM platform_tick_run('${reviewJob}','${reviewLease}');`), 'waiting');
    const reviewCheckpoint = await sql(`SELECT id FROM platform_checkpoints WHERE run_id='${reviewRun}';`);
    assert.match(reviewCheckpoint, /^[0-9a-f-]{36}$/i);
    const pendingPublication = await request(primary.page, '/api/seller-video-briefs/publications', 'POST', {
      workspaceId: workspace, briefId: saved.data.briefs[0].brief_id, revision: 1, platform: 'instagram-reels',
      publicUrl: 'https://www.instagram.com/reel/disposable-acceptance-fixture/',
      publishedAt: '2026-10-05T12:00:00Z', requestKey: randomUUID(),
    });
    assert.equal(pendingPublication.status, 403, 'an unresolved review cannot be recorded as published');
    await sql(`UPDATE platform_memberships SET role='member',revision=revision+1 WHERE workspace_id='${workspace}' AND user_id='${outsider.userId}';`);
    const unauthorizedDecision = await request(outsider.page, `/api/workspaces/${workspace}/checkpoints`, 'POST', {
      checkpointId: reviewCheckpoint, expectedRevision: 1, submissionKey: randomUUID(), value: true,
    });
    assert.equal(unauthorizedDecision.status, 403, 'a workspace member without a reviewer role cannot decide an approval');
    await sql(`UPDATE platform_memberships SET role='reviewer',revision=revision+1 WHERE workspace_id='${workspace}' AND user_id='${outsider.userId}';`);
    assert.equal(await sql(`SELECT public.platform_require_run_role('${outsider.userId}','${workspace}',ARRAY['owner','admin','member','reviewer','viewer']);`), 'reviewer', 'reviewer is authorized for checkpoint read-model RPCs');
    assert.equal(await sql(`SELECT count(*) FROM public.platform_list_provider_exceptions('${outsider.userId}','${workspace}',NULL,NULL,26);`), '0', 'reviewer can read the provider exception summary');
    assert.equal(await sql(`SELECT count(*) FROM public.platform_list_unknown_effects('${outsider.userId}','${workspace}',NULL,NULL,26);`), '0', 'reviewer can read the unknown effect summary');
    const providerRead = await admin.rpc('platform_list_provider_exceptions', { p_actor_id: outsider.userId, p_workspace_id: workspace, p_after: null, p_after_id: null, p_limit: 26 });
    assert.equal(providerRead.error, null, `service-role reviewer provider exception read failed: ${providerRead.error?.code || providerRead.error?.message || ''}`);
    const unknownRead = await admin.rpc('platform_list_unknown_effects', { p_actor_id: outsider.userId, p_workspace_id: workspace, p_after: null, p_after_id: null, p_limit: 26 });
    assert.equal(unknownRead.error, null, `service-role reviewer unknown effect read failed: ${unknownRead.error?.code || unknownRead.error?.message || ''}`);
    const healthJobsRead = await admin.rpc('platform_list_connector_health_jobs', { p_actor_id: outsider.userId, p_workspace_id: workspace });
    assert.equal(healthJobsRead.error, null, `service-role reviewer connector health read failed: ${healthJobsRead.error?.code || healthJobsRead.error?.message || ''}`);
    const healthAuditRead = await admin.rpc('platform_list_connector_health_audit', { p_actor_id: outsider.userId, p_workspace_id: workspace, p_after: null, p_after_id: null, p_limit: 26 });
    assert.equal(healthAuditRead.error, null, `service-role reviewer connector audit read failed: ${healthAuditRead.error?.code || healthAuditRead.error?.message || ''}`);
    const reviewerInbox = await request(outsider.page, `/api/workspaces/${workspace}/checkpoints`);
    assert.equal(reviewerInbox.status, 200, `real reviewer inbox API read failed: ${JSON.stringify(reviewerInbox.data)}`);
    assert(reviewerInbox.data.result.items.some((item) => item.id === reviewCheckpoint), 'the pending review checkpoint appears in the reviewer inbox API');
    const reviewerBrief = await request(outsider.page, `/api/seller-video-briefs?workspaceId=${workspace}&briefId=${saved.data.briefs[0].brief_id}&revision=1`);
    assert.equal(reviewerBrief.status, 200, `real reviewer exact-draft read failed: ${JSON.stringify(reviewerBrief.data)}`);
    assert.equal(reviewerBrief.data.briefs[0]?.brief_data?.hook, saved.data.briefs[0].brief_data.hook);
    await outsider.page.goto(`${origin}/workspaces/${workspace}/inbox`);
    await outsider.page.getByText('Make photo day feel easier with these steps.').waitFor().catch(async (error) => {
      console.error(`Reviewer inbox rendered text: ${await outsider.page.locator('body').innerText()}`);
      throw error;
    });
    await outsider.page.getByText('Start with the entryway, put away everyday items, and prepare each room for the photographer.').waitFor();
    await outsider.page.getByText(/Listing media: not-needed/).waitFor();
    assert.equal(await outsider.page.getByRole('button', { name: 'Approve' }).count(), 1);
    await outsider.page.getByRole('button', { name: 'Approve' }).click();
    await outsider.page.getByText('Nothing needs your input.').waitFor();
    assert.equal(await sql(`SELECT response::text FROM platform_checkpoints WHERE id='${reviewCheckpoint}';`), 'true');
    const completionJob = await sql(`SELECT id FROM claim_workflow_jobs(100,30) WHERE workflow_key='platform_run' AND payload->>'runId'='${reviewRun}' AND payload->>'generation'='2';`);
    const completionLease = await sql(`SELECT lease_token FROM workflow_jobs WHERE id='${completionJob}';`);
    assert.equal(await sql(`SELECT run_status FROM platform_tick_run('${completionJob}','${completionLease}');`), 'completed');
    assert.equal(await sql(`SELECT count(*) FROM platform_effect_receipts WHERE run_id='${reviewRun}';`), '0', 'approval does not publish or send the video');
    const publicationUrl = 'https://www.instagram.com/reel/disposable-acceptance-fixture/';
    await primary.page.getByLabel(`Publication platform ${saved.data.briefs[0].brief_id}`).selectOption('instagram-reels');
    await primary.page.getByLabel(`Published post URL ${saved.data.briefs[0].brief_id}`).fill(publicationUrl);
    await primary.page.getByLabel(`Published date ${saved.data.briefs[0].brief_id}`).fill('2026-10-05T12:00');
    await primary.page.getByRole('button', { name: 'Record already-published post' }).click();
    await primary.page.getByRole('status').filter({ hasText: 'Manual publication record saved.' }).waitFor();
    const publicationInput = {
      workspaceId: workspace, briefId: saved.data.briefs[0].brief_id, revision: 1, platform: 'instagram-reels',
      publicUrl: publicationUrl, publishedAt: '2026-10-05T17:00:00.000Z', requestKey: randomUUID(),
    };
    const ownerRecords = await request(primary.page, `/api/seller-video-briefs/publications?workspaceId=${workspace}`);
    assert.equal(ownerRecords.status, 200);
    assert.equal(ownerRecords.data.records.length, 1);
    assert.equal(ownerRecords.data.records[0].review_checkpoint_id, reviewCheckpoint);
    assert.equal(ownerRecords.data.records[0].entered_by, primary.userId);
    assert.equal((await request(outsider.page, `/api/seller-video-briefs/publications?workspaceId=${workspace}`)).status, 403,
      'reviewers may approve drafts but publication records remain owner/admin-only');
    const publicationReplay = await request(primary.page, '/api/seller-video-briefs/publications', 'POST', publicationInput);
    assert.equal(publicationReplay.status, 200, 'the same platform post record is idempotent after an uncertain save');
    assert.equal(publicationReplay.data.reused, true);
    assert.equal((await request(primary.page, '/api/seller-video-briefs/publications', 'POST', { ...publicationInput, publicUrl: 'https://www.instagram.com/reel/conflicting-fixture/' })).status, 409,
      'a conflicting URL cannot replace the same exact brief/platform record');
    assert.equal(await sql(`SELECT count(*) FROM public.seller_video_publication_records WHERE workspace_id='${workspace}';`), '1');
    const publicationId = ownerRecords.data.records[0].id;
    const priorMinute = new Date(Date.now() - 60_000);
    const localCapture = new Date(priorMinute.getTime() - priorMinute.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    await primary.page.getByLabel(`Outcome capture time ${publicationId}`).fill(localCapture);
    await primary.page.getByLabel(`Views ${publicationId}`).fill('240');
    await primary.page.getByLabel(`Engagements ${publicationId}`).fill('31');
    await primary.page.getByLabel(`Link clicks ${publicationId}`).fill('8');
    await primary.page.getByLabel(`Seller-plan requests ${publicationId}`).fill('2');
    await primary.page.getByLabel(`Outcome source note ${publicationId}`).fill('Entered from the visible post insights page.');
    await primary.page.getByRole('button', { name: 'Save measurement snapshot' }).click();
    try {
      await primary.page.getByRole('status').filter({ hasText: 'immutable history' }).waitFor({ timeout: 15000 });
    } catch (error) {
      console.error(`Outcome snapshot UI after submit: ${await primary.page.locator('body').innerText()}`);
      const diagnostics = await request(primary.page, `/api/seller-video-briefs/outcomes?workspaceId=${workspace}`);
      console.error(`Outcome snapshot read-back: ${JSON.stringify(diagnostics.data)}`);
      throw error;
    }
    const outcomeList = await request(primary.page, `/api/seller-video-briefs/outcomes?workspaceId=${workspace}`);
    assert.equal(outcomeList.status, 200);
    assert.equal(outcomeList.data.outcomes.length, 1);
    assert.equal(outcomeList.data.outcomes[0].views, 240);
    assert.equal((await request(outsider.page, `/api/seller-video-briefs/outcomes?workspaceId=${workspace}`)).status, 403,
      'reviewers cannot read owner-only publication outcomes');
    const outcomeInput = {
      workspaceId: workspace, publicationId, capturedAt: outcomeList.data.outcomes[0].captured_at,
      views: 240, engagements: 31, linkClicks: 8, sellerPlanRequests: 2,
      sourceNote: 'Entered from the visible post insights page.', requestKey: randomUUID(),
    };
    const outcomeReplay = await request(primary.page, '/api/seller-video-briefs/outcomes', 'POST', outcomeInput);
    assert.equal(outcomeReplay.status, 200, 'an uncertain save retries idempotently');
    assert.equal(outcomeReplay.data.reused, true);
    assert.equal((await request(primary.page, '/api/seller-video-briefs/outcomes', 'POST', { ...outcomeInput, views: 241 })).status, 409,
      'the snapshot idempotency key cannot be reused for changed measurements');
    assert.equal(await sql(`SELECT count(*) FROM public.seller_video_publication_outcomes WHERE workspace_id='${workspace}';`), '1');
    const attributionLeadId = randomUUID();
    const sellerAgent = `auth-acceptance-${randomUUID()}`;
    await sql(`
      INSERT INTO public.site_config(id,agent_id,owner_id,status) VALUES ('${randomUUID()}','${sellerAgent}','${primary.userId}','active');
      INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata,funnel_id)
        VALUES ('${attributionLeadId}','${sellerAgent}','auth-acceptance','seller_plan','Fixture Seller','private@example.test','Synthetic attribution fixture',
          '{"sellerPlan":{"requestKind":"seller_plan"}}'::jsonb,'${randomUUID()}');
    `);
    const attributionOptions = await request(primary.page, `/api/seller-video-briefs/attributions?workspaceId=${workspace}`);
    assert.equal(attributionOptions.status, 200);
    assert.equal(attributionOptions.data.leads.some((lead) => lead.id === attributionLeadId), true);
    assert.equal(JSON.stringify(attributionOptions.data.leads.find((lead) => lead.id === attributionLeadId)).includes('private@example.test'), false,
      'the lead attribution read model omits contact details');
    const attributionInput = {
      workspaceId: workspace, publicationId, leadId: attributionLeadId,
      evidenceNote: 'Seller named this post while submitting their request.', requestKey: randomUUID(),
    };
    const attributionSaved = await request(primary.page, '/api/seller-video-briefs/attributions', 'POST', attributionInput);
    assert.equal(attributionSaved.status, 201, `owner attribution failed: ${JSON.stringify(attributionSaved.data)}`);
    assert.equal((await request(primary.page, `/api/seller-video-briefs/attributions?workspaceId=${workspace}`)).data.attributions.length, 1);
    assert.equal((await request(outsider.page, `/api/seller-video-briefs/attributions?workspaceId=${workspace}`)).status, 403,
      'reviewers cannot read private lead-attribution evidence');
    assert.equal((await request(primary.page, '/api/seller-video-briefs/attributions', 'POST', { ...attributionInput, evidenceNote: 'Changed evidence on retry.' })).status, 409,
      'an idempotent attribution retry cannot change its evidence note');
    assert.equal(await sql(`SELECT count(*) FROM public.seller_lead_publication_attributions WHERE workspace_id='${workspace}';`), '1');
    assert.equal(await sql(`SELECT count(*) FROM public.platform_effect_receipts WHERE run_id='${reviewRun}';`), '0', 'recording the manual URL creates no provider or outbound effect');
    await sql(`UPDATE platform_memberships SET role='viewer',revision=revision+1 WHERE workspace_id='${workspace}' AND user_id='${outsider.userId}';`);
    assert.equal((await request(outsider.page, '/api/seller-video-briefs', 'POST', { workspaceId: workspace, brief: nonWriterDraft })).status, 403,
      'a real authenticated viewer cannot save creator-only drafts');
    await outsider.page.goto(`${origin}/sprints`);
    try {
      await outsider.page.getByLabel('Seller video workspace').waitFor({ timeout: 10000 });
    } catch (error) {
      console.error(`Viewer sprint page: ${await outsider.page.locator('body').innerText()}`);
      console.error(`Viewer browser errors: ${outsider.pageErrors.join('; ')}`);
      throw error;
    }
    await outsider.page.getByLabel('Seller video workspace').selectOption(workspace);
    await outsider.page.getByText('Your workspace role can view drafts but cannot create or save them.').waitFor();
    assert.equal(await outsider.page.getByRole('button', { name: 'Save private draft' }).count(), 0);
    assert.equal(primary.pageErrors.length, 0, `Browser errors: ${primary.pageErrors.join('; ')}`);
    assert.equal(outsider.pageErrors.length, 0, `Outsider browser errors: ${outsider.pageErrors.join('; ')}`);
    console.log('PASS: real Supabase browser sessions save a private draft, request exact-revision review, and let a separate reviewer inspect and approve it from the shared inbox.');
    console.log('PASS: workspace members without a review role are denied; reviewer decisions do not publish, upload, send, or create provider effects.');
  }
  if (!sellerVideoOnly && !sellerBusinessOnly) {
  const acceptanceToday = new Date().toISOString().slice(0,10);
  const offsetDate = (days) => { const value = new Date(); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0,10); };
  const setupInput = {
    timeZone: 'America/Chicago', remindersEnabled: true, gamificationEnabled: true,
    celebrationsEnabled: false, hideAmountsOnToday: false, recordsStartDate: acceptanceToday,
    expectedRevision: null, requestKey: randomUUID(),
  };
  const setup = await request(primary.page, '/api/realtor/preferences', 'POST', setupInput);
  if (setup.status !== 200) {
    const probeWorkspaceId = randomUUID();
    const probe = await admin.rpc('realtor_setup_personal_workspace', {
      p_actor_id: primary.userId, p_workspace_id: probeWorkspaceId, p_request_key: randomUUID(),
      p_expected_revision: null, p_name: 'Disposable RPC diagnostic', p_time_zone: setupInput.timeZone,
      p_reminders_enabled: setupInput.remindersEnabled, p_gamification_enabled: setupInput.gamificationEnabled,
      p_celebrations_enabled: setupInput.celebrationsEnabled, p_hide_amounts: setupInput.hideAmountsOnToday,
      p_records_start_date: setupInput.recordsStartDate,
    });
    const probeRow = Array.isArray(probe.data) ? probe.data[0] : probe.data;
    if (probeRow?.workspace_id) workspaceIds.push(probeRow.workspace_id);
    console.error(`Direct disposable setup RPC diagnostic: ${probe.error?.code || 'success'} ${probe.error?.message || JSON.stringify(probeRow)}`);
  }
  assert.equal(setup.status, 200, `Personal planner setup failed: ${setup.data.error || setup.status}`);
  const realtorPreferences = await request(primary.page, '/api/realtor/preferences');
  assert.equal(realtorPreferences.status, 200);
  const personalWorkspace = setup.data.result.workspace_id;
  workspaceIds.push(personalWorkspace);
  assert.equal(realtorPreferences.data.result.workspace_id, personalWorkspace);
  assert.equal(realtorPreferences.data.result.reminders_enabled, true, 'reminders are enabled only by explicit user choice');
  console.log('PASS: signed-in Supabase user provisions and reads a private personal realtor workspace');

  const sourcePropertyId = randomUUID();
  const sourceTaskId = randomUUID();
  const staleTaskId = randomUUID();
  const sourceTaskTitle = `Disposable property handoff ${randomUUID().slice(0, 8)}`;
  const staleTaskTitle = `Disposable stale handoff ${randomUUID().slice(0, 8)}`;
  const sourceMlsId = `PULSE-${randomUUID().slice(0, 8)}`;
  await sql(`
    INSERT INTO public.property_shortlist_entries(id,owner_id,area_key,address,city,state,mls_id,property_kind,revision,status)
    VALUES('${sourcePropertyId}','${primary.userId}','keller-westlake','100 Acceptance Way','Keller','TX','${sourceMlsId}','residential',1,'active');
    INSERT INTO public.sprint_backlog_items(id,owner_id,title,description,priority,estimate_minutes,status,source_type,source_id,
      property_id,property_task_kind,input_revision,dedupe_key)
    VALUES('${sourceTaskId}','${primary.userId}','${sourceTaskTitle}','Disposable browser acceptance task',2,30,'open',
      'property_shortlist','${sourceMlsId}','${sourcePropertyId}','draft_buyer_brief',1,'auth-${sourceTaskId}');
    INSERT INTO public.sprint_backlog_items(id,owner_id,title,description,priority,estimate_minutes,status,source_type,source_id,
      property_id,property_task_kind,input_revision,dedupe_key)
    VALUES('${staleTaskId}','${primary.userId}','${staleTaskTitle}','Disposable stale handoff fixture',2,20,'open',
      'property_shortlist','${sourceMlsId}-STALE','${sourcePropertyId}','verify_facts',1,'auth-${staleTaskId}');`);

  const billDueDate = offsetDate(4);
  const plannerItem = {
    kind: 'bill', title: 'Disposable acceptance dues', notes: 'Test-only planner row',
    due: { anchorDate: billDueDate, localTime: '09:00', timeZone: 'America/Chicago',
      recurrence: { frequency: 'once' }, endsOn: null, reminderOffsetsDays: [1] },
    expectedAmountCents: 18000, property: null, sourceSprintTaskId: null, requestKey: randomUUID(),
  };
  const plannerSave = await request(primary.page, '/api/realtor/planner', 'POST', {
    itemId: null, expectedRevision: null, item: plannerItem,
  });
  if (plannerSave.status !== 200) {
    const probe = await admin.rpc('realtor_save_planner_item', {
      p_actor_id: primary.userId, p_workspace_id: personalWorkspace, p_item_id: null,
      p_expected_revision: null, p_request_key: randomUUID(),
      p_item: { kind: plannerItem.kind, title: plannerItem.title, notes: plannerItem.notes,
        due: plannerItem.due, expectedAmountCents: plannerItem.expectedAmountCents, property: null },
      p_occurrences: [{ occurrenceKeyDate: billDueDate, effectiveDate: billDueDate,
        reminders: [{ offsetDays: 1, scheduledAt: new Date(Date.now() + 3 * 86400000).toISOString() }] }],
    });
    const probeRow = Array.isArray(probe.data) ? probe.data[0] : probe.data;
    console.error(`Direct disposable planner RPC diagnostic: ${probe.error?.code || 'success'} ${probe.error?.message || JSON.stringify(probeRow)}`);
  }
  assert.equal(plannerSave.status, 200, `Planner item save failed: ${plannerSave.data.error || plannerSave.status}`);
  const plannerRead = await request(primary.page,
    `/api/realtor/planner?from=${acceptanceToday}&through=${billDueDate}&status=pending&limit=1`);
  assert.equal(plannerRead.status, 200, `Planner read failed: ${plannerRead.data.error || plannerRead.status}`);
  assert(plannerRead.data.result.items.some((item) => item.title_snapshot === plannerItem.title),
    'authenticated planner read returns the saved occurrence');
  await primary.page.goto(`${origin}/planner`, { timeout: 120000 });
  await primary.page.getByRole('heading', { name: 'Planner', exact: true }).waitFor();
  await primary.page.getByText(plannerItem.title, { exact: true }).waitFor();
  console.log('PASS: a saved planner bill appears in both authenticated API reads and the rendered Planner page');

  const initialReadyTasks = await request(primary.page, '/api/realtor/planner/property-tasks');
  assert.equal(initialReadyTasks.status, 200, `Initial property task read failed: ${initialReadyTasks.data.error || initialReadyTasks.status}`);
  assert(initialReadyTasks.data.result.tasks.some((task) => task.id === sourceTaskId),
    `the seeded open property task should be ready to schedule; returned ${JSON.stringify(initialReadyTasks.data.result.tasks)}`);
  const sourceTaskCard = primary.page.getByText(sourceTaskTitle, { exact: true }).locator('xpath=../..');
  await sourceTaskCard.getByRole('button', { name: 'Use as planner draft' }).click();
  await primary.page.getByText(/Draft loaded from 100 Acceptance Way/).waitFor();
  const handoffDueDate = offsetDate(8);
  await primary.page.locator('form').getByLabel('First due date').fill(handoffDueDate);
  await primary.page.getByRole('button', { name: 'Save to planner' }).click();
  await primary.page.getByText('Planner item saved and linked. The source sprint task remains unchanged.').waitFor();
  const readyTasks = await request(primary.page, '/api/realtor/planner/property-tasks');
  assert.equal(readyTasks.status, 200, `Property task refresh failed: ${readyTasks.data.error || readyTasks.status}`);
  assert(!readyTasks.data.result.tasks.some((task) => task.id === sourceTaskId),
    'a successfully scheduled source task leaves the ready-to-schedule response');
  assert.equal(await sql(`SELECT status FROM public.sprint_backlog_items WHERE id='${sourceTaskId}';`), 'open',
    'planner handoff preserves the source sprint task status');
  assert.equal(await sql(`SELECT source_sprint_task_id FROM public.realtor_planner_items WHERE user_id='${primary.userId}' AND workspace_id='${personalWorkspace}' AND source_sprint_task_id='${sourceTaskId}';`), sourceTaskId,
    'the personal planner item retains its source task identity');
  console.log('PASS: property sprint task is selected, dated and saved in Planner; it leaves the ready list while its source task stays open');

  const staleTaskCard = primary.page.getByText(staleTaskTitle, { exact: true }).locator('xpath=../..');
  await staleTaskCard.getByRole('button', { name: 'Use as planner draft' }).click();
  await primary.page.getByText(new RegExp(`Draft loaded from 100 Acceptance Way`)).waitFor();
  const staleDraftDueDate = offsetDate(12);
  await primary.page.waitForFunction((title) => Array.from(document.querySelectorAll('form input')).some((input) => input.value === title), staleTaskTitle);
  await primary.page.locator('form').getByLabel('First due date').fill(staleDraftDueDate);
  const staleFormValidation = await primary.page.locator('form').evaluate((form) => ({
    valid: form.checkValidity(),
    invalidFields: Array.from(form.querySelectorAll(':invalid')).map((field) => ({
      label: field.getAttribute('aria-label') || field.getAttribute('name') || field.getAttribute('type'),
      value: field.value,
    })),
  }));
  assert(staleFormValidation.valid, `the selected stale task should remain submittable: ${JSON.stringify(staleFormValidation.invalidFields)}`);
  await sql(`UPDATE public.property_shortlist_entries SET revision=revision+1 WHERE id='${sourcePropertyId}' AND owner_id='${primary.userId}';`);
  const plannerRequests = [];
  const plannerResponses = [];
  primary.page.on('request', (request) => {
    if (request.url().includes('/api/realtor/planner')) plannerRequests.push({ url: request.url(), method: request.method() });
  });
  primary.page.on('response', (response) => {
    if (response.url().includes('/api/realtor/planner')) plannerResponses.push(response);
  });
  const staleSaveButton = primary.page.getByRole('button', { name: 'Save to planner' });
  assert(await staleSaveButton.isEnabled(), 'planner save remains enabled for a valid stale-task draft');
  await staleSaveButton.click();
  await delay(1500);
  assert(plannerRequests.some((entry) => entry.method === 'POST'),
    `saving a valid property-task draft should send the planner mutation; observed ${JSON.stringify(plannerRequests)}`);
  const staleSaveResponse = plannerResponses.find((response) => response.request().method() === 'POST');
  if (!staleSaveResponse) {
    const activeQueries = await sql(`SELECT COALESCE(string_agg(pid||':'||COALESCE(wait_event_type,'')||':'||COALESCE(wait_event,'')||':'||left(query,220),E'\n'),'none')
      FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND state='active'
      AND query NOT ILIKE '%pg_stat_activity%';`);
    assert.fail(`planner mutation did not return an HTTP response; requests=${JSON.stringify(plannerRequests)} activeDbQueries=${activeQueries}`);
  }
  const staleSaveBody = await staleSaveResponse.json();
  assert.equal(staleSaveResponse.status(), 409,
    `a changed property must reject the planner handoff with a conflict, received ${staleSaveResponse.status()}: ${JSON.stringify(staleSaveBody)}`);
  const conflictAlert = primary.page.getByRole('alert').filter({ hasText: /changed.*reload|stale/i });
  await conflictAlert.waitFor();
  const conflictMessage = await conflictAlert.innerText();
  assert.match(conflictMessage, /changed|stale|reload/i, `stale source-task save should explain the conflict: ${conflictMessage}`);
  await conflictAlert.getByRole('button', { name: 'Refresh latest planner data' }).waitFor();
  assert.equal(await primary.page.locator('form').getByLabel('What is it called?').inputValue(), staleTaskTitle,
    'the rejected stale save keeps the selected task title as an unsaved draft');
  assert.equal(await primary.page.locator('form').getByLabel('First due date').inputValue(), staleDraftDueDate,
    'the rejected stale save keeps the user-entered due date');
  await conflictAlert.getByRole('button', { name: 'Refresh latest planner data' }).click();
  const stalePropertyTaskCard = primary.page.getByText(staleTaskTitle, { exact: true }).locator('xpath=../..');
  await stalePropertyTaskCard.getByText('The property has changed since this task was prepared.').waitFor();
  assert.equal(await primary.page.locator('form').getByLabel('What is it called?').inputValue(), staleTaskTitle,
    'refreshing current property-task data preserves the draft title');
  assert.equal(await primary.page.locator('form').getByLabel('First due date').inputValue(), staleDraftDueDate,
    'refreshing current property-task data preserves the entered due date');
  assert(await stalePropertyTaskCard.getByRole('button', { name: 'Use as planner draft' }).isDisabled(),
    'a stale property task cannot be selected again after refresh');
  const staleTasks = await request(primary.page, '/api/realtor/planner/property-tasks');
  assert.equal(staleTasks.status, 200);
  assert(staleTasks.data.result.tasks.find((task) => task.id === staleTaskId)?.stale,
    'the ready-task API marks the changed-property task stale');
  assert.equal(await sql(`SELECT status FROM public.sprint_backlog_items WHERE id='${staleTaskId}';`), 'open',
    'stale rejection leaves the source task untouched');
  assert.equal(await sql(`SELECT count(*) FROM public.realtor_planner_items WHERE user_id='${primary.userId}' AND workspace_id='${personalWorkspace}' AND source_sprint_task_id='${staleTaskId}';`), '0',
    'a rejected stale handoff creates no linked planner record');
  console.log('PASS: stale-property handoff is rejected; refresh preserves draft title/date, flags and disables the stale task, and creates no planner link');

  const financeWrites = [
    { amountCents: 12500, paidDate: acceptanceToday, category: 'software', payee: 'Acceptance fixture', note: '', occurrenceId: null, requestKey: randomUUID() },
    { mode: 'gross', grossCents: 200000, deductions: [{ kind: 'broker_split', label: 'Acceptance split', amountCents: 40000 }], receivedDate: acceptanceToday, closingReference: 'auth-acceptance', property: null, memo: '', requestKey: randomUUID() },
    { estimatedTakeHomeCents: 80000, expectedDate: offsetDate(30), label: 'Acceptance pending income', property: null, requestKey: randomUUID() },
  ];
  for (const entry of financeWrites) {
    const response = await request(primary.page, '/api/realtor/financial-records', 'POST', entry);
    assert.equal(response.status, 200, `Financial record write failed: ${response.data.error || response.status}`);
  }
  const year = Number(acceptanceToday.slice(0, 4));
  const allFinancialIds = [];
  let cursor = null;
  for (let pageNumber = 0; pageNumber < 5; pageNumber += 1) {
    const query = new URLSearchParams({ year: String(year), limit: '1' });
    if (cursor) query.set('cursor', cursor);
    const response = await request(primary.page, `/api/realtor/financial-records?${query}`);
    assert.equal(response.status, 200, `Financial page failed: ${response.data.error || response.status}`);
    allFinancialIds.push(...response.data.result.entries.map((entry) => entry.id));
    cursor = response.data.result.nextCursor;
    if (!cursor) break;
    assert(pageNumber < 4, 'financial ledger cursor must terminate within the bounded fixture size');
  }
  assert.equal(allFinancialIds.length, 3, 'keyset pagination reaches all three financial records');
  assert.equal(new Set(allFinancialIds).size, 3, 'keyset pagination returns no duplicate financial records');
  const summary = await request(primary.page, `/api/realtor/business-summary?year=${year}`);
  assert.equal(summary.status, 200, `Business summary failed: ${summary.data.error || summary.status}`);
  const csv = await primary.page.evaluate(async (path) => {
    const response = await fetch(path);
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { status: response.status, type: response.headers.get('content-type'),
      hasUtf8Bom: bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf,
      text: new TextDecoder('utf-8').decode(bytes) };
  }, `/api/realtor/financial-records/export?year=${year}`);
  assert.equal(csv.status, 200, 'authenticated ledger CSV export succeeds');
  assert.match(csv.type || '', /text\/csv/i);
  assert(csv.hasUtf8Bom, 'CSV export retains UTF-8 BOM bytes');
  assert(csv.text.startsWith('"currency","date","record_kind"'), 'CSV export retains stable ledger columns');
  assert(allFinancialIds.every((id) => csv.text.includes(id)),
    'CSV includes every paginated expense, received commission, and expected-income record by ID');
  console.log('PASS: real-auth ledger pagination exhausts without duplicates; summary and CSV export are readable');
  if (process.argv.includes('--homepage')) await homepageBrowserAcceptance(browser, origin, artifacts);
  if (!realtorOnly) {
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
  const runDetail=await request(primary.page,`${base}/runs/${run.id}`);assert.equal(runDetail.status,200);
  const checkpoint=runDetail.data.result.checkpoints[0];assert.equal(checkpoint.run_id,run.id);
  const answered=await request(primary.page,base+'/checkpoints','POST',{checkpointId:checkpoint.id,expectedRevision:checkpoint.revision,submissionKey:randomUUID(),value:'Keller / Westlake'});
  assert.equal(answered.status,200);await tick(run.id,2);
  assert.equal(await sql(`SELECT status FROM platform_runs WHERE id='${run.id}';`),'completed');

  // Exercise the reviewed app fixtures through real local Supabase browser
  // sessions and the authenticated HTTP routes. The users are temporary local
  // acceptance identities; this proves auth/role plumbing, not pilot adoption.
  const member=await login(), reviewer=await login();
  async function inviteThroughOwner(email,role){
    await primary.page.goto(`${origin}/workspaces/${workspace}/access`,{timeout:120000});
    await primary.page.getByRole('heading',{name:'People and invitations'}).waitFor();
    await primary.page.getByLabel('Their account email').fill(email);
    await primary.page.getByLabel('Workspace role').selectOption(role);
    await primary.page.getByRole('button',{name:'Create invite link'}).click();
    await primary.page.getByRole('status').filter({hasText:'Delivery was not sent'}).waitFor();
    const link=await primary.page.getByLabel('One-time invitation link').inputValue();
    assert.equal(new URL(link).hash.length>1,true,'invitation bearer token is carried only in the fragment');
    assert.equal(new URL(link).search,'','invitation bearer token is not placed in the query string');
    return link;
  }
  async function acceptInBrowser(session,link,role){
    console.log(`Checking invitation for local ${role} fixture ${session.userId.slice(0,8)}.`);
    await session.page.goto(link,{timeout:120000});
    session.page.on('response',response=>{if(response.url().endsWith('/api/workspace-invitations/accept'))console.log(`Invitation API returned HTTP ${response.status()} for local ${role} fixture.`);});
    const confirm=session.page.getByRole('button',{name:'Confirm and join workspace'});
    await confirm.waitFor();
    try{await session.page.waitForFunction(()=>window.location.hash==='',null,{timeout:15000});}
    catch(error){
      const state=await session.page.evaluate(()=>({path:location.pathname,hashLength:location.hash.length,buttonDisabled:document.querySelector('button')?.disabled}));
      console.error('Invitation fragment-removal diagnostics:',JSON.stringify(state),session.pageErrors.join('; '));throw error;
    }
    assert.equal(new URL(session.page.url()).hash,'','acceptance page removes the token fragment from the address bar');
    const acceptanceResponse=session.page.waitForResponse(response=>response.url().endsWith('/api/workspace-invitations/accept')&&response.request().method()==='POST');
    await confirm.click();
    assert.equal((await acceptanceResponse).status(),200,'the existing server endpoint accepts only after explicit confirmation');
    try{await session.page.waitForURL(`${origin}/workspaces/${workspace}/inbox`,{timeout:60000});}
    catch(error){
      const state=await session.page.evaluate(()=>({path:location.pathname,alerts:[...document.querySelectorAll('[role="alert"]')].map((node)=>node.textContent),buttonDisabled:document.querySelector('button')?.disabled}));
      console.error('Invitation navigation diagnostics:',JSON.stringify(state));throw error;
    }
    assert.equal(await sql(`SELECT role FROM platform_memberships WHERE workspace_id='${workspace}' AND user_id='${session.userId}' AND status='active';`),role);
  }
  const memberInvite=await inviteThroughOwner(member.email,'member');
  await acceptInBrowser(member,memberInvite,'member');
  await reviewer.page.goto(memberInvite,{timeout:120000});
  await reviewer.page.getByRole('button',{name:'Confirm and join workspace'}).click();
  await reviewer.page.getByRole('alert').filter({hasText:'not valid for this signed-in account'}).waitFor();
  assert.equal(await sql(`SELECT status||':'||accepted_by::text FROM platform_workspace_invitations WHERE workspace_id='${workspace}' AND email='${member.email}';`),`accepted:${member.userId}`,
    'wrong-account replay cannot change the rightful invite acceptance');
  const reviewerInvite=await inviteThroughOwner(reviewer.email,'reviewer');
  await acceptInBrowser(reviewer,reviewerInvite,'reviewer');
  console.log('PASS: owner creates manual member/reviewer invite links; wrong email is denied; invited accounts explicitly accept through real browser sessions');
  const readiness=JSON.parse(await readFile(new URL('../lib/platform/apps/manifests/real-estate-readiness.v1.json',import.meta.url),'utf8'));
  const content=JSON.parse(await readFile(new URL('../lib/platform/apps/manifests/client-content-review.v1.json',import.meta.url),'utf8'));
  assert.equal(readiness.capabilities.length,0);assert.equal(content.capabilities.length,0);
  const saveInstall=async(manifest,settings)=>{
    const response=await request(primary.page,base+'/apps','POST',{manifest,settings,status:'installed',expectedRevision:null});
    assert.equal(response.status,200,`Install ${manifest.key} failed: ${response.data.error || response.status}`);
    return response.data.result;
  };
  const readinessInstall=await saveInstall(readiness,{area:'keller-westlake'});
  const contentInstall=await saveInstall(content,{review_mode:'human_review'});
  const memberInstall=await request(member.page,base+'/apps','POST',{manifest:readiness,settings:{area:'keller-westlake'},status:'installed',expectedRevision:null});
  assert.equal(memberInstall.status,403,'members cannot install or modify workspace app configuration');
  const installedList=await request(primary.page,base+'/apps');
  assert.equal(installedList.status,200);assert.equal(installedList.data.result.length,2,'denied install must not change the installed app set');
  const propertyId=randomUUID();
  await sql(`INSERT INTO property_shortlist_entries(id,owner_id,area_key,address,city,state,property_kind,revision,status)
    VALUES('${propertyId}','${primary.userId}','keller-westlake','1 Acceptance Way','Keller','TX','residential',1,'active');
    INSERT INTO platform_scope_links(resource_type,resource_id,owner_id,workspace_id,status,source_revision)
    VALUES('property_shortlist','${propertyId}','${primary.userId}','${workspace}','mapped',1);`);
  const launch=async(page,install,workflowKey,inputs,resourceRefs=[])=>{
    const response=await request(page,base+'/apps/launch','POST',{installId:install.id,expectedInstallRevision:install.revision,
      workflowKey,requestKey:randomUUID(),inputs,resourceRefs});
    return response;
  };
  const propertyRun=await launch(member.page,readinessInstall,'readiness-intake',{property_id:propertyId},[
    {resourceType:'property_shortlist',resourceId:propertyId,expectedRevision:1},
  ]);
  assert.equal(propertyRun.status,200,`Member launch failed: ${propertyRun.data.error || propertyRun.status}`);
  const contentRun=await launch(member.page,contentInstall,'review-intake',{revision_id:'local-review-revision-1'});
  assert.equal(contentRun.status,200,`Member content launch failed: ${contentRun.data.error || contentRun.status}`);
  const reviewerStart=await launch(reviewer.page,contentInstall,'review-intake',{revision_id:'reviewer-must-not-start'});
  assert.equal(reviewerStart.status,403,'reviewer must not initiate app runs');
  async function respondToAppRun(requesterId,page,runId,nodeId,value){
    await tickAs(requesterId,runId,1);
    const runDetail=await request(page,`${base}/runs/${runId}`);
    assert.equal(runDetail.status,200,`Run detail failed: ${runDetail.data.error || runDetail.status}`);
    const checkpoint=runDetail.data.result.checkpoints.find((item)=>item.run_id===runId);
    assert(checkpoint,`Missing ${nodeId} checkpoint for app run ${runId}`);
    assert.equal(checkpoint.node_id,nodeId);
    const response=await request(page,base+'/checkpoints','POST',{checkpointId:checkpoint.id,
      expectedRevision:checkpoint.revision,submissionKey:randomUUID(),value});
    assert.equal(response.status,200,`Checkpoint response failed: ${response.data.error || response.status}`);
    await tickAs(requesterId,runId,2);
    assert.equal(await sql(`SELECT status FROM platform_runs WHERE id='${runId}';`),'completed');
    return checkpoint;
  }
  async function tickAs(actorId,runId,generation){
    const token=randomUUID();
    await sql(`UPDATE workflow_jobs SET status='running',lease_token='${token}',lease_until=clock_timestamp()+interval '1 minute'
      WHERE user_id='${actorId}' AND workflow_key='platform_run' AND payload->>'runId'='${runId}'
        AND payload->>'generation'='${generation}' AND status='queued';
      SELECT run_status FROM platform_tick_run((SELECT id FROM workflow_jobs WHERE user_id='${actorId}'
        AND payload->>'runId'='${runId}' AND payload->>'generation'='${generation}'),'${token}');`);
  }
  const propertyCheckpoint=await respondToAppRun(member.userId,member.page,propertyRun.data.result.id,'missing_fact','Confirm the property details before further research.');
  const contentCheckpoint=await respondToAppRun(member.userId,reviewer.page,contentRun.data.result.id,'review_notes','Clarify the source date before any client-facing use.');
  assert.equal(await sql(`SELECT app_manifest_hash=(SELECT manifest_hash FROM platform_app_installs WHERE id='${readinessInstall.id}')
    AND app_resource_refs @> jsonb_build_array(jsonb_build_object('resourceType','property_shortlist','resourceId','${propertyId}','expectedRevision',1))
    FROM platform_runs WHERE id='${propertyRun.data.result.id}';`),'t','property app run keeps its install and source-revision pins');
  assert.equal(await sql(`SELECT resolved_by::text FROM platform_checkpoints WHERE id='${contentCheckpoint.id}';`),reviewer.userId);
  assert.equal(await sql(`SELECT response#>>'{}' FROM platform_checkpoints WHERE id='${propertyCheckpoint.id}';`),'Confirm the property details before further research.');
  assert.equal(await sql(`SELECT response#>>'{}' FROM platform_checkpoints WHERE id='${contentCheckpoint.id}';`),'Clarify the source date before any client-facing use.');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_audit_events WHERE workspace_id='${workspace}'
    AND action='checkpoint.resolved' AND actor_id='${reviewer.userId}' AND resource_id='${contentCheckpoint.id}';`),'1');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_runs WHERE id IN ('${propertyRun.data.result.id}','${contentRun.data.result.id}')
    AND status='completed' AND app_manifest_hash IS NOT NULL;`),'2');
  console.log('PASS: authenticated browser sessions install and launch both inert apps; member intake and reviewer response are attributed, pinned and completed');

  await primary.page.goto(`${origin}/workspaces/${workspace}/access`,{timeout:120000});
  const memberRpc=await admin.rpc('platform_list_workspace_members',{p_actor_id:primary.userId,p_workspace_id:workspace});
  assert.equal(memberRpc.error,null,'owner-authorized member-list RPC returns its declared row shape');
  assert.equal(memberRpc.data?.length,3,'member list includes owner, member and reviewer');
  const accessSnapshot=await request(primary.page,base+'/members');
  assert.equal(accessSnapshot.status,200,`Members endpoint failed: ${accessSnapshot.data.error||accessSnapshot.status}`);
  assert.deepEqual(accessSnapshot.data.result.map((row)=>row.role),['owner','member','reviewer']);
  const memberRow=primary.page.locator('li').filter({hasText:'member · active'});
  await memberRow.getByRole('button',{name:'Revoke access'}).waitFor();
  primary.page.once('dialog',dialog=>dialog.accept());
  await memberRow.getByRole('button',{name:'Revoke access'}).click();
  await primary.page.getByRole('status').filter({hasText:'Workspace access revoked'}).waitFor();
  assert.equal(await sql(`SELECT status FROM platform_memberships WHERE workspace_id='${workspace}' AND user_id='${member.userId}';`),'revoked');
  assert.equal((await request(member.page,base+'/runs')).status,404,'revoked invitee loses subsequent workspace API access');
  console.log('PASS: owner revokes an active member from the rendered access page; revoked member immediately loses workspace API access');

  const pending=await start();await tick(pending.id,1);
  const canvasPageErrors=[];primary.page.on('pageerror',(error)=>canvasPageErrors.push(error.message));
  await primary.page.goto(`${origin}/workspaces/${workspace}/canvas`,{timeout:120000});
  await primary.page.getByRole('heading',{name:'Your canvas',exact:true}).waitFor();
  await primary.page.getByRole('region',{name:'Workspace command palette'}).waitFor();
  await primary.page.getByRole('link',{name:'Open the standard inbox view'}).waitFor();
  assert.equal(await primary.page.locator('[data-nextjs-dialog]').count(),0,'canvas has no Next.js error overlay');
  assert((await primary.page.locator('body').innerText()).trim().length>100,'canvas renders meaningful page content');
  await primary.page.screenshot({path:artifacts+'canvas.png'});
  await primary.page.getByRole('button',{name:'Save layout'}).click();
  await primary.page.getByText('Canvas saved for your account in this workspace.').waitFor();
  let savedLayout=(await request(primary.page,base+'/layout')).data.result;
  assert.equal(savedLayout.revision,1,'first canvas save creates a revisioned private layout');
  await primary.page.getByLabel('Choose a read-only monitor').selectOption('connectors');
  await primary.page.getByRole('button',{name:'Add monitor'}).click();
  await primary.page.getByRole('button',{name:'Save layout'}).click();
  await primary.page.getByText('Canvas saved for your account in this workspace.').waitFor();
  const monitorRegion=primary.page.getByRole('region',{name:'Canvas window: System monitor · connectors'});
  await monitorRegion.scrollIntoViewIfNeeded();await monitorRegion.waitFor();
  await monitorRegion.getByText('No connector health records yet.').waitFor();
  savedLayout=(await request(primary.page,base+'/layout')).data.result;
  const monitor=savedLayout.layout.windows.find((item)=>item.window.kind==='system_monitor');
  assert(monitor,'connector monitor window persists in the private layout');
  await primary.page.getByRole('button',{name:'Move System monitor · connectors right'}).click();
  await primary.page.getByText('Canvas saved for your account in this workspace.').waitFor();
  savedLayout=(await request(primary.page,base+'/layout')).data.result;
  const movedMonitor=savedLayout.layout.windows.find((item)=>item.window.id===monitor.window.id);
  assert.equal(movedMonitor.x,monitor.x+40,'keyboard move control persists the new monitor position');

  const command=primary.page.getByRole('textbox',{name:'Workspace command'});
  await command.fill('/ps');await primary.page.getByRole('button',{name:'Preview'}).click();
  await primary.page.getByText('Recent runs · first 25').waitFor();
  await command.fill(':focus inbox');await primary.page.getByRole('button',{name:'Preview'}).click();
  await primary.page.getByRole('button',{name:'Confirm focus'}).click();
  await command.fill(`:focus run ${pending.id}`);await primary.page.getByRole('button',{name:'Preview'}).click();
  await primary.page.getByRole('button',{name:'Confirm focus'}).click();
  await primary.page.getByText('Canvas focus updated. No workflow state changed.').waitFor();
  const focusedLayout=(await request(primary.page,base+'/layout')).data.result;
  const pendingWindow=focusedLayout.layout.windows.find((item)=>item.window.kind==='run_graph'&&item.window.target.runId===pending.id);
  assert(pendingWindow,'focus-run opens the verified workspace run and saves its window');

  await command.fill(`:close ${monitor.window.id}`);await primary.page.getByRole('button',{name:'Preview'}).click();
  await primary.page.getByRole('button',{name:'Confirm close window'}).click();
  await primary.page.getByText('Window closed in your private canvas.').waitFor();
  savedLayout=(await request(primary.page,base+'/layout')).data.result;
  assert(!savedLayout.layout.windows.some((item)=>item.window.id===monitor.window.id));

  await command.fill(':reset-layout');await primary.page.getByRole('button',{name:'Preview'}).click();
  await primary.page.getByRole('button',{name:'Confirm reset layout'}).click();
  await primary.page.getByText('Your private canvas layout was reset.').waitFor();
  savedLayout=(await request(primary.page,base+'/layout')).data.result;
  assert.equal(savedLayout.layout.windows.length,1);assert.equal(savedLayout.layout.windows[0].window.kind,'checkpoint_inbox');
  const stale=await request(primary.page,base+'/layout','PUT',{layout:savedLayout.layout,expectedRevision:savedLayout.revision-1});
  assert.equal(stale.status,409,'canvas rejects stale layout writes after reset');

  let commandLaunchId;
  primary.page.on('response',async(response)=>{
    if(response.url().endsWith(base+'/apps/launch')&&response.request().method()==='POST'&&response.ok()){
      const body=await response.json();commandLaunchId=body.result?.id||body.result?.run_id||body.result?.runId;
    }
  });
  await command.fill('/start real-estate-readiness@1');await primary.page.getByRole('button',{name:'Preview'}).click();
  await primary.page.getByLabel(/Shortlist property ID/).fill(propertyId);
  await primary.page.getByRole('button',{name:'Confirm and launch'}).click();
  await primary.page.getByText('Run started and added to your canvas. Save layout to keep its window.').waitFor();
  assert.match(commandLaunchId,/^[a-f0-9-]{36}$/i,'confirmed command start returns a server-created run ID');
  await primary.page.getByRole('button',{name:'Save layout'}).click();
  await primary.page.getByText('Canvas saved for your account in this workspace.').waitFor();
  const launchedRegion=primary.page.getByRole('region',{name:new RegExp(`Canvas window: Run ${commandLaunchId}`)});
  await launchedRegion.scrollIntoViewIfNeeded();await launchedRegion.waitFor();
  await command.fill(`/cancel ${commandLaunchId}`);await primary.page.getByRole('button',{name:'Preview'}).click();
  await primary.page.getByRole('button',{name:'Confirm cancel'}).click();
  await primary.page.getByText('Cancellation request accepted by the workspace run API.').waitFor();
  const cancelled=await request(primary.page,`${base}/runs/${commandLaunchId}`);
  assert.equal(cancelled.status,200);assert.equal(cancelled.data.result.run.status,'cancelled');
  await primary.page.getByRole('link',{name:'Open the standard inbox view'}).click();
  await primary.page.waitForURL(`${origin}/workspaces/${workspace}/inbox`);
  assert.equal(await primary.page.getByRole('heading',{name:'Review and organize'}).count(),1,'standard inbox fallback remains reachable');
  assert.equal(canvasPageErrors.length,0,`Canvas browser errors: ${canvasPageErrors.join('; ')}`);
  console.log('PASS: signed-in canvas browser flow saves/restores private layout, reads bounded monitors, previews/confirms commands, rejects stale revisions and retains the inbox fallback');

  const first=await request(primary.page,base+'/runs?limit=1');assert(first.data.result.nextCursor);
  const second=await request(primary.page,base+'/runs?limit=1&cursor='+first.data.result.nextCursor);
  assert.notEqual(first.data.result.items[0].id,second.data.result.items[0].id);
  await primary.page.goto(origin+base+'/runs?limit=1');await primary.page.screenshot({path:artifacts+'runs.png'});
  const outsider=await login();
  assert.equal((await request(outsider.page,base+'/runs')).status,404);
  await sql(`INSERT INTO platform_memberships(workspace_id,user_id,role,status) VALUES('${workspace}','${outsider.userId}','member','active');`);
  assert.equal((await request(outsider.page,base+'/runs')).status,200);
  await sql(`UPDATE platform_memberships SET status='revoked' WHERE workspace_id='${workspace}' AND user_id='${outsider.userId}';`);
  assert.equal((await request(outsider.page,base+'/runs')).status,404,'Revoked membership must lose workspace access');
  await sql(`UPDATE platform_workspaces SET status='archived', revision=revision+1 WHERE id='${workspace}';`);
  assert.equal((await request(primary.page,base+'/runs')).status,404,'Archived workspace must lose run access');
  // Independently prove real JWT RLS, not just the server-side guard.
  const signed=createClient(api,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error:authError}=await signed.auth.signInWithPassword({email:outsider.email,password:outsider.password});assert(!authError);
  const {data:foreignRows,error:readError}=await signed.from('platform_runs').select('id').eq('workspace_id',workspace);
  assert(!readError);assert.deepEqual(foreignRows,[]);
  console.log('PASS: browser cookie APIs start → checkpoint → answer → complete, cancel, cursor pages, revocation, archive and foreign-user denial; real JWT RLS denies foreign rows');
  console.log(`Browser evidence: ${artifacts}`);
  }
  }
  }catch(error){
  // Server logs may contain account identifiers but no credentials are printed
  // by this runner. Keep failure output limited to the assertion boundary.
  console.error('Real-auth acceptance stopped:',error.stack||error.message);process.exitCode=1;
}finally{
  await browser?.close();
  if(server && server.exitCode===null){
    if(process.platform==='win32') await command('taskkill',['/PID',String(server.pid),'/T','/F']);
    else server.kill();
    await delay(1000);
  }
  for(const agentId of sellerFixtureAgents){
    assert.match(agentId,/^seller-acceptance-[a-f0-9-]{36}$/);
    await sql(`BEGIN;
      DELETE FROM public.agent_site_leads WHERE agent_id='${agentId}';
      DELETE FROM public.site_config WHERE agent_id='${agentId}'; COMMIT;`);
  }
  if(!sellerVideoOnly) for(const workspace of workspaceIds){
    assert.match(workspace,/^[a-f0-9-]{36}$/);
    await sql(`BEGIN;
      DELETE FROM workflow_results WHERE job_id IN (SELECT id FROM workflow_jobs WHERE payload->>'workspaceId'='${workspace}');
      DELETE FROM workflow_jobs WHERE payload->>'workspaceId'='${workspace}';
      DELETE FROM platform_checkpoints WHERE workspace_id='${workspace}';
      DELETE FROM platform_runs WHERE workspace_id='${workspace}';
      DELETE FROM platform_app_installs WHERE workspace_id='${workspace}';
      DELETE FROM realtor_preferences WHERE workspace_id='${workspace}';
      DELETE FROM platform_workspaces WHERE id='${workspace}'; COMMIT;`);
  }
  if(!sellerVideoOnly) for(const id of userIds){const {error}=await admin.auth.admin.deleteUser(id);if(error)throw new Error('Unable to remove temporary local Auth account.');}
  await sql(`UPDATE workflow_event_contracts SET enabled=${enabled==='t'?'true':'false'} WHERE workflow_key='platform_run';`);
  console.log(sellerVideoOnly
    ? 'Retained test rows only inside the generated disposable project; its teardown removes them and all local Auth accounts.'
    : 'Removed temporary local accounts/workspace; restored admission flag. Applied local migrations are retained.');
}
