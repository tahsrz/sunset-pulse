import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { command, withDockerService } from './docker-acceptance.mjs';

await withDockerService('scheduler-test', async (container) => {
  const sql = (input) => command('docker', [
    'exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'postgres',
    '-d', 'scheduler_acceptance', '-v', 'ON_ERROR_STOP=1',
  ], { input: `SET statement_timeout = '15s';\n${input}`, timeout: 20_000 });

  // Minimal external prerequisites only. Scheduler definitions below come from
  // real migrations. Full Supabase replay/auth/storage remains test:db's scope.
  await sql(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE TABLE public.licensed_workflow_settings (id uuid PRIMARY KEY);
    CREATE TABLE public.licensed_workflow_runs (id uuid PRIMARY KEY);
  `);
  const migrations = [
    '20260912040000_durable_workflow_scheduler.sql',
    '20260912060000_scheduled_sprints.sql',
    '20260912070000_scheduler_foundation.sql',
    '20260912080000_scheduler_controls.sql',
    '20260912090000_scheduler_lease_fencing.sql',
    '20260912100000_scheduler_dispatch_fencing.sql',
    '20260914040000_scheduler_retry_policy.sql',
    '20260914060000_scheduler_terminal_fencing.sql',
    '20260914070000_scheduler_registry_retry_pause.sql',
    '20260916020000_event_workflow_jobs.sql',
    '20260916030000_scheduler_live_lease_and_event_replay.sql',
    '20260916040000_scheduler_deferred_outcomes.sql',
  ];
  for (const migration of migrations) {
    await sql(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'));
  }
  await sql(await readFile(new URL('../supabase/migrations/20260916040000_scheduler_deferred_outcomes.sql', import.meta.url), 'utf8'));

  const owner = randomUUID(), otherOwner = randomUUID(), schedule = randomUUID();
  const event = (key, payload = '{}', time = 'NULL', user = owner) =>
    `SELECT id FROM enqueue_workflow_event('${user}', 'sprint_planner', '${key}', '${payload}'::jsonb, 1, ${time});`;
  await sql(`INSERT INTO auth.users VALUES ('${owner}'), ('${otherOwner}');
    INSERT INTO workflow_schedules(id,user_id,workflow_key,enabled) VALUES ('${schedule}','${owner}','sprint_planner',true);
    INSERT INTO workflow_jobs(schedule_id,user_id,workflow_key,scheduled_for) VALUES ('${schedule}','${owner}','sprint_planner',now()-interval '2 minutes');`);
  const eventJob = await sql(event('claim-event'));

  async function waitForSession(name, predicate) {
    for (let i = 0; i < 50; i++) {
      if (await sql(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='${name}' AND ${predicate});`) === 't') return;
      await delay(40);
    }
    throw new Error(`Session ${name} never reached ${predicate}`);
  }

  // Observe A holding the row lock before B claims. Promise.all alone is not
  // proof that transactions overlap. The wait observation is an assertion.
  const first = sql(`SET application_name='claim_a'; BEGIN;
    SELECT id FROM claim_workflow_jobs(1,30); SELECT pg_sleep(3); COMMIT;`);
  first.catch(() => {});
  let claims;
  try {
    await waitForSession('claim_a', "wait_event='PgSleep'");
    const second = await sql('SELECT id FROM claim_workflow_jobs(1,30);');
    await waitForSession('claim_a', "wait_event='PgSleep'");
    assert.equal(second, eventJob, 'B must skip the scheduled row locked by A');
    claims = [await first, second];
    assert.equal(new Set(claims).size, 2);
  } finally { await first; }
  assert.equal(await sql("SELECT count(*) FROM workflow_jobs WHERE status='running' AND attempts=1 AND lease_token IS NOT NULL;"), '2');
  console.log('PASS: overlapping scheduled/event claims skip locks and advance once');

  const enqueueA = sql(`SET application_name='enqueue_a'; BEGIN; ${event('duplicate')} SELECT pg_sleep(3); COMMIT;`);
  enqueueA.catch(() => {});
  let enqueueB;
  try {
    await waitForSession('enqueue_a', "wait_event='PgSleep'");
    enqueueB = sql(`SET application_name='enqueue_b'; ${event('duplicate')}`);
    enqueueB.catch(() => {});
    await waitForSession('enqueue_b', "wait_event_type='Lock'");
    const ids = await Promise.all([enqueueA, enqueueB]);
    assert.equal(ids[0], ids[1]);
    assert.equal(await sql("SELECT count(*) FROM workflow_jobs WHERE event_key='duplicate';"), '1');
  } finally { await Promise.allSettled([enqueueA, enqueueB]); }
  console.log('PASS: conflicting inserts overlap and return one persisted job');

  const immediate = await sql(event('immediate'));
  assert.equal(await sql(event('immediate')), immediate);
  assert.notEqual(await sql(event('immediate', '{}', 'NULL', otherOwner)), immediate);
  await assert.rejects(sql(event('immediate', '{"changed":true}')), /different payload/);
  await assert.rejects(sql(event('immediate', '{}', "'2099-01-01'::timestamptz")), /different payload/);
  console.log('PASS: immediate replay, owner separation and conflicting payload/time');

  const job = claims[0];
  const token = await sql(`SELECT lease_token FROM workflow_jobs WHERE id='${job}';`);
  await sql(`UPDATE workflow_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id='${job}';`);
  assert.equal(await sql(`SELECT complete_workflow_job_with_result('${job}','${token}','sprint','${randomUUID()}');`), 'f');
  assert.equal(await sql(`SELECT status FROM resolve_workflow_failure('${job}','${token}','late');`), 'stale');
  assert.equal(await sql(`SELECT fail_workflow_job('${job}','${token}','late');`), 'f');
  assert.equal(await sql(`SELECT count(*) FROM workflow_results WHERE job_id='${job}';`), '0');
  console.log('PASS: expired lease cannot complete/fail before recovery');

  const valid = claims[1];
  const validToken = await sql(`SELECT lease_token FROM workflow_jobs WHERE id='${valid}';`);
  assert.equal(await sql(`SELECT complete_workflow_job_with_result('${valid}','${validToken}','sprint','${randomUUID()}');`), 't');
  assert.equal(await sql(`SELECT count(*) FROM workflow_results WHERE job_id='${valid}';`), '1');
  assert.equal(await sql(`SELECT has_function_privilege('authenticated','enqueue_workflow_event(uuid,text,text,jsonb,integer,timestamptz)','EXECUTE');`), 'f');
  console.log('PASS: live completion writes one result; browser enqueue denied');

  const deferredJob = await sql(event('deferred'));
  await sql(`SELECT id FROM claim_workflow_jobs(10,30) WHERE id='${deferredJob}';`);
  const deferredToken = await sql(`SELECT lease_token FROM workflow_jobs WHERE id='${deferredJob}';`);
  assert.equal(await sql(`SELECT status FROM defer_workflow_job('${deferredJob}','${deferredToken}',clock_timestamp()+interval '5 minutes','waiting for a source');`), 'deferred');
  assert.equal(await sql(`SELECT status FROM workflow_jobs WHERE id='${deferredJob}';`), 'deferred');
  assert.equal(await sql(`SELECT attempts FROM workflow_jobs WHERE id='${deferredJob}';`), '1');
  await sql(`UPDATE workflow_jobs SET retry_at=clock_timestamp()-interval '1 second' WHERE id='${deferredJob}';`);
  const deferredRetryToken = await sql(`SELECT lease_token FROM claim_workflow_jobs(10,30) WHERE id='${deferredJob}';`);
  assert.notEqual(deferredRetryToken, '');
  assert.equal(await sql(`SELECT attempts FROM workflow_jobs WHERE id='${deferredJob}';`), '1');
  assert.equal(await sql(`SELECT poll_attempts FROM workflow_jobs WHERE id='${deferredJob}';`), '1');
  console.log('PASS: deferred poll resumes without consuming execution attempts');

  const cancelledDeferred = await sql(event('cancel-deferred'));
  await sql(`SELECT id FROM claim_workflow_jobs(10,30) WHERE id='${cancelledDeferred}';`);
  const cancelledToken = await sql(`SELECT lease_token FROM workflow_jobs WHERE id='${cancelledDeferred}';`);
  assert.equal(await sql(`SELECT status FROM defer_workflow_job('${cancelledDeferred}','${cancelledToken}',clock_timestamp()+interval '5 minutes','cancel me');`), 'deferred');
  assert.equal(await sql(`SELECT cancel_workflow_job('${cancelledDeferred}','${owner}');`), 't');
  assert.equal(await sql(`SELECT status FROM workflow_jobs WHERE id='${cancelledDeferred}';`), 'cancelled');
  await sql(`UPDATE workflow_jobs SET retry_at=clock_timestamp()-interval '1 second' WHERE id='${cancelledDeferred}';`);
  assert.equal(await sql(`SELECT count(*) FROM claim_workflow_jobs(10,30) WHERE id='${cancelledDeferred}';`), '0');
  console.log('PASS: cancellation fences a deferred poll');

  const pausedSchedule = randomUUID();
  const pausedDeferred = randomUUID();
  await sql(`INSERT INTO workflow_schedules(id,user_id,workflow_key,enabled) VALUES ('${pausedSchedule}','${otherOwner}','sprint_planner',true);
    INSERT INTO workflow_jobs(id,schedule_id,user_id,workflow_key,scheduled_for) VALUES ('${pausedDeferred}','${pausedSchedule}','${otherOwner}','sprint_planner',clock_timestamp()-interval '1 minute');`);
  await sql(`SELECT id FROM claim_workflow_jobs(10,30) WHERE id='${pausedDeferred}';`);
  const pausedToken = await sql(`SELECT lease_token FROM workflow_jobs WHERE id='${pausedDeferred}';`);
  assert.equal(await sql(`SELECT status FROM defer_workflow_job('${pausedDeferred}','${pausedToken}',clock_timestamp()+interval '5 minutes','pause me');`), 'deferred');
  await sql(`UPDATE workflow_schedules SET enabled=false WHERE id='${pausedSchedule}'; UPDATE workflow_jobs SET retry_at=clock_timestamp()-interval '1 second' WHERE id='${pausedDeferred}';`);
  assert.equal(await sql(`SELECT count(*) FROM claim_workflow_jobs(10,30) WHERE id='${pausedDeferred}';`), '0');
  console.log('PASS: paused schedules keep deferred polls unclaimable');

  const exhaustedJob = await sql(event('poll-budget'));
  await sql(`SELECT id FROM claim_workflow_jobs(10,30) WHERE id='${exhaustedJob}';`);
  const exhaustedToken = await sql(`SELECT lease_token FROM workflow_jobs WHERE id='${exhaustedJob}';`);
  await sql(`UPDATE workflow_jobs SET poll_attempts=20 WHERE id='${exhaustedJob}';`);
  assert.equal(await sql(`SELECT status FROM defer_workflow_job('${exhaustedJob}','${exhaustedToken}',clock_timestamp()+interval '5 minutes','too many polls');`), 'poll_exhausted');
  assert.equal(await sql(`SELECT status FROM workflow_jobs WHERE id='${exhaustedJob}';`), 'failed');
  console.log('PASS: deferred polling has a terminal budget');
}).catch((error) => { console.error(error.message); process.exitCode = 1; });
