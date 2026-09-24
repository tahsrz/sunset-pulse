import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function platformFollowupAcceptance(sql) {
  const owner=randomUUID(), admin=randomUUID(), member=randomUUID(), reviewer=randomUUID(), foreign=randomUUID(), workspace=randomUUID(), other=randomUUID();
  const json=(v)=>`'${JSON.stringify(v).replaceAll("'","''")}'::jsonb`;
  await sql(`INSERT INTO auth.users(id) VALUES('${owner}'),('${admin}'),('${member}'),('${reviewer}'),('${foreign}');
    SELECT workspace_id FROM platform_create_workspace_with_owner('${owner}','${workspace}','team','Followup fixture');
    SELECT workspace_id FROM platform_create_workspace_with_owner('${owner}','${other}','team','Other fixture');
    INSERT INTO platform_memberships(workspace_id,user_id,role,status) VALUES
      ('${workspace}','${admin}','admin','active'),('${workspace}','${member}','member','active'),('${workspace}','${reviewer}','reviewer','active');`);
  const layoutFor=(actor,x=20)=>({schemaVersion:1,workspaceId:workspace,viewport:{x:0,y:0,zoom:1},windows:[{
    window:{id:randomUUID(),kind:'run_graph',target:{workspaceId:workspace,runId:randomUUID()}},x,y:30,width:720,height:520,zIndex:1,
  }]});
  let ownerLayout=layoutFor(owner);
  assert.equal(await sql(`SELECT revision FROM platform_save_user_layout('${owner}','${workspace}',${json(ownerLayout)},NULL);`),'1');
  assert.equal(await sql(`SELECT revision FROM platform_save_user_layout('${owner}','${workspace}',${json(ownerLayout)},NULL);`),'1','initial create replay is idempotent');
  const memberLayout=layoutFor(member,45);
  assert.equal(await sql(`SELECT revision FROM platform_save_user_layout('${member}','${workspace}',${json(memberLayout)},NULL);`),'1');
  const privateLayoutCount=(actor)=>sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${actor}'; SELECT count(*) FROM platform_user_layouts WHERE workspace_id='${workspace}'; COMMIT;`);
  assert.equal(await privateLayoutCount(owner),'1','owner sees only their own layout');
  assert.equal(await privateLayoutCount(member),'1','member sees only their own layout');
  assert.equal(await privateLayoutCount(foreign),'0','foreign user cannot read workspace layouts');
  await assert.rejects(sql(`SELECT revision FROM platform_save_user_layout('${owner}','${workspace}',${json({...ownerLayout,workspaceId:other})},NULL);`),/Invalid canvas layout/);
  await assert.rejects(sql(`SELECT revision FROM platform_save_user_layout('${owner}','${workspace}',${json({...ownerLayout,extra:'workflow'})},NULL);`),/Invalid canvas layout/);
  ownerLayout=layoutFor(owner,35);
  assert.equal(await sql(`SELECT revision FROM platform_save_user_layout('${owner}','${workspace}',${json(ownerLayout)},1);`),'2');
  await assert.rejects(sql(`SELECT revision FROM platform_save_user_layout('${owner}','${workspace}',${json(ownerLayout)},1);`),/revision conflict/);
  assert.equal(await sql("SELECT has_table_privilege('authenticated','platform_user_layouts','UPDATE') OR has_table_privilege('authenticated','platform_user_layouts','INSERT');"),'f');
  console.log('PASS: canvas layouts are private per member and revision-checked through the scoped RPC');
  const graph={schemaVersion:1,key:'followup',version:1,entry:'first',nodes:[
    {id:'first',kind:'checkpoint',type:'question',prompt:'Initial fact?',responseSchema:{type:'string'},next:'second'},
    {id:'second',kind:'checkpoint',type:'question',prompt:'Follow-up?',responseSchema:{type:'string'},next:'done'},
    {id:'done',kind:'complete'},
  ]};
  const start=(actor=owner)=>sql(`SELECT id FROM platform_start_run('${actor}','${workspace}','${randomUUID()}',${json(graph)});`);
  const tick=async (run,generation)=>{
    await sql('SELECT id FROM claim_workflow_jobs(100,60);');
    return sql(`SELECT run_status FROM platform_tick_run(
      (SELECT id FROM workflow_jobs WHERE payload->>'runId'='${run}' AND payload->>'generation'='${generation}'),
      (SELECT lease_token FROM workflow_jobs WHERE payload->>'runId'='${run}' AND payload->>'generation'='${generation}'));`);
  };
  const cp=(run,node)=>sql(`SELECT id FROM platform_checkpoints WHERE run_id='${run}' AND node_id='${node}';`);
  const run=await start();
  await tick(run,1);
  const first=await cp(run,'first');
  await sql(`SELECT id FROM platform_respond_checkpoint('${owner}','${workspace}','${first}',1,'${randomUUID()}','"original evidence"');`);
  await tick(run,2);
  const second=await cp(run,'second');
  const request=randomUUID();
  const replace=`SELECT id FROM platform_supersede_run('${owner}','${workspace}','${run}',4,'${request}',${json({...graph,version:2})},'New input');`;
  const [replacement,replay]=await Promise.all([sql(replace),sql(replace)]);
  assert.equal(replacement,replay);
  assert.equal(await sql(`SELECT response#>>'{}' FROM platform_checkpoints WHERE id='${first}';`),'original evidence');
  assert.equal(await sql(`SELECT status FROM platform_checkpoints WHERE id='${second}';`),'cancelled');
  assert.equal(await sql(`SELECT supersedes FROM platform_runs WHERE id='${replacement}';`),run);
  assert.equal(await sql(`SELECT count(*) FROM workflow_jobs WHERE payload->>'runId'='${replacement}';`),'1');
  await assert.rejects(sql(`SELECT id FROM platform_respond_checkpoint('${owner}','${workspace}','${second}',1,'${randomUUID()}','"stale"');`),/conflict/);
  const unrelatedKey=randomUUID(), untouched=await start();
  await sql(`SELECT id FROM platform_start_run('${owner}','${workspace}','${unrelatedKey}',${json(graph)});`);
  await assert.rejects(sql(`SELECT id FROM platform_supersede_run('${owner}','${workspace}','${untouched}',1,'${unrelatedKey}',${json(graph)},'Do not adopt');`),/content conflict/);

  const blocked=await start(member);
  await sql(`UPDATE platform_memberships SET status='revoked' WHERE workspace_id='${workspace}' AND user_id='${member}';`);
  assert.equal(await tick(blocked,1),'blocked');
  const recover=`SELECT id FROM platform_recover_run('${owner}','${workspace}','${blocked}',2);`;
  await assert.rejects(sql(recover),/denied/);
  await sql(`UPDATE platform_memberships SET status='active' WHERE workspace_id='${workspace}' AND user_id='${member}';`);
  await assert.rejects(sql(`SELECT id FROM platform_recover_run('${member}','${workspace}','${blocked}',2);`),/denied/);
  const recovery=await Promise.allSettled([sql(recover),sql(recover)]);
  assert.equal(recovery.filter((r)=>r.status==='fulfilled').length,1);
  assert.equal(await tick(blocked,2),'waiting');
  assert.equal(await sql(`SELECT requested_by FROM platform_runs WHERE id='${blocked}';`),member);
  console.log('PASS: supersession preserves evidence and recovery checks restored authority with one resume');

  const conditionGraph={schemaVersion:1,key:'condition-followup',version:1,entry:'ask',nodes:[
    {id:'ask',kind:'checkpoint',type:'question',prompt:'Which area?',responseSchema:{type:'string'},next:'route'},
    {id:'route',kind:'condition',condition:{op:'equals',path:'answers.ask',value:'Keller'},whenTrue:'matched',whenFalse:'other'},
    {id:'matched',kind:'complete'},
    {id:'other',kind:'complete'},
  ]};
  const conditionRun=await sql(`SELECT id FROM platform_start_run('${owner}','${workspace}','${randomUUID()}',${json(conditionGraph)});`);
  await tick(conditionRun,1);
  const conditionCheckpoint=await cp(conditionRun,'ask');
  await sql(`SELECT id FROM platform_respond_checkpoint('${owner}','${workspace}','${conditionCheckpoint}',1,'${randomUUID()}','"Keller"');`);
  assert.equal(await tick(conditionRun,2),'ready');
  assert.equal(await tick(conditionRun,3),'completed');
  assert.equal(await sql(`SELECT state->>'node' FROM platform_runs WHERE id='${conditionRun}';`),'matched');
  await assert.rejects(sql(`SELECT id FROM platform_start_run('${owner}','${workspace}','${randomUUID()}',${json({...conditionGraph,nodes:[...conditionGraph.nodes,{id:'unused',kind:'complete'}]})});`),/Unreachable/);
  console.log('PASS: bounded condition node evaluates an answer and queues the selected branch');

  const fixture=JSON.parse(await readFile(new URL('../lib/platform/apps/manifests/real-estate-readiness.v1.json',import.meta.url),'utf8'));
  const content=JSON.parse(await readFile(new URL('../lib/platform/apps/manifests/client-content-review.v1.json',import.meta.url),'utf8'));
  const provenanceRun=await start();
  const install=(manifest=fixture,revision='NULL',actor=owner,settings={area:'keller-westlake'})=>
    `SELECT id FROM platform_save_app_install('${actor}','${workspace}',${json(manifest)},${json(settings)},'installed',${revision});`;
  await assert.rejects(sql(install(fixture,'NULL',member)),/denied/);
  const [app,appReplay]=await Promise.all([sql(install()),sql(install())]);
  assert.equal(app,appReplay);
  const contentApp=await sql(install(content,'NULL',owner,{review_mode:'human_review'}));
  const conditionManifest={...fixture,key:'condition-app',title:'Condition App',workflows:[conditionGraph]};
  await sql(install(conditionManifest,'NULL',owner,{area:'keller-westlake'}));
  assert.equal(await sql(`SELECT manifest->'workflows'->0->'nodes'->1->>'kind' FROM platform_app_installs WHERE app_key='condition-app' AND workspace_id='${workspace}';`),'condition');
  await assert.rejects(sql(install({...fixture,title:'Changed without a version'},'1')),/pinned/);
  await assert.rejects(sql(install({...fixture,capabilities:[{tool:'send'}]},'1')),/Unsupported/);
  await assert.rejects(sql(install({...fixture,inputSchema:{...fixture.inputSchema,$ref:'https://external.example'}},'1')),/Unsupported/);
  await assert.rejects(sql(install(fixture,'1',owner,{area:'Dallas'})),/bounds/);
  const upgrades=await Promise.allSettled([sql(install({...fixture,version:2},'1')),sql(install({...fixture,version:3},'1'))]);
  assert.equal(upgrades.filter((r)=>r.status==='fulfilled').length,1);
  assert.equal(await sql(`SELECT definition->>'version' FROM platform_runs WHERE id='${run}';`),'1','install upgrade does not rewrite pinned runs');
  assert.equal(await sql(`SELECT manifest_hash=encode(sha256(convert_to(manifest::TEXT,'UTF8')),'hex') FROM platform_app_installs WHERE id='${app}';`),'t');
  const capabilityPolicy=json({policyVersion:1,capabilities:[{connectionId:'crm.local',tool:'contacts',operation:'lookup',inputSchemaHash:'a'.repeat(64),outputSchemaHash:'b'.repeat(64),actionClass:'read'}],allowedConnections:['crm.local'],externalEffectsEnabled:false});
  const policy=await sql(`SELECT id::text FROM platform_save_capability_policy('${owner}','${workspace}','${app}',${capabilityPolicy},NULL);`);
  assert.equal(await sql(`SELECT policy_hash=encode(sha256(convert_to(policy::TEXT,'UTF8')),'hex') FROM platform_capability_policies WHERE id='${policy}';`),'t');
  await assert.rejects(sql(`SELECT id FROM platform_save_capability_policy('${owner}','${workspace}','${app}',${capabilityPolicy},NULL);`),/revision conflict/);
  await assert.rejects(sql(`SELECT workspace_id FROM platform_save_quota_budget('${member}','${workspace}',1,3,1.0,100,0.5,3600,NULL);`),/denied/);
  await sql(`SELECT workspace_id FROM platform_save_quota_budget('${owner}','${workspace}',1,3,1.0,100,0.5,3600,NULL);`);
  await assert.rejects(sql(`SELECT workspace_id FROM platform_save_quota_budget('${owner}','${workspace}',1,3,1.0,100,0.5,3600,NULL);`),/revision conflict/);
  await sql(`SELECT workspace_id FROM platform_save_quota_budget('${admin}','${workspace}',100,3,1.0,100,0.5,3600,1);`);
  const connector=await sql(`SELECT id::text FROM platform_save_connector_definition('${owner}','${workspace}','crm.local','mcp','CRM','https://crm.example.test/mcp','crm-secret',NULL);`);
  const operation=randomUUID();
  const admit=(operationId=operation,cost='0.25',tokens=40,steps=1,runId=provenanceRun)=>sql(`SELECT id::text FROM platform_admit_capability_operation('${workspace}','${app}','${runId}','${operationId}','crm.local','contacts','lookup','${'a'.repeat(64)}','${'b'.repeat(64)}',${steps},${cost},${tokens});`);
  const reservation=await admit();
  assert.equal(await admit(),reservation);
  await assert.rejects(admit(randomUUID(),'0.3'),/quota exceeded/,'per-run estimated cost remains enforced after workspace concurrency is raised');
  await assert.rejects(sql(`SELECT id FROM platform_admit_capability_operation('${workspace}','${app}','${provenanceRun}','${randomUUID()}','crm.local','contacts','lookup','${'f'.repeat(64)}','${'b'.repeat(64)}',1,0.1);`),/not admitted/);
  assert.equal(await sql(`SELECT status FROM platform_capability_reservations WHERE id='${reservation}';`),'reserved');
  const providerContract={schemaVersion:1,providerKey:'crm.provider',adapterKey:'crm.mcp',adapterVersion:'1.0.0',
    idempotencyMode:'lookup_by_operation_id',unknownOutcomeRecovery:'provider_lookup',pricingVersion:1,currency:'USD',
    components:[{usageKey:'request_count',rateMicros:1000,chargeUnits:1,maxBillableUnits:1,required:true}],
    maxCostMicrosPerOperation:1000,reviewedBy:owner,reviewedAt:'2026-09-23T12:00:00.000Z'};
  const providerReview=await sql(`SELECT id::text FROM platform_register_provider_adapter_review('${owner}','${workspace}','crm.local',${json(providerContract)},1);`);
  await assert.rejects(sql(`SELECT id FROM platform_register_provider_adapter_review('${member}','${workspace}','crm.local',${json({...providerContract,reviewedBy:member})},2);`),/denied/);
  assert.equal(await sql(`SELECT contract_hash=encode(sha256(convert_to(contract::TEXT,'UTF8')),'hex') FROM platform_provider_adapter_reviews WHERE id='${providerReview}';`),'t');
  assert.equal(await sql(`SELECT provider_review_id::text FROM platform_connector_definitions WHERE id='${connector}';`),providerReview);
  assert.equal(await sql(`SELECT provider_contract_hash FROM platform_connector_definitions WHERE id='${connector}';`),await sql(`SELECT contract_hash FROM platform_provider_adapter_reviews WHERE id='${providerReview}';`));
  await assert.rejects(sql(`SELECT id FROM platform_register_provider_adapter_review('${owner}','${workspace}','crm.local',${json({...providerContract,components:[{...providerContract.components[0],rateMicros:2000}],maxCostMicrosPerOperation:2000})},2);`),/immutable/);
  await assert.rejects(sql(`SELECT workspace_id FROM platform_save_provider_quota('${member}','${workspace}','crm.provider','crm.mcp',2,0.5,0.5,NULL);`),/denied/);
  await sql(`SELECT workspace_id FROM platform_save_provider_quota('${owner}','${workspace}','crm.provider','crm.mcp',2,0.3,0.5,NULL);`);
  const exposureRun1=await start(), exposureRun2=await start();
  const exposureOperation=randomUUID();
  const exposureReservation=await admit(exposureOperation,'0.2',10,1,exposureRun1);
  await assert.rejects(admit(randomUUID(),'0.2',10,1,exposureRun2),/Provider quota exceeded/,'provider reserved exposure is enforced across runs');
  await sql(`SELECT status FROM platform_settle_capability_operation('${workspace}','${exposureOperation}','released',NULL,NULL);`);
  await sql(`SELECT workspace_id FROM platform_save_provider_quota('${owner}','${workspace}','crm.provider','crm.mcp',1,0.5,0.5,1);`);
  const concurrencyRun1=await start(), concurrencyRun2=await start();
  const providerConcurrencyOperation=randomUUID();
  const providerConcurrencyReservation=await admit(providerConcurrencyOperation,'0.1',10,1,concurrencyRun1);
  await assert.rejects(admit(randomUUID(),'0.1',10,1,concurrencyRun2),/Provider quota exceeded/,'provider concurrency is serialized separately from workspace capacity');
  await sql(`SELECT status FROM platform_settle_capability_operation('${workspace}','${providerConcurrencyOperation}','released',NULL,NULL);`);
  const connectorSchemaValue={type:'object',properties:{email:{type:'string',maxLength:320}},required:['email'],additionalProperties:false};
  const connectorSchema=json(connectorSchemaValue);
  const snapshot=await sql(`SELECT id::text FROM platform_save_connector_schema_snapshot('${owner}','${workspace}','${connector}','contacts','lookup','input',${connectorSchema},NULL);`);
  assert.equal(await sql(`SELECT schema_hash=encode(sha256(convert_to(schema::TEXT,'UTF8')),'hex') FROM platform_connector_schema_snapshots WHERE id='${snapshot}';`),'t');
  const snapshotHash=await sql(`SELECT schema_hash FROM platform_connector_schema_snapshots WHERE id='${snapshot}';`);
  const healthyCheck=await sql(`SELECT id::text FROM platform_record_connector_health('${workspace}','${connector}','healthy','2026-09-23T12:00:00.000Z','${snapshotHash}',${json({source:'fixture',probe:'schema'})});`);
  assert.equal(await sql(`SELECT status FROM platform_connector_health WHERE id='${healthyCheck}';`),'healthy');
  await sql(`SELECT id::text FROM platform_record_connector_health('${workspace}','${connector}','unavailable','2026-09-23T12:01:00.000Z',NULL,${json({source:'fixture',reason:'maintenance'})});`);
  assert.equal(await sql(`SELECT status FROM platform_connector_health WHERE connector_id='${connector}';`),'unavailable');
  await sql(`SELECT id::text FROM platform_record_connector_health('${workspace}','${connector}','schema_drift','2026-09-23T12:02:00.000Z','${'f'.repeat(64)}',${json({source:'fixture',reason:'snapshot_changed'})});`);
  assert.equal(await sql(`SELECT status FROM platform_connector_health WHERE connector_id='${connector}';`),'schema_drift');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_connector_health_summary('${workspace}') WHERE status='schema_drift';`),'1');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_connector_health_summary('${other}');`),'0');
  assert.equal(await sql("SELECT has_function_privilege('service_role','platform_connector_health_summary(uuid)','EXECUTE');"),'t');
  assert.equal(await sql("SELECT has_function_privilege('authenticated','platform_connector_health_summary(uuid)','EXECUTE');"),'f');
  const receiptOperation=randomUUID();
  const validHealthReceipt=await sql(`SELECT id::text FROM platform_record_connector_health_receipt('${workspace}','${connector}','${receiptOperation}','${healthyCheck}','schema_drift');`);
  assert.equal(await sql(`SELECT count(*)::text FROM platform_connector_health_history WHERE workspace_id='${workspace}';`),'3');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_connector_health_receipts WHERE workspace_id='${workspace}' AND operation_id='${receiptOperation}';`),'1');
  assert.equal(await sql(`SELECT action FROM platform_audit_events WHERE workspace_id='${workspace}' AND resource_id='${connector}' ORDER BY occurred_at DESC LIMIT 1;`),'connector.health.receipt_recorded');
  assert.equal(await sql(`SELECT safe_metadata->>'receiptId' FROM platform_audit_events WHERE workspace_id='${workspace}' AND resource_id='${connector}' ORDER BY occurred_at DESC LIMIT 1;`),validHealthReceipt);
  assert.equal(await sql(`SELECT id::text FROM platform_record_connector_health_receipt('${workspace}','${connector}','${receiptOperation}','${healthyCheck}','schema_drift');`),validHealthReceipt);
  const concurrentOperation=randomUUID();
  const concurrentReceipts=await Promise.all([
    sql(`SELECT id::text FROM platform_record_connector_health_receipt('${workspace}','${connector}','${concurrentOperation}','${healthyCheck}','schema_drift');`),
    sql(`SELECT id::text FROM platform_record_connector_health_receipt('${workspace}','${connector}','${concurrentOperation}','${healthyCheck}','schema_drift');`),
  ]);
  assert.equal(concurrentReceipts[0],concurrentReceipts[1]);
  assert.equal(await sql(`SELECT count(*)::text FROM platform_connector_health_receipts WHERE workspace_id='${workspace}' AND operation_id='${concurrentOperation}';`),'1');
  await assert.rejects(sql(`SELECT id FROM platform_record_connector_health_receipt('${other}','${connector}','${randomUUID()}','${healthyCheck}','healthy');`),/target not found/);
  assert.equal(await sql("SELECT has_table_privilege('service_role','platform_connector_health','INSERT');"),'f');
  assert.equal(await sql("SELECT enabled FROM workflow_event_contracts WHERE workflow_key='connector_health_check';"),'f');
  await assert.rejects(sql(`SELECT id FROM enqueue_workflow_event('${owner}','connector_health_check','health-disabled-${connector}',${json({workspaceId:workspace,connectorId:connector,source:'fixture',operation:'pinned_snapshot'})},1,now());`),/Unsupported workflow event contract/);
  await sql("UPDATE workflow_event_contracts SET enabled=true WHERE workflow_key='connector_health_check';");
  const healthJob=await sql(`SELECT id::text FROM enqueue_workflow_event('${owner}','connector_health_check','health-enabled-${connector}',${json({workspaceId:workspace,connectorId:connector,source:'fixture',operation:'pinned_snapshot'})},1,now()-interval '1 second');`);
  assert.equal(await sql(`SELECT action FROM platform_audit_events WHERE workspace_id='${workspace}' AND resource_id='${connector}' ORDER BY occurred_at DESC LIMIT 1;`),'connector.health.scheduled');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_audit_events WHERE workspace_id='${workspace}' AND resource_id='${connector}' AND action='connector.health.scheduled';`),'1');
  assert.equal(await sql(`SELECT id::text FROM enqueue_workflow_event('${owner}','connector_health_check','health-enabled-${connector}',${json({workspaceId:workspace,connectorId:connector,source:'fixture',operation:'pinned_snapshot'})},1,(SELECT scheduled_for FROM workflow_jobs WHERE id='${healthJob}'));`),healthJob);
  assert.equal(await sql(`SELECT payload->>'connectorId' FROM workflow_jobs WHERE id='${healthJob}';`),connector);
  assert.equal(await sql(`SELECT count(*)::text FROM claim_workflow_jobs(100,60) WHERE id='${healthJob}';`),'1');
  await sql(`UPDATE workflow_jobs SET lease_until=now()-interval '1 second' WHERE id='${healthJob}';`);
  assert.equal(await sql(`SELECT recover_workflow_leases() >= 1;`),'t');
  assert.equal(await sql(`SELECT status FROM workflow_jobs WHERE id='${healthJob}';`),'queued');
  await sql(`DELETE FROM workflow_jobs WHERE id='${healthJob}';`);
  await sql("UPDATE workflow_event_contracts SET enabled=false WHERE workflow_key='connector_health_check';");
  await sql(`BEGIN;
    CREATE TEMP TABLE restore_health_history AS SELECT * FROM platform_connector_health_history WHERE workspace_id='${workspace}' AND connector_id='${connector}';
    CREATE TEMP TABLE restore_health_receipts AS SELECT * FROM platform_connector_health_receipts WHERE workspace_id='${workspace}' AND connector_id='${connector}';
    CREATE TEMP TABLE restore_health_audit AS SELECT * FROM platform_audit_events WHERE workspace_id='${workspace}' AND resource_type='connector_health' AND resource_id='${connector}';
    ALTER TABLE platform_connector_health_receipts DISABLE TRIGGER platform_connector_health_receipt_audit;
    DELETE FROM platform_audit_events WHERE workspace_id='${workspace}' AND resource_type='connector_health' AND resource_id='${connector}';
    DELETE FROM platform_connector_health_receipts WHERE workspace_id='${workspace}' AND connector_id='${connector}';
    DELETE FROM platform_connector_health_history WHERE workspace_id='${workspace}' AND connector_id='${connector}';
    INSERT INTO platform_connector_health_history SELECT * FROM restore_health_history;
    INSERT INTO platform_connector_health_receipts SELECT * FROM restore_health_receipts;
    INSERT INTO platform_audit_events SELECT * FROM restore_health_audit;
    ALTER TABLE platform_connector_health_receipts ENABLE TRIGGER platform_connector_health_receipt_audit;
    DO $restore$
    BEGIN
      IF (SELECT count(*) FROM platform_connector_health_history WHERE workspace_id='${workspace}' AND connector_id='${connector}') <> (SELECT count(*) FROM restore_health_history) THEN RAISE EXCEPTION 'Health history restore count mismatch'; END IF;
      IF (SELECT count(*) FROM platform_connector_health_receipts WHERE workspace_id='${workspace}' AND connector_id='${connector}') <> (SELECT count(*) FROM restore_health_receipts) THEN RAISE EXCEPTION 'Health receipt restore count mismatch'; END IF;
      IF (SELECT count(*) FROM platform_audit_events WHERE workspace_id='${workspace}' AND resource_type='connector_health' AND resource_id='${connector}') <> (SELECT count(*) FROM restore_health_audit) THEN RAISE EXCEPTION 'Health audit restore count mismatch'; END IF;
      IF EXISTS (SELECT 1 FROM platform_connector_health_receipts WHERE operation_id IN (SELECT operation_id FROM restore_health_receipts) GROUP BY operation_id HAVING count(*) <> 1) THEN RAISE EXCEPTION 'Restore duplicated a health operation identity'; END IF;
      IF EXISTS (SELECT 1 FROM platform_connector_health_history WHERE id IN (SELECT id FROM restore_health_history) AND workspace_id <> '${workspace}') THEN RAISE EXCEPTION 'Restore crossed workspace boundary'; END IF;
    END $restore$;
    COMMIT;`);
  assert.equal(await sql(`SELECT count(*)::text FROM platform_connector_health_history WHERE workspace_id='${other}';`),'0');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_connector_health_receipts WHERE workspace_id='${other}';`),'0');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_audit_events WHERE workspace_id='${other}' AND resource_type='connector_health';`),'0');
  console.log('PASS: connector health history, receipts and audit restore with stable IDs and workspace isolation');
  const responseEvent=await sql(`SELECT id::text FROM platform_record_connector_response('${workspace}','${provenanceRun}','${reservation}','${snapshot}','${operation}','${'e'.repeat(64)}','${snapshotHash}','valid',${json({source:'fixture',fixture:'crm.lookup',recordedAt:'2026-09-23T12:00:00.000Z'})});`);
  assert.equal(await sql(`SELECT status FROM platform_connector_response_events WHERE id='${responseEvent}';`),'valid');
  const settled=await sql(`SELECT status FROM platform_settle_capability_operation('${workspace}','${operation}','consumed',35,0.2);`);
  assert.equal(settled,'consumed');
  assert.equal(await sql(`SELECT status FROM platform_settle_capability_operation('${workspace}','${operation}','consumed',35,0.2);`),'consumed','settlement replay is idempotent');
  await assert.rejects(sql(`SELECT status FROM platform_settle_capability_operation('${workspace}','${operation}','consumed',36,0.2);`),/identity conflict/);
  assert.equal(await sql(`SELECT action FROM platform_audit_events WHERE resource_type='capability_reservation' AND resource_id='${reservation}' ORDER BY occurred_at DESC LIMIT 1;`),'capability.operation.consumed');
  await sql(`SELECT workspace_id FROM platform_save_quota_limit('${owner}','${workspace}',2,3,1,2);`);
  const overrunRun=await start();
  const overrunOperation=randomUUID();
  const overrunReservation=await admit(overrunOperation,'0.1',10,1,overrunRun);
  assert.equal(await sql(`SELECT status FROM platform_settle_capability_operation('${workspace}','${overrunOperation}','consumed',11,0.11);`),'consumed');
  assert.equal(await sql(`SELECT string_agg(breach_kind,',' ORDER BY breach_kind) FROM platform_quota_breaches WHERE workspace_id='${workspace}' AND run_id='${overrunRun}';`),'estimated_cost_exceeded,estimated_tokens_exceeded','cost and token estimate overruns are immutable run evidence');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_audit_events WHERE workspace_id='${workspace}' AND action='capability.budget_breached' AND resource_id='${overrunRun}';`),'2','each breach emits safe audit evidence');
  assert.equal(await sql(`SELECT status FROM platform_settle_capability_operation('${workspace}','${overrunOperation}','consumed',11,0.11);`),'consumed','overrun settlement replay is idempotent');
  await assert.rejects(admit(randomUUID(),'0.01',1,1,overrunRun),/fenced after a quota breach/,'breached runs cannot reserve additional operations');
  const unaffectedRun=await start();
  const unaffectedOperation=randomUUID();
  assert.ok(await admit(unaffectedOperation,'0.01',1,1,unaffectedRun),'a run-local breach does not fence another run');
  await sql(`SELECT status FROM platform_settle_capability_operation('${workspace}','${unaffectedOperation}','released',NULL,NULL);`);
  assert.equal(await sql(`SELECT count(*)::text FROM platform_quota_breaches WHERE workspace_id='${other}' AND run_id='${overrunRun}';`),'0','breach evidence is workspace scoped');
  const driftOperation=randomUUID();
  const driftReservation=await admit(driftOperation,'0.1');
  assert.equal(await sql(`SELECT provider_review_id::text FROM platform_capability_reservations WHERE id='${driftReservation}';`),providerReview,'reservation pins the reviewed adapter identity');
  assert.equal(await sql(`SELECT provider_contract_hash FROM platform_capability_reservations WHERE id='${driftReservation}';`),await sql(`SELECT contract_hash FROM platform_provider_adapter_reviews WHERE id='${providerReview}';`),'reservation pins the immutable provider contract hash');
  await assert.rejects(admit(randomUUID(),'0.01',61),/quota exceeded/,'consumed actual tokens count toward the per-run ceiling');
  await assert.rejects(admit(randomUUID(),'0.31',1),/quota exceeded/,'consumed actual cost counts toward the per-run ceiling');
  await sql(`SELECT workspace_id FROM platform_save_provider_quota('${owner}','${workspace}','crm.provider','crm.mcp',3,0.5,0.5,2);`);
  const recoveryGraph={schemaVersion:1,key:'recovery-evidence',version:1,entry:'gate',nodes:[
    {id:'gate',kind:'checkpoint',type:'effect_gate',prompt:'Review recovery evidence',target:{resourceType:'fixture',resourceId:'recovery-1',revision:1,contentHash:'e'.repeat(64),action:'prepare'},next:'done'},
    {id:'done',kind:'complete'},
  ]};
  const recoveryRun=await sql(`SELECT id FROM platform_start_run('${owner}','${workspace}','${randomUUID()}',${json(recoveryGraph)});`);
  await tick(recoveryRun,1);
  const recoveryCheckpoint=await cp(recoveryRun,'gate');
  const recoveryOperation=randomUUID();
  const recoveryReservation=await admit(recoveryOperation,'0.01',1,1,recoveryRun);
  const unknownReceipt=await sql(`SELECT id::text FROM platform_record_effect_receipt('${workspace}','${recoveryRun}','${recoveryCheckpoint}','${recoveryOperation}','${'c'.repeat(64)}','${'d'.repeat(64)}','prepared',NULL,NULL);`);
  await sql(`SELECT id FROM platform_transition_effect_receipt('${unknownReceipt}','submitted',NULL,NULL);`);
  await sql(`SELECT id FROM platform_transition_effect_receipt('${unknownReceipt}','unknown',NULL,NULL);`);
  const reconciliationKey=randomUUID(), evidenceHash='f'.repeat(64);
  const recoveryReviewCall=`SELECT id::text FROM platform_record_effect_recovery_review('${owner}','${workspace}','${unknownReceipt}','${reconciliationKey}','not_applied','provider_lookup','provider-ticket-42','${evidenceHash}');`;
  const [recoveryReview,recoveryReviewReplay]=await Promise.all([sql(recoveryReviewCall),sql(recoveryReviewCall)]);
  assert.equal(recoveryReviewReplay,recoveryReview,'same reconciliation key and evidence replays the immutable review');
  await assert.rejects(sql(`SELECT id FROM platform_record_effect_recovery_review('${member}','${workspace}','${unknownReceipt}','${randomUUID()}','not_applied','manual_review','review-42','${evidenceHash}');`),/denied/);
  const retryKey=randomUUID(), retryOperation=randomUUID();
  const retryCall=`SELECT id::text FROM platform_create_effect_retry_intent('${owner}','${workspace}','${unknownReceipt}','${recoveryReview}','${retryKey}','${retryOperation}');`;
  const [retryIntent,retryReplay]=await Promise.all([sql(retryCall),sql(retryCall)]);
  assert.equal(retryReplay,retryIntent,'retry intent creation is idempotent');
  await assert.rejects(sql(`SELECT id FROM platform_create_effect_retry_intent('${owner}','${workspace}','${unknownReceipt}','${recoveryReview}','${retryKey}','${randomUUID()}');`),/Retry idempotency key reused/,
    'a replay key cannot be rebound to another retry operation');
  await assert.rejects(sql(`SELECT id FROM platform_create_effect_retry_intent('${owner}','${workspace}','${unknownReceipt}','${recoveryReview}','${randomUUID()}','${retryOperation}');`),/Retry operation identity already exists/,
    'a retry operation ID cannot be reused under another idempotency key');
  assert.notEqual(await sql(`SELECT original_operation_id::text FROM platform_effect_retry_intents WHERE id='${retryIntent}';`),retryOperation,'retry gets a fresh operation identity');
  const pinnedRetryReview=await sql(`SELECT provider_review_id::text||':'||provider_review_hash FROM platform_effect_retry_intents WHERE id='${retryIntent}';`);
  const pinnedContractHash=await sql(`SELECT contract_hash FROM platform_provider_adapter_reviews WHERE id='${providerReview}';`);
  assert.equal(pinnedRetryReview,`${providerReview}:${pinnedContractHash}`,'retry intent retains the exact reviewed adapter pin');
  assert.equal(await sql(`SELECT status FROM platform_effect_receipts WHERE id='${unknownReceipt}';`),'unknown','recording intent does not mutate the original uncertain receipt');
  await sql(`SELECT status FROM platform_settle_capability_operation('${workspace}','${recoveryOperation}','released',NULL,NULL);`);
  assert.equal(await sql(`SELECT count(*)::text FROM platform_effect_retry_intents WHERE workspace_id='${workspace}' AND receipt_id='${unknownReceipt}';`),'1','retry intent replay does not duplicate attempts');
  console.log('PASS: unknown effect recovery records hashed evidence and a distinct, pinned retry identity without dispatch');
  const racingOperationIds=[randomUUID(),randomUUID()];
  const raced=await Promise.allSettled(racingOperationIds.map((operationId)=>admit(operationId,'0.01',1)));
  assert.equal(raced.filter((result)=>result.status==='fulfilled').length,1,'quota row lock serializes concurrent reservations');
  assert.equal(raced.filter((result)=>result.status==='rejected').length,1);
  const admittedRaceIndex=raced.findIndex((result)=>result.status==='fulfilled');
  const expiredOperation=racingOperationIds[admittedRaceIndex];
  await sql(`UPDATE platform_capability_reservations SET expires_at=now()-interval '1 second' WHERE workspace_id='${workspace}' AND operation_id='${expiredOperation}';`);
  assert.equal(await sql(`SELECT platform_reconcile_capability_reservations('${workspace}',1);`),'1','bounded service reconciliation expires one eligible operation');
  const afterExpiry=await admit(randomUUID(),'0.01',1);
  assert.ok(afterExpiry,'admission reconciles an expired reservation and reuses its concurrency slot');
  assert.equal(await sql(`SELECT status FROM platform_capability_reservations WHERE workspace_id='${workspace}' AND operation_id='${expiredOperation}';`),'expired');
  assert.equal(await sql(`SELECT action FROM platform_audit_events WHERE resource_type='capability_reservation' AND resource_id=(SELECT id::text FROM platform_capability_reservations WHERE workspace_id='${workspace}' AND operation_id='${expiredOperation}') ORDER BY occurred_at DESC LIMIT 1;`),'capability.operation.expired');
  assert.equal(await sql("SELECT has_function_privilege('authenticated','platform_reconcile_capability_reservations(uuid,integer)','EXECUTE');"),'f');
  await sql(`SELECT id FROM platform_record_connector_response('${workspace}','${provenanceRun}','${driftReservation}','${snapshot}','${driftOperation}','${'f'.repeat(64)}','${'f'.repeat(64)}','schema_drift',${json({source:'fixture',fixture:'crm.lookup',recordedAt:'2026-09-23T12:01:00.000Z'})});`);
  assert.equal(await sql(`SELECT status FROM platform_runs WHERE id='${provenanceRun}';`),'blocked');
  await sql(`SELECT workspace_id FROM platform_save_quota_limit('${owner}','${workspace}',4,3,1,3);`);
  const cancellationRun=await start();
  await tick(cancellationRun,1);
  const cancellationOperation=randomUUID();
  const cancellationReservation=await admit(cancellationOperation,'0.01',1,1,cancellationRun);
  const cancellationRevision=await sql(`SELECT revision FROM platform_runs WHERE id='${cancellationRun}';`);
  assert.equal(await sql(`SELECT status FROM platform_cancel_run('${owner}','${workspace}','${cancellationRun}',${cancellationRevision});`),'cancelled');
  assert.equal(await sql(`SELECT status FROM platform_capability_reservations WHERE id='${cancellationReservation}';`),'released');
  assert.equal(await sql(`SELECT actual_cost_usd::text FROM platform_capability_reservations WHERE id='${reservation}';`),'0.200000','cancel preserves consumed actual cost');
  await assert.rejects(admit(randomUUID(),'0.01',1,1,cancellationRun),/not accepting capability/);
  await sql(`SELECT status FROM platform_settle_capability_operation('${workspace}','${driftOperation}','released',NULL,NULL);`);
  const afterExpiryOperation=await sql(`SELECT operation_id::text FROM platform_capability_reservations WHERE id='${afterExpiry}';`);
  await sql(`SELECT status FROM platform_settle_capability_operation('${workspace}','${afterExpiryOperation}','released',NULL,NULL);`);

  const inFlightProviderOperation=randomUUID();
  const inFlightProviderRun=await start();
  await admit(inFlightProviderOperation,'0.01',1,1,inFlightProviderRun);
  const providerBreachRun=await start();
  const providerBreachOperation=randomUUID();
  const providerBreachReservation=await admit(providerBreachOperation,'0.3',10,1,providerBreachRun);
  assert.equal(await sql(`SELECT status FROM platform_settle_capability_operation('${workspace}','${providerBreachOperation}','consumed',10,0.41);`),'consumed');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_provider_quota_breaches WHERE workspace_id='${workspace}' AND provider_key='crm.provider' AND adapter_key='crm.mcp' AND utc_day=(now() AT TIME ZONE 'UTC')::date;`),'1','actual provider spend above the UTC-day ceiling creates one immutable fence');
  const exceptionId=await sql(`SELECT id::text FROM platform_provider_quota_breaches WHERE workspace_id='${workspace}' AND provider_key='crm.provider' AND adapter_key='crm.mcp' AND utc_day=(now() AT TIME ZONE 'UTC')::date;`);
  const resolutionKey=randomUUID();
  const resolutionCall=`SELECT id::text FROM platform_resolve_provider_exception('${owner}','${workspace}','quota_breach','${exceptionId}','${resolutionKey}','investigated');`;
  const [resolution,resolutionReplay]=await Promise.all([sql(resolutionCall),sql(resolutionCall)]);
  assert.equal(resolutionReplay,resolution,'duplicate resolution is an immutable idempotent replay');
  await assert.rejects(sql(`SELECT id FROM platform_resolve_provider_exception('${member}','${workspace}','quota_breach','${exceptionId}','${randomUUID()}','investigated');`),/denied/);
  assert.equal(await sql(`SELECT count(*)::text FROM platform_provider_quota_breaches WHERE id='${exceptionId}';`),'1','resolution preserves breach evidence');
  assert.equal(await sql("SELECT has_table_privilege('service_role','platform_provider_quota_breaches','UPDATE') OR has_table_privilege('service_role','platform_provider_quota_breaches','DELETE');"),'f','service role cannot update or delete provider spend fences');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_audit_events WHERE workspace_id='${workspace}' AND action='provider.exception.resolved' AND resource_id='${exceptionId}';`),'1','resolution replay writes one audit event');
  assert.equal(await sql(`SELECT action FROM platform_audit_events WHERE workspace_id='${workspace}' AND action='provider.quota.breached' ORDER BY occurred_at DESC LIMIT 1;`),'provider.quota.breached');
  await sql(`SELECT id FROM platform_revoke_provider_adapter_review('${owner}','${workspace}','${providerReview}');`);
  assert.equal(await sql(`SELECT status FROM platform_provider_adapter_reviews WHERE id='${providerReview}';`),'revoked');
  await assert.rejects(sql(`SELECT id FROM platform_create_effect_retry_intent('${owner}','${workspace}','${unknownReceipt}','${recoveryReview}','${randomUUID()}','${randomUUID()}');`),/no longer active/,'retry intents cannot be created against a revoked provider review');
  assert.equal(await sql(`SELECT status FROM platform_revoke_provider_adapter_review('${owner}','${workspace}','${providerReview}');`),'revoked','review revocation replay is idempotent');
  assert.equal(await sql(`SELECT status FROM platform_settle_capability_operation('${workspace}','${inFlightProviderOperation}','consumed',1,0.01);`),'consumed','revocation does not erase or prevent settlement of an already pinned reservation');
  const postRevocationRun=await start();
  await assert.rejects(admit(randomUUID(),'0.01',1,1,postRevocationRun),/missing, revoked, or stale/,'revoked adapter reviews cannot admit new operations');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_provider_quota_breaches WHERE workspace_id='${other}' AND provider_key='crm.provider';`),'0','provider spend fences are workspace scoped');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_list_provider_exceptions('${owner}','${workspace}',NULL,NULL,10);`),'2','exception feed includes the spend breach and revoked review');
  assert.equal(await sql(`SELECT run_id::text||':'||reservation_id::text FROM platform_list_provider_exceptions('${owner}','${workspace}',NULL,NULL,10) WHERE exception_type='quota_breach';`),`${providerBreachRun}:${providerBreachReservation}`,'spend exception links to the triggering run and reservation');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_list_provider_exceptions('${owner}','${workspace}',NULL,NULL,1);`),'1','exception RPC enforces its requested bounded page');
  const exceptionCursor=await sql(`SELECT occurred_at::text||'|'||id::text FROM platform_list_provider_exceptions('${owner}','${workspace}',NULL,NULL,1);`);
  const [exceptionCursorTime,exceptionCursorId]=exceptionCursor.split('|');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_list_provider_exceptions('${owner}','${workspace}','${exceptionCursorTime}'::timestamptz,'${exceptionCursorId}',10);`),'1','exception cursor resumes strictly after the prior workspace page');
  assert.equal(await sql(`SELECT resolution_reason FROM platform_list_provider_exceptions('${owner}','${workspace}',NULL,NULL,10) WHERE id='${exceptionId}';`),'investigated','exception feed exposes the latest append-only resolution');
  assert.equal(await sql(`SELECT operation_id::text||':'||recovery_outcome||':'||retry_operation_id::text FROM platform_list_unknown_effects('${owner}','${workspace}',NULL,NULL,10) WHERE receipt_id='${unknownReceipt}';`),`${recoveryOperation}:not_applied:${retryOperation}`,'unknown effect inbox joins original operation, recovery evidence and distinct retry identity');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_list_unknown_effects('${owner}','${workspace}',NULL,NULL,1);`),'1','unknown effect feed enforces bounded page size');
  await assert.rejects(sql(`SELECT * FROM platform_list_unknown_effects('${foreign}','${workspace}',NULL,NULL,10);`),/denied/,'unknown effect feed is workspace scoped');
  assert.equal(await sql("SELECT has_function_privilege('authenticated','platform_list_unknown_effects(uuid,uuid,timestamptz,uuid,integer)','EXECUTE');"),'f');
  assert.equal(await sql("SELECT has_function_privilege('service_role','platform_list_unknown_effects(uuid,uuid,timestamptz,uuid,integer)','EXECUTE');"),'t');
  await assert.rejects(sql(`SELECT * FROM platform_list_provider_exceptions('${foreign}','${workspace}',NULL,NULL,10);`),/denied/,'provider exceptions require active workspace membership');
  assert.equal(await sql("SELECT has_function_privilege('authenticated','platform_list_provider_exceptions(uuid,uuid,timestamptz,uuid,integer)','EXECUTE');"),'f');
  assert.equal(await sql("SELECT has_function_privilege('service_role','platform_list_provider_exceptions(uuid,uuid,timestamptz,uuid,integer)','EXECUTE');"),'t');
  console.log('PASS: provider exception feed is bounded, linked to affected work and fenced to active workspace members');
  console.log('PASS: reservation settlement replays idempotently; consumed cost/tokens persist in budgets and admission races serialize');
  await assert.rejects(sql(`SELECT id FROM platform_save_connector_definition('${owner}','${workspace}','crm.local','mcp','CRM','http://crm.example.test/mcp','crm-secret',1);`),/Invalid connector/);
  await assert.rejects(sql(`SELECT id FROM platform_save_connector_schema_snapshot('${owner}','${workspace}','${connector}','contacts','lookup','input',${json({...connectorSchemaValue, '$ref':'file:///evil'})},1);`),/Unsupported|schema/);
  const effectGraph={schemaVersion:1,key:'effect-gate-followup',version:1,entry:'gate',nodes:[
    {id:'gate',kind:'checkpoint',type:'effect_gate',prompt:'Authorize fixture effect',target:{resourceType:'fixture',resourceId:'fixture-1',revision:1,contentHash:'e'.repeat(64),action:'prepare'},next:'done'},
    {id:'done',kind:'complete'},
  ]};
  const effectRun=await sql(`SELECT id FROM platform_start_run('${owner}','${workspace}','${randomUUID()}',${json(effectGraph)});`);
  await tick(effectRun,1);
  const effectCheckpoint=await cp(effectRun,'gate');
  const receipt=await sql(`SELECT id::text FROM platform_record_effect_receipt('${workspace}','${effectRun}','${effectCheckpoint}','${randomUUID()}','${'c'.repeat(64)}','${'d'.repeat(64)}','prepared',NULL,NULL);`);
  assert.equal(await sql(`SELECT status FROM platform_effect_receipts WHERE id='${receipt}';`),'prepared');
  await sql(`SELECT id FROM platform_transition_effect_receipt('${receipt}','submitted',NULL,NULL);`);
  await sql(`SELECT id FROM platform_transition_effect_receipt('${receipt}','unknown',NULL,NULL);`);
  await sql(`SELECT id FROM platform_transition_effect_receipt('${receipt}','reconciled','fixture-reconciled',now());`);
  assert.equal(await sql(`SELECT status FROM platform_effect_receipts WHERE id='${receipt}';`),'reconciled');
  await assert.rejects(sql(`SELECT id FROM platform_transition_effect_receipt('${receipt}','accepted','fixture-accepted',now());`),/transition/);
  assert.equal(await sql("SELECT has_table_privilege('service_role','platform_effect_receipts','INSERT');"),'f');
  const visible=(actor)=>sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${actor}'; SELECT count(*) FROM platform_app_installs WHERE workspace_id='${workspace}'; COMMIT;`);
  assert.equal(await visible(owner),'3');
  assert.equal(await visible(foreign),'0');
  assert.equal(await sql("SELECT has_table_privilege('service_role','platform_app_installs','UPDATE');"),'f');
  console.log('PASS: inert manifests, settings, concurrent install/upgrade, version pins and install RLS');

  assert.equal(await sql("SELECT enabled FROM workflow_event_contracts WHERE workflow_key='capability_reservation_reconcile';"),'f');
  const reconciliationPayload=json({workspaceId:workspace,batchLimit:1});
  await assert.rejects(sql(`SELECT id FROM enqueue_workflow_event('${owner}','capability_reservation_reconcile','quota-disabled-${workspace}',${reconciliationPayload},1,now());`),/Unsupported workflow event contract/);
  await sql("UPDATE workflow_event_contracts SET enabled=true WHERE workflow_key='capability_reservation_reconcile';");
  const reconciliationJob=await sql(`SELECT id::text FROM enqueue_workflow_event('${owner}','capability_reservation_reconcile','quota-enabled-${workspace}',${reconciliationPayload},1,now()-interval '1 second');`);
  assert.equal(await sql(`SELECT id::text FROM enqueue_workflow_event('${owner}','capability_reservation_reconcile','quota-enabled-${workspace}',${reconciliationPayload},1,(SELECT scheduled_for FROM workflow_jobs WHERE id='${reconciliationJob}'));`),reconciliationJob);
  assert.equal(await sql(`SELECT count(*)::text FROM claim_workflow_jobs(100,60) WHERE id='${reconciliationJob}';`),'1');
  await sql(`UPDATE workflow_jobs SET lease_until=now()-interval '1 second' WHERE id='${reconciliationJob}';`);
  assert.equal(await sql('SELECT recover_workflow_leases() >= 1;'),'t');
  assert.equal(await sql(`SELECT status FROM workflow_jobs WHERE id='${reconciliationJob}';`),'queued');
  await sql(`DELETE FROM workflow_jobs WHERE id='${reconciliationJob}';`);
  await sql("UPDATE workflow_event_contracts SET enabled=false WHERE workflow_key='capability_reservation_reconcile';");
  console.log('PASS: quota reconciliation event is disabled by default and retains scheduler replay/lease recovery behavior');

  const schedule=await sql(`SELECT id FROM platform_save_sprint_planner_schedule('${owner}','${workspace}',NULL,'manual_backlog','weekly','UTC',8,0,1,now()+interval '1 day');`);
  await assert.rejects(sql(`SELECT id FROM platform_save_sprint_planner_schedule('${owner}','${other}',1,'manual_backlog','daily','UTC',8,0,1,now()+interval '1 day');`),/scope transfer/);
  assert.equal(await sql(`SELECT revision FROM workflow_schedules WHERE id='${schedule}';`),'1','failed transfer rolls back legacy schedule edit');
  const job=randomUUID(), token=randomUUID();
  await sql(`INSERT INTO workflow_jobs(id,schedule_id,user_id,workflow_key,scheduled_for,status,lease_token,lease_until)
    VALUES('${job}','${schedule}','${owner}','sprint_planner',now(),'running','${token}',now()+interval '1 minute');`);
  await assert.rejects(sql(`SELECT platform_require_owner_planning('${job}','${token}');`),/scoped planner/);

  const scopedBacklog = await sql(`SELECT id::text FROM platform_add_sprint_backlog_item('${owner}','${workspace}','Scoped team input','Scoped proposal input',1,30,'manual',NULL);`);
  const scopedJob = randomUUID(), scopedToken = randomUUID();
  await sql(`INSERT INTO workflow_jobs(id,schedule_id,user_id,workflow_key,scheduled_for,status,lease_token,lease_until)
    VALUES('${scopedJob}','${schedule}','${owner}','sprint_planner',now()+interval '2 minutes','running','${scopedToken}',now()+interval '1 minute');`);
  const scopedItems = json([{ backlog_item_id: scopedBacklog }]);
  const scopedProposalCall = `SELECT sprint_id::text FROM platform_persist_scoped_sprint_proposal('${scopedJob}','${workspace}',(SELECT scheduled_for FROM workflow_jobs WHERE id='${scopedJob}'),'Scoped team sprint','Validate mapped backlog',${scopedItems});`;
  const [scopedProposal, scopedReplay] = await Promise.all([sql(scopedProposalCall), sql(scopedProposalCall)]);
  assert.match(scopedProposal, /^[0-9a-f-]{36}$/i);
  assert.equal(scopedReplay, scopedProposal);
  assert.equal(await sql(`SELECT workspace_id::text FROM platform_scope_links WHERE resource_type='sprint' AND resource_id='${scopedProposal}';`), workspace);
  assert.equal(await sql(`SELECT sprint_id::text FROM platform_persist_scoped_sprint_proposal('${scopedJob}','${workspace}',(SELECT scheduled_for FROM workflow_jobs WHERE id='${scopedJob}'),'Changed name','Changed goal',${scopedItems});`), scopedProposal);
  await assert.rejects(sql(`SELECT sprint_id::text FROM platform_persist_scoped_sprint_proposal('${scopedJob}','${other}',(SELECT scheduled_for FROM workflow_jobs WHERE id='${scopedJob}'),'Foreign workspace','Should fail',${scopedItems});`),/workspace|mapped|member/);
  console.log('PASS: scoped sprint persistence validates schedule mapping, backlog mapping, replay and foreign workspace denial');

  const propertyId = randomUUID();
  await sql(`INSERT INTO property_shortlist_entries(id,owner_id,area_key,address,city,state,property_kind,revision,status)
    VALUES('${propertyId}','${owner}','keller-westlake','1 Main Street','Keller','TX','residential',1,'active');
    INSERT INTO platform_scope_links(resource_type,resource_id,owner_id,workspace_id,status,source_revision)
    VALUES('property_shortlist','${propertyId}','${owner}','${workspace}','mapped',1);`);
  const launchRevision = await sql(`SELECT revision FROM platform_app_installs WHERE id='${app}';`);
  const launchManifestVersion = Number(await sql(`SELECT manifest->>'version' FROM platform_app_installs WHERE id='${app}';`));
  const launchManifest = {...fixture, version: launchManifestVersion};
  const launchRequest = randomUUID();
  const launchInputs = json({property_id: propertyId});
  const launchRefs = json([{resourceType:'property_shortlist',resourceId:propertyId,expectedRevision:1}]);
  const launchCall = (actor=owner,revision=launchRevision,key=launchRequest,inputs=launchInputs,refs=launchRefs)=>
    `SELECT id::text FROM platform_start_app_run('${actor}','${workspace}','${app}',${revision},'readiness-intake','${key}',${inputs},${refs});`;
  await sql(`UPDATE workflow_event_contracts SET enabled=true WHERE workflow_key='platform_run';`);
  const [launched, launchReplay] = await Promise.all([sql(launchCall()), sql(launchCall())]);
  assert.match(launched, /^[0-9a-f-]{36}$/i);
  assert.equal(launchReplay, launched);
  assert.equal(await sql(`SELECT app_install_id::text FROM platform_runs WHERE id='${launched}';`), app);
  assert.equal(await sql(`SELECT app_workflow_key FROM platform_runs WHERE id='${launched}';`), 'readiness-intake');
  await assert.rejects(sql(launchCall(owner,Number(launchRevision)-1)),/conflict/);
  await assert.rejects(sql(launchCall(owner,launchRevision,randomUUID(),launchInputs,json([{resourceType:'property_shortlist',resourceId:propertyId,expectedRevision:2}]))),/stale|unavailable|conflict/);
  await assert.rejects(sql(launchCall(foreign)),/denied/);
  await assert.rejects(sql(launchCall(reviewer,launchRevision,randomUUID())),/denied/,
    'reviewers may review permitted checkpoints but cannot initiate app runs');
  await sql(`SELECT id FROM platform_save_app_install('${owner}','${workspace}',${json(launchManifest)},${json({area:'keller-westlake'})},'disabled',${launchRevision});`);
  await assert.rejects(sql(launchCall()),/disabled|denied/);
  await sql(`SELECT id FROM platform_save_app_install('${owner}','${workspace}',${json(launchManifest)},${json({area:'keller-westlake'})},'installed',${Number(launchRevision)+1});`);
  const currentReadinessRevision=await sql(`SELECT revision FROM platform_app_installs WHERE id='${app}';`);
  const memberPropertyRun=await sql(`SELECT id::text FROM platform_start_app_run('${member}','${workspace}','${app}',${currentReadinessRevision},'readiness-intake','${randomUUID()}',${launchInputs},${launchRefs});`);
  const contentRevision=await sql(`SELECT revision FROM platform_app_installs WHERE id='${contentApp}';`);
  await assert.rejects(sql(`SELECT id FROM platform_start_app_run('${reviewer}','${workspace}','${contentApp}',${contentRevision},'review-intake','${randomUUID()}',${json({revision_id:'revision-1'})},'[]'::jsonb);`),/denied/);
  const reviewerContentRun=await sql(`SELECT id::text FROM platform_start_app_run('${member}','${workspace}','${contentApp}',${contentRevision},'review-intake','${randomUUID()}',${json({revision_id:'revision-1'})},'[]'::jsonb);`);
  await tick(memberPropertyRun,1);
  await tick(reviewerContentRun,1);
  const memberCheckpoint=await cp(memberPropertyRun,'missing_fact');
  const reviewerCheckpoint=await cp(reviewerContentRun,'review_notes');
  await sql(`SELECT id FROM platform_respond_checkpoint('${member}','${workspace}','${memberCheckpoint}',1,'${randomUUID()}','"Please verify the parcel details"');`);
  await sql(`SELECT id FROM platform_respond_checkpoint('${reviewer}','${workspace}','${reviewerCheckpoint}',1,'${randomUUID()}','"Clarify the source date before sharing"');`);
  await tick(memberPropertyRun,2);
  await tick(reviewerContentRun,2);
  assert.equal(await sql(`SELECT status FROM platform_runs WHERE id='${memberPropertyRun}';`),'completed');
  assert.equal(await sql(`SELECT status FROM platform_runs WHERE id='${reviewerContentRun}';`),'completed');
  assert.equal(await sql(`SELECT app_manifest_hash=(SELECT manifest_hash FROM platform_app_installs WHERE id='${app}')
    AND app_install_revision=(SELECT revision FROM platform_app_installs WHERE id='${app}')
    AND app_workflow_key='readiness-intake'
    AND app_resource_refs @> ${json([{resourceType:'property_shortlist',resourceId:propertyId,expectedRevision:1}])}
    FROM platform_runs WHERE id='${memberPropertyRun}';`),'t','property output remains attached to its exact app, install revision, workflow and mapped property revision');
  assert.equal(await sql(`SELECT app_manifest_hash=(SELECT manifest_hash FROM platform_app_installs WHERE id='${contentApp}')
    AND app_install_revision=(SELECT revision FROM platform_app_installs WHERE id='${contentApp}')
    AND app_workflow_key='review-intake' AND app_inputs->>'revision_id'='revision-1'
    FROM platform_runs WHERE id='${reviewerContentRun}';`),'t','review output remains attached to its app/version and submitted content revision reference');
  assert.equal(await sql(`SELECT response#>>'{}' FROM platform_checkpoints WHERE id='${memberCheckpoint}';`),'Please verify the parcel details');
  assert.equal(await sql(`SELECT resolved_by::text FROM platform_checkpoints WHERE id='${reviewerCheckpoint}';`),reviewer,'review evidence is attributed to the reviewer');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_audit_events WHERE workspace_id='${workspace}' AND action='checkpoint.resolved'
    AND actor_id='${reviewer}' AND resource_type='platform_checkpoint' AND resource_id='${reviewerCheckpoint}';`),'1','reviewer identity is preserved in append-only checkpoint audit evidence');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_capability_reservations WHERE run_id IN ('${memberPropertyRun}','${reviewerContentRun}');`),'0');
  assert.equal(await sql(`SELECT COALESCE(sum(CASE WHEN status='reserved' THEN estimated_cost_usd ELSE 0 END),0)=0
    AND COALESCE(sum(actual_cost_usd),0)=0 FROM platform_capability_reservations
    WHERE run_id IN ('${memberPropertyRun}','${reviewerContentRun}');`),'t','no estimated reserve or actual cost was recorded for capability-empty work');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_effect_receipts WHERE run_id IN ('${memberPropertyRun}','${reviewerContentRun}');`),'0');
  assert.equal(await sql(`SELECT count(*)::text FROM platform_audit_events WHERE workspace_id='${workspace}' AND resource_type='platform_run' AND resource_id IN ('${memberPropertyRun}','${reviewerContentRun}') AND action='run.app_started';`),'2');
  await sql(`UPDATE workflow_event_contracts SET enabled=false WHERE workflow_key='platform_run';`);
  console.log('PASS: app launch pins install/workflow/resource revisions, replays atomically and denies stale, foreign and disabled requests');
  console.log('PASS: two-app pilot rehearsal records member/reviewer outputs, role denial, zero provider reservations/effects and run audit evidence');
  const propertyJob = randomUUID(), propertyToken = randomUUID();
  await sql(`INSERT INTO workflow_jobs(id,schedule_id,user_id,workflow_key,planning_mode,scheduled_for,status,lease_token,lease_until)
    VALUES('${propertyJob}','${schedule}','${owner}','sprint_planner','property_shortlist',now()+interval '3 minutes','running','${propertyToken}',now()+interval '1 minute');`);
  const propertyBacklog = json([{ property_id: propertyId, input_revision: 1, property_task_kind: 'verify_facts', dedupe_key: `property-${propertyId}-facts`, title: 'Verify property facts', description: 'Use mapped source facts only', priority: 1, estimate_minutes: 25 }]);
  const propertyItems = json([{ property_id: propertyId, property_revision: 1, dedupe_key: `property-${propertyId}-facts`, title: 'Verify property facts', description: 'Use mapped source facts only', priority: 1, estimate_minutes: 25 }]);
  const propertyProposalCall = `SELECT sprint_id::text FROM platform_persist_scoped_property_sprint_proposal('${propertyJob}','${workspace}','${propertyToken}',(SELECT scheduled_for FROM workflow_jobs WHERE id='${propertyJob}'),'Scoped property sprint','Validate mapped property',${propertyBacklog},${propertyItems});`;
  const [propertyProposal, propertyReplay] = await Promise.all([sql(propertyProposalCall), sql(propertyProposalCall)]);
  assert.match(propertyProposal, /^[0-9a-f-]{36}$/i);
  assert.equal(propertyReplay, propertyProposal);
  assert.equal(await sql(`SELECT workspace_id::text FROM platform_scope_links WHERE resource_type='sprint' AND resource_id='${propertyProposal}';`), workspace);
  assert.equal(await sql(`SELECT sprint_id::text FROM platform_persist_scoped_property_sprint_proposal('${propertyJob}','${workspace}','${propertyToken}',(SELECT scheduled_for FROM workflow_jobs WHERE id='${propertyJob}'),'Changed name','Changed goal',${propertyBacklog},${propertyItems});`), propertyProposal);
  console.log('PASS: scoped property persistence validates mapped property revision, creates backlog/sprint scope and replays');
  await sql(`UPDATE platform_workspaces SET status='archived' WHERE id='${workspace}';`);
  await assert.rejects(sql(`SELECT id FROM platform_add_sprint_backlog_item('${owner}','${workspace}','Blocked','',3,30,'manual',NULL);`),/denied/);
  await assert.rejects(sql(install()),/denied/);
  assert.equal(await visible(owner),'0');
  console.log('PASS: scope transfers roll back, archived mutations denied, mixed/team legacy planning fails closed');
}
