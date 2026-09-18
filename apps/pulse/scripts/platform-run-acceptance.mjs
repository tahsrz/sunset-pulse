import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

// Invoked at the end of the existing disposable scheduler replay. All data and
// event-contract activation below belong to that throwaway Postgres container.
export async function platformRunAcceptance(sql) {
  const owner = randomUUID(), stranger = randomUUID(), reviewer = randomUUID(), member = randomUUID();
  const workspace = randomUUID();
  const json = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  const definition = {
    schemaVersion: 1, key: 'readiness', version: 1, entry: 'question', nodes: [
      { id: 'question', kind: 'checkpoint', type: 'question', prompt: 'Which area?', responseSchema: { type: 'string', enum: ['Keller', 'Westlake'] }, next: 'done' },
      { id: 'done', kind: 'complete' },
    ],
  };
  await sql(`INSERT INTO auth.users(id) VALUES ('${owner}'),('${stranger}'),('${reviewer}'),('${member}');
    SELECT workspace_id FROM platform_create_workspace_with_owner('${owner}','${workspace}','team','Core fixture');
    INSERT INTO platform_memberships(workspace_id,user_id,role,status)
    VALUES ('${workspace}','${reviewer}','reviewer','active'),('${workspace}','${member}','member','active');`);
  const start = (key = randomUUID(), graph = definition, actor = owner) =>
    `SELECT id FROM platform_start_run('${actor}','${workspace}','${key}',${json(graph)});`;
  await assert.rejects(sql(start()), /admission is disabled/);
  assert.equal(await sql(`SELECT count(*) FROM platform_runs WHERE workspace_id='${workspace}';`), '0', 'disabled enqueue must roll back the run');
  await sql("UPDATE workflow_event_contracts SET enabled=true WHERE workflow_key='platform_run';");
  await assert.rejects(sql(start(randomUUID(), definition, stranger)), /denied/);
  await assert.rejects(sql(start(randomUUID(), definition, reviewer)), /denied/);
  const cycle = structuredClone(definition); cycle.nodes[0].next = 'question';
  await assert.rejects(sql(start(randomUUID(), cycle)), /cycle/);
  const key = randomUUID();
  const [run, duplicate] = await Promise.all([sql(start(key)), sql(start(key))]);
  assert.equal(run, duplicate);
  await assert.rejects(sql(start(key, { ...definition, version: 2 })), /content conflict/);
  assert.equal(await sql(`SELECT count(*) FROM workflow_jobs WHERE workflow_key='platform_run' AND payload->>'runId'='${run}';`), '1');

  const jobFor = (id, generation) => sql(`SELECT id FROM workflow_jobs WHERE workflow_key='platform_run' AND payload->>'runId'='${id}' AND payload->>'generation'='${generation}';`);
  const claim = async (id, generation) => {
    const job = await jobFor(id, generation);
    await sql('SELECT id FROM claim_workflow_jobs(100,30);');
    const token = await sql(`SELECT lease_token FROM workflow_jobs WHERE id='${job}';`);
    assert.match(token, /^[a-f0-9-]{36}$/);
    return { job, token };
  };
  const tick = ({ job, token }) => sql(`SELECT run_status FROM platform_tick_run('${job}','${token}');`);
  const firstJob = await claim(run, 1);
  assert.equal(await tick(firstJob), 'waiting');
  assert.equal(await sql(`SELECT status FROM workflow_jobs WHERE id='${firstJob.job}';`), 'completed', 'human wait releases the worker');
  assert.equal(await sql(`SELECT result_type FROM workflow_results WHERE job_id='${firstJob.job}';`), 'platform_run');
  const checkpoint = await sql(`SELECT id FROM platform_checkpoints WHERE run_id='${run}';`);
  const answer = (id = checkpoint, submission = randomUUID(), value = 'Keller', actor = owner, revision = 1) =>
    `SELECT id FROM platform_respond_checkpoint('${actor}','${workspace}','${id}',${revision},'${submission}',${json(value)});`;
  await assert.rejects(sql(answer(checkpoint, randomUUID(), 42)), /response schema/);
  await assert.rejects(sql(answer(checkpoint, randomUUID(), 'Dallas')), /response schema/);
  await assert.rejects(sql(answer(checkpoint, randomUUID(), 'Keller', stranger)), /denied/);
  await sql("UPDATE workflow_event_contracts SET enabled=false WHERE workflow_key='platform_run';");
  await assert.rejects(sql(answer()), /admission is disabled/);
  assert.equal(await sql(`SELECT status FROM platform_checkpoints WHERE id='${checkpoint}';`), 'pending', 'failed resume enqueue rolls back the answer');
  await sql("UPDATE workflow_event_contracts SET enabled=true WHERE workflow_key='platform_run';");

  async function waitFor(name, predicate) {
    for (let index = 0; index < 60; index++) {
      if (await sql(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='${name}' AND ${predicate});`) === 't') return;
      await delay(30);
    }
    throw new Error(`Expected ${name} to reach ${predicate}`);
  }
  const submission = randomUUID();
  const winningAnswer = sql(`SET application_name='platform_answer_a'; BEGIN; ${answer(checkpoint, submission)} SELECT pg_sleep(3); COMMIT;`);
  winningAnswer.catch(() => {});
  let losingAnswer;
  try {
    await waitFor('platform_answer_a', "wait_event='PgSleep'");
    losingAnswer = sql(`SET application_name='platform_answer_b'; ${answer(checkpoint, randomUUID(), 'Westlake')}`);
    losingAnswer.catch(() => {});
    await waitFor('platform_answer_b', "wait_event_type='Lock'");
    await winningAnswer;
    await assert.rejects(losingAnswer, /response conflict/);
  } finally { await Promise.allSettled([winningAnswer, losingAnswer]); }
  assert.equal(await sql(answer(checkpoint, submission)), checkpoint, 'same submission replays');
  assert.equal(await sql(`SELECT count(*) FROM workflow_jobs WHERE payload->>'runId'='${run}';`), '2');
  assert.equal(await tick(await claim(run, 2)), 'completed');
  assert.equal(await sql(`SELECT state#>>'{answers,question}' FROM platform_runs WHERE id='${run}';`), 'Keller');
  assert.equal(await sql(`SELECT count(*) FROM platform_checkpoints WHERE run_id='${run}';`), '1');
  console.log('PASS: JSON run start dedupes, typed checkpoint waits release the worker, concurrent responses enqueue one resume');

  const expiredRun = await sql(start());
  const expiredJob = await claim(expiredRun, 1);
  await sql(`UPDATE workflow_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id='${expiredJob.job}';`);
  await assert.rejects(tick(expiredJob), /lease/);
  assert.equal(await sql(`SELECT count(*) FROM platform_checkpoints WHERE run_id='${expiredRun}';`), '0');
  assert.equal(await sql(`SELECT status FROM platform_runs WHERE id='${expiredRun}';`), 'ready');

  const delayedRun = await sql(start());
  const delayedJob = await claim(delayedRun, 1);
  const runLock = sql(`SET application_name='platform_run_lock'; BEGIN; SELECT id FROM platform_runs WHERE id='${delayedRun}' FOR UPDATE; SELECT pg_sleep(3); COMMIT;`);
  runLock.catch(() => {});
  let delayedTick;
  try {
    await waitFor('platform_run_lock', "wait_event='PgSleep'");
    await sql(`UPDATE workflow_jobs SET lease_until=clock_timestamp()+interval '1 second' WHERE id='${delayedJob.job}';`);
    delayedTick = sql(`SET application_name='platform_delayed_tick'; SELECT run_status FROM platform_tick_run('${delayedJob.job}','${delayedJob.token}');`);
    delayedTick.catch(() => {});
    await waitFor('platform_delayed_tick', "wait_event_type='Lock'");
    await runLock;
    await assert.rejects(delayedTick, /lease expired/);
  } finally { await Promise.allSettled([runLock, delayedTick]); }
  assert.equal(await sql(`SELECT count(*) FROM platform_checkpoints WHERE run_id='${delayedRun}';`), '0', 'lease expiry after a lock wait rolls back checkpoint writes');
  assert.equal(await sql(`SELECT count(*) FROM workflow_results WHERE job_id='${delayedJob.job}';`), '0');

  const cancelledRun = await sql(start());
  const cancelledJob = await claim(cancelledRun, 1);
  await sql(`SELECT id FROM platform_cancel_run('${owner}','${workspace}','${cancelledRun}',1);`);
  assert.equal(await tick(cancelledJob), 'cancelled');
  assert.equal(await sql(`SELECT count(*) FROM platform_checkpoints WHERE run_id='${cancelledRun}';`), '0');

  const pendingRun = await sql(start());
  await tick(await claim(pendingRun, 1));
  const pendingCheckpoint = await sql(`SELECT id FROM platform_checkpoints WHERE run_id='${pendingRun}';`);
  await sql(`SELECT id FROM platform_cancel_run('${owner}','${workspace}','${pendingRun}',2);`);
  await assert.rejects(sql(answer(pendingCheckpoint)), /revision conflict/);

  const target = { resourceType: 'fixture', resourceId: 'brief-1', revision: 1, contentHash: 'a'.repeat(64), action: 'review' };
  for (const type of ['approval', 'effect_gate']) {
    const graph = structuredClone(definition);
    graph.nodes[0] = { id: 'question', kind: 'checkpoint', type, prompt: 'Review the exact target', target, next: 'done' };
    const gateRun = await sql(start(randomUUID(), graph));
    await tick(await claim(gateRun, 1));
    const gate = await sql(`SELECT id FROM platform_checkpoints WHERE run_id='${gateRun}';`);
    await assert.rejects(sql(answer(gate, randomUUID(), true, member)), /denied/);
    if (type === 'effect_gate') await assert.rejects(sql(answer(gate, randomUUID(), true, reviewer)), /denied/);
    const decider = type === 'approval' ? reviewer : owner;
    await sql(answer(gate, randomUUID(), false, decider));
    assert.equal(await sql(`SELECT status FROM platform_runs WHERE id='${gateRun}';`), 'cancelled');
    assert.equal(await sql(`SELECT count(*) FROM workflow_jobs WHERE payload->>'runId'='${gateRun}';`), '1', 'rejection must not resume');
  }

  const revokedRun = await sql(start(randomUUID(), definition, member));
  const revokedJob = await claim(revokedRun, 1);
  await sql(`UPDATE platform_memberships SET status='revoked' WHERE workspace_id='${workspace}' AND user_id='${member}';`);
  assert.equal(await tick(revokedJob), 'blocked');
  await assert.rejects(sql(answer(checkpoint, submission, 'Keller', member)), /denied/);
  assert.equal(await sql(`SELECT count(*) FROM platform_audit_events WHERE workspace_id='${workspace}' AND action='checkpoint.resolved';`), '3');

  // Real PostgreSQL role/RLS assertions, with minimal auth.uid() fixture claims.
  const visible = (actor) => sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${actor}'; SELECT count(*) FROM platform_runs WHERE workspace_id='${workspace}'; COMMIT;`);
  assert.notEqual(await visible(owner), '0');
  assert.equal(await visible(stranger), '0');
  assert.equal(await visible(member), '0');
  assert.equal(await sql("SELECT has_function_privilege('authenticated','platform_respond_checkpoint(uuid,uuid,uuid,integer,uuid,jsonb)','EXECUTE');"), 'f');
  assert.equal(await sql("SELECT has_table_privilege('service_role','platform_runs','UPDATE');"), 'f');
  await sql(`UPDATE platform_workspaces SET status='archived' WHERE id='${workspace}';`);
  assert.equal(await visible(owner), '0');
  await assert.rejects(sql(start()), /denied/);
  console.log('PASS: stale leases, cancelled runs, gate roles, revoked requesters, audit attribution and authenticated RLS isolation');
}
