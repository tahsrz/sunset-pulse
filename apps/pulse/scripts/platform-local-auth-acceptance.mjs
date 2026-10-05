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
assert(!(realtorOnly&&sellerVideoOnly),'Choose only one focused acceptance suite.');
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
const userIds=[], workspaceIds=[];
let server,browser;
const acceptanceMongo = process.env.PULSE_TEST_MONGO_URI || '';
if (acceptanceMongo) assert.match(acceptanceMongo, /^mongodb:\/\/127\.0\.0\.1:\d+\/pulse_homepage_acceptance$/);
try{
  await sql("UPDATE workflow_event_contracts SET enabled=true WHERE workflow_key='platform_run';");
  server=spawn(process.execPath,[fileURLToPath(new URL('../../../node_modules/next/dist/bin/next',import.meta.url)),'dev','--hostname','127.0.0.1','--port',String(originUrl.port || 80)],{
    cwd:pulseRoot,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_ENV:'development',
      NEXT_PUBLIC_SUPABASE_URL:api,SUPABASE_URL:api,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:service,
      NEXT_PUBLIC_MOCK_MODE:'false',NEXT_PUBLIC_PULSE_MOCK_AUTH_ENABLED:'false',PULSE_ALLOW_PRODUCTION_MOCK_AUTH:'',
      E2E_OPERATOR_ACCESS:'false',NEXT_PUBLIC_E2E_MODE:'false',JAMIE_PUBLIC_GUIDE_E2E_FIXTURE:'false',
      OPENAI_API_KEY:'',GROQ_API_KEY:'',NEXT_PUBLIC_SITE_URL:origin,NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN:origin,
      // Homepage reads legacy listing/config stores; only the disposable runner
      // may supply its Mongo URI. Never inherit a hosted connection.
      MONGODB_URI:acceptanceMongo || 'mongodb://127.0.0.1:1/pulse_auth_unavailable',
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
    const loginTarget=sellerVideoOnly?'/api/realtor/preferences':realtorOnly?'/api/realtor/preferences':'/api/workspaces';
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
  if (sellerVideoOnly) {
    const created = await request(primary.page, '/api/workspaces', 'POST', { kind: 'personal', name: 'Seller video browser acceptance' });
    assert.equal(created.status, 201, `Real-auth workspace creation failed: ${created.data.error || created.status}`);
    const workspace = created.data.workspaceId;
    workspaceIds.push(workspace);
    const task = await request(primary.page, '/api/sprints', 'POST', {
      action: 'add_backlog_item', workspaceId: workspace,
      title: 'Acceptance video brief task', description: 'Disposable browser-only fixture', priority: 2,
      estimateMinutes: 30, sourceType: 'manual', sourceId: `auth-${randomUUID()}`,
    });
    assert.equal(task.status, 201, `Real-auth backlog creation failed: ${task.data.error || task.status}`);
    await primary.page.goto(`${origin}/sprints`);
    await primary.page.getByRole('heading', { name: 'Shape a short-form video brief' }).waitFor();
    await primary.page.getByLabel('Seller video workspace').selectOption(workspace);
    await primary.page.reload();
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
    await sql(`UPDATE platform_memberships SET role='viewer',revision=revision+1 WHERE workspace_id='${workspace}' AND user_id='${outsider.userId}';`);
    assert.equal((await request(outsider.page, '/api/seller-video-briefs', 'POST', { workspaceId: workspace, brief: nonWriterDraft })).status, 403,
      'a real authenticated viewer cannot save creator-only drafts');
    await outsider.page.reload();
    await outsider.page.getByText('Your workspace role can view drafts but cannot create or save them.').waitFor();
    assert.equal(await outsider.page.getByRole('button', { name: 'Save private draft' }).count(), 0);
    assert.equal(primary.pageErrors.length, 0, `Browser errors: ${primary.pageErrors.join('; ')}`);
    assert.equal(outsider.pageErrors.length, 0, `Outsider browser errors: ${outsider.pageErrors.join('; ')}`);
    console.log('PASS: real Supabase browser sessions create, save and read a private workspace video draft linked to a revision-fenced backlog task; a different authenticated user is denied.');
    console.log('PASS: draft remains unreviewed and no publication or send action is exposed.');
  }
  if (!sellerVideoOnly) {
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
