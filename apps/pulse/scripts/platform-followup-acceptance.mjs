import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function platformFollowupAcceptance(sql) {
  const owner=randomUUID(), member=randomUUID(), foreign=randomUUID(), workspace=randomUUID(), other=randomUUID();
  const json=(v)=>`'${JSON.stringify(v).replaceAll("'","''")}'::jsonb`;
  await sql(`INSERT INTO auth.users(id) VALUES('${owner}'),('${member}'),('${foreign}');
    SELECT workspace_id FROM platform_create_workspace_with_owner('${owner}','${workspace}','team','Followup fixture');
    SELECT workspace_id FROM platform_create_workspace_with_owner('${owner}','${other}','team','Other fixture');
    INSERT INTO platform_memberships(workspace_id,user_id,role,status) VALUES('${workspace}','${member}','member','active');`);
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
  const install=(manifest=fixture,revision='NULL',actor=owner,settings={area:'keller-westlake'})=>
    `SELECT id FROM platform_save_app_install('${actor}','${workspace}',${json(manifest)},${json(settings)},'installed',${revision});`;
  await assert.rejects(sql(install(fixture,'NULL',member)),/denied/);
  const [app,appReplay]=await Promise.all([sql(install()),sql(install())]);
  assert.equal(app,appReplay);
  await sql(install(content,'NULL',owner,{review_mode:'human_review'}));
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
  await sql(`SELECT workspace_id FROM platform_save_quota_limit('${owner}','${workspace}',1,3,1,NULL);`);
  const operation=randomUUID();
  const admit=(operationId=operation,cost='0.25')=>sql(`SELECT id::text FROM platform_admit_capability_operation('${workspace}','${app}','${run}','${operationId}','crm.local','contacts','lookup','${'a'.repeat(64)}','${'b'.repeat(64)}',1,${cost});`);
  const reservation=await admit();
  assert.equal(await admit(),reservation);
  await assert.rejects(admit(randomUUID(),'0.25'),/quota exceeded/);
  await assert.rejects(sql(`SELECT id FROM platform_admit_capability_operation('${workspace}','${app}','${run}','${randomUUID()}','crm.local','contacts','lookup','${'f'.repeat(64)}','${'b'.repeat(64)}',1,0.1);`),/not admitted/);
  assert.equal(await sql(`SELECT status FROM platform_capability_reservations WHERE id='${reservation}';`),'reserved');
  const connector=await sql(`SELECT id::text FROM platform_save_connector_definition('${owner}','${workspace}','crm.local','mcp','CRM','https://crm.example.test/mcp','crm-secret',NULL);`);
  const connectorSchemaValue={type:'object',properties:{email:{type:'string',maxLength:320}},required:['email'],additionalProperties:false};
  const connectorSchema=json(connectorSchemaValue);
  const snapshot=await sql(`SELECT id::text FROM platform_save_connector_schema_snapshot('${owner}','${workspace}','${connector}','contacts','lookup','input',${connectorSchema},NULL);`);
  assert.equal(await sql(`SELECT schema_hash=encode(sha256(convert_to(schema::TEXT,'UTF8')),'hex') FROM platform_connector_schema_snapshots WHERE id='${snapshot}';`),'t');
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
  await sql(`SELECT id FROM platform_save_app_install('${owner}','${workspace}',${json(launchManifest)},${json({area:'keller-westlake'})},'disabled',${launchRevision});`);
  await assert.rejects(sql(launchCall()),/disabled|denied/);
  await sql(`SELECT id FROM platform_save_app_install('${owner}','${workspace}',${json(launchManifest)},${json({area:'keller-westlake'})},'installed',${Number(launchRevision)+1});`);
  await sql(`UPDATE workflow_event_contracts SET enabled=false WHERE workflow_key='platform_run';`);
  console.log('PASS: app launch pins install/workflow/resource revisions, replays atomically and denies stale, foreign and disabled requests');
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
