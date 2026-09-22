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

  const fixture=JSON.parse(await readFile(new URL('../lib/platform/apps/manifests/real-estate-readiness.v1.json',import.meta.url),'utf8'));
  const content=JSON.parse(await readFile(new URL('../lib/platform/apps/manifests/client-content-review.v1.json',import.meta.url),'utf8'));
  const install=(manifest=fixture,revision='NULL',actor=owner,settings={area:'keller-westlake'})=>
    `SELECT id FROM platform_save_app_install('${actor}','${workspace}',${json(manifest)},${json(settings)},'installed',${revision});`;
  await assert.rejects(sql(install(fixture,'NULL',member)),/denied/);
  const [app,appReplay]=await Promise.all([sql(install()),sql(install())]);
  assert.equal(app,appReplay);
  await sql(install(content,'NULL',owner,{review_mode:'human_review'}));
  await assert.rejects(sql(install({...fixture,title:'Changed without a version'},'1')),/pinned/);
  await assert.rejects(sql(install({...fixture,capabilities:[{tool:'send'}]},'1')),/Unsupported/);
  await assert.rejects(sql(install({...fixture,inputSchema:{...fixture.inputSchema,$ref:'https://external.example'}},'1')),/Unsupported/);
  await assert.rejects(sql(install(fixture,'1',owner,{area:'Dallas'})),/bounds/);
  const upgrades=await Promise.allSettled([sql(install({...fixture,version:2},'1')),sql(install({...fixture,version:3},'1'))]);
  assert.equal(upgrades.filter((r)=>r.status==='fulfilled').length,1);
  assert.equal(await sql(`SELECT definition->>'version' FROM platform_runs WHERE id='${run}';`),'1','install upgrade does not rewrite pinned runs');
  assert.equal(await sql(`SELECT manifest_hash=encode(sha256(convert_to(manifest::TEXT,'UTF8')),'hex') FROM platform_app_installs WHERE id='${app}';`),'t');
  const visible=(actor)=>sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${actor}'; SELECT count(*) FROM platform_app_installs WHERE workspace_id='${workspace}'; COMMIT;`);
  assert.equal(await visible(owner),'2');
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
    VALUES('${scopedJob}','${schedule}','${owner}','sprint_planner',(SELECT scheduled_for FROM workflow_jobs WHERE id='${job}'),'running','${scopedToken}',now()+interval '1 minute');`);
  const scopedItems = json([{ backlog_item_id: scopedBacklog }]);
  const scopedProposal = await sql(`SELECT sprint_id::text FROM platform_persist_scoped_sprint_proposal('${scopedJob}','${workspace}',(SELECT scheduled_for FROM workflow_jobs WHERE id='${scopedJob}'),'Scoped team sprint','Validate mapped backlog',${scopedItems});`);
  assert.match(scopedProposal, /^[0-9a-f-]{36}$/i);
  assert.equal(await sql(`SELECT workspace_id::text FROM platform_scope_links WHERE resource_type='sprint' AND resource_id='${scopedProposal}';`), workspace);
  assert.equal(await sql(`SELECT sprint_id::text FROM platform_persist_scoped_sprint_proposal('${scopedJob}','${workspace}',(SELECT scheduled_for FROM workflow_jobs WHERE id='${scopedJob}'),'Changed name','Changed goal',${scopedItems});`), scopedProposal);
  await assert.rejects(sql(`SELECT sprint_id::text FROM platform_persist_scoped_sprint_proposal('${scopedJob}','${other}',(SELECT scheduled_for FROM workflow_jobs WHERE id='${scopedJob}'),'Foreign workspace','Should fail',${scopedItems});`),/workspace|mapped|member/);
  console.log('PASS: scoped sprint persistence validates schedule mapping, backlog mapping, replay and foreign workspace denial');
  await sql(`UPDATE platform_workspaces SET status='archived' WHERE id='${workspace}';`);
  await assert.rejects(sql(`SELECT id FROM platform_add_sprint_backlog_item('${owner}','${workspace}','Blocked','',3,30,'manual',NULL);`),/denied/);
  await assert.rejects(sql(install()),/denied/);
  assert.equal(await visible(owner),'0');
  console.log('PASS: scope transfers roll back, archived mutations denied, mixed/team legacy planning fails closed');
}
