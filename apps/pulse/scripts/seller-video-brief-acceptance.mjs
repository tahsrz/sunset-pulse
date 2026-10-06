import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function sellerVideoBriefAcceptance(sql) {
  const owner = randomUUID();
  const stranger = randomUUID();
  const reviewer = randomUUID();
  const member = randomUUID();
  const workspace = randomUUID();
  const otherWorkspace = randomUUID();
  const backlogItem = randomUUID();
  const briefId = randomUUID();
  const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
  const json = (value) => `${quote(JSON.stringify(value))}::jsonb`;

  await sql(`
    INSERT INTO auth.users(id,email) VALUES ('${owner}','seller-video-owner@example.test'),('${stranger}','seller-video-stranger@example.test'),('${reviewer}','seller-video-reviewer@example.test'),('${member}','seller-video-member@example.test');
    SELECT workspace_id FROM public.platform_create_workspace_with_owner('${owner}','${workspace}','personal','Seller video workspace');
    SELECT workspace_id FROM public.platform_create_workspace_with_owner('${owner}','${otherWorkspace}','team','Other seller video workspace');
    INSERT INTO public.platform_memberships(workspace_id,user_id,role,status) VALUES ('${workspace}','${reviewer}','reviewer','active'),('${workspace}','${member}','member','active');
    SELECT id FROM public.platform_add_sprint_backlog_item('${owner}','${workspace}','Record seller video','Synthetic acceptance task',2,45,'manual','seller-video-acceptance');
  `);
  const linkedBacklogId = await sql(`SELECT resource_id FROM public.platform_scope_links WHERE workspace_id='${workspace}' AND resource_type='sprint_backlog_item' AND owner_id='${owner}';`);
  assert.match(linkedBacklogId, /^[0-9a-f-]{36}$/i);

  const brief = {
    schemaVersion: 1,
    briefId,
    revision: 1,
    supersedesBriefId: null,
    backlogLink: { itemId: linkedBacklogId, expectedRevision: 1 },
    topic: 'Seller photo-day checklist',
    audienceNeed: 'Homeowners want practical steps before photography.',
    hook: 'Three small steps can make photo day simpler.',
    script: 'Start with the entryway, clear daily items, and make the rooms ready for photos.',
    shotList: ['Show a clear entryway before the checklist.'],
    claimEvidence: [],
    listingPermission: { status: 'not-needed', listingReference: null, evidenceReference: null },
    channels: ['tiktok'],
    ctaOfferKey: 'seller-plan',
    campaignKey: 'seller-photo-prep',
    reviewStatus: 'draft',
    reviewedByUserId: null,
    reviewedAt: null,
    reviewNotes: null,
  };
  const save = (actor, targetWorkspace, value) => sql(`SELECT reused::text FROM public.platform_save_seller_video_brief('${actor}','${targetWorkspace}',${json(value)});`);

  assert.equal(await save(owner, workspace, brief), 'false', 'the initial private draft should be saved once');
  assert.equal(await save(owner, workspace, brief), 'true', 'identical retries should reuse the immutable revision');
  await assert.rejects(save(owner, workspace, { ...brief, topic: 'Changed content in an existing revision' }), /already exists with different content/);
  await assert.rejects(save(owner, otherWorkspace, brief), /Linked backlog item is not available in this workspace/);
  await assert.rejects(save(stranger, workspace, brief), /Workspace action denied/);
  await assert.rejects(save(owner, workspace, { ...brief, reviewStatus: 'approved', reviewedByUserId: owner, reviewedAt: new Date().toISOString() }), /Only a valid, unreviewed seller video brief draft can be saved/);

  await sql("UPDATE public.workflow_event_contracts SET enabled=true WHERE workflow_key='platform_run';");
  const reviewStart = (actor, id, revision, key = randomUUID()) =>
    sql(`SELECT id FROM public.platform_start_seller_video_review('${actor}','${workspace}','${id}',${revision},'${key}');`);
  const runId = await reviewStart(owner, briefId, 1);
  assert.equal(await reviewStart(owner, briefId, 1), runId, 'retries with a fresh request key cannot fork the same draft review');
  const pinned = JSON.parse(await sql(`SELECT definition#>'{nodes,0,target}' FROM public.platform_runs WHERE id='${runId}';`));
  assert.equal(pinned.resourceType, 'seller_video_brief');
  assert.equal(pinned.resourceId, briefId);
  assert.equal(pinned.revision, 1);
  assert.equal(pinned.contentHash, await sql(`SELECT encode(sha256(convert_to(brief_data::text,'UTF8')),'hex') FROM public.seller_video_briefs WHERE brief_id='${briefId}';`));
  assert.match(pinned.contentHash, /^[a-f0-9]{64}$/);
  await assert.rejects(reviewStart(stranger, randomUUID(), 1), /Workspace action denied/);
  const reviewJob = await sql(`SELECT id FROM public.claim_workflow_jobs(100,30) WHERE workflow_key='platform_run' AND payload->>'runId'='${runId}';`);
  const reviewLease = await sql(`SELECT lease_token FROM public.workflow_jobs WHERE id='${reviewJob}';`);
  assert.equal(await sql(`SELECT run_status FROM public.platform_tick_run('${reviewJob}','${reviewLease}');`), 'waiting');
  const checkpointId = await sql(`SELECT id FROM public.platform_checkpoints WHERE run_id='${runId}';`);
  const decide = (actor, checkpoint, decision, revision = 1, submission = randomUUID()) =>
    sql(`SELECT id FROM public.platform_respond_seller_video_review('${actor}','${workspace}','${checkpoint}',${revision},'${submission}',${decision});`);
  await assert.rejects(decide(member, checkpointId, true), /Workspace action denied/);
  const approvalSubmission = randomUUID();
  assert.equal(await decide(reviewer, checkpointId, true, 1, approvalSubmission), checkpointId, 'authorized reviewer can approve the pinned draft');
  assert.equal(await decide(reviewer, checkpointId, true, 1, approvalSubmission), checkpointId, 'the exact successful decision is idempotent');
  assert.equal(await sql(`SELECT response::text FROM public.platform_checkpoints WHERE id='${checkpointId}';`), 'true');
  assert.equal(await sql(`SELECT status FROM public.platform_runs WHERE id='${runId}';`), 'ready', 'review decision records evidence and queues only the next completion step');
  assert.equal(await sql(`SELECT count(*) FROM public.platform_audit_events WHERE resource_type='platform_checkpoint' AND resource_id='${checkpointId}' AND action='checkpoint.resolved';`), '1');
  const completionJob = await sql(`SELECT id FROM public.claim_workflow_jobs(100,30) WHERE workflow_key='platform_run' AND payload->>'runId'='${runId}' AND payload->>'generation'='2';`);
  const completionLease = await sql(`SELECT lease_token FROM public.workflow_jobs WHERE id='${completionJob}';`);
  assert.equal(await sql(`SELECT run_status FROM public.platform_tick_run('${completionJob}','${completionLease}');`), 'completed');
  assert.equal(await sql(`SELECT count(*) FROM public.platform_effect_receipts WHERE run_id='${runId}';`), '0', 'human review does not create or execute provider effects');

  const staleBrief = { ...brief, briefId: randomUUID() };
  await save(owner, workspace, staleBrief);
  const staleRun = await reviewStart(owner, staleBrief.briefId, 1);
  const staleJob = await sql(`SELECT id FROM public.claim_workflow_jobs(100,30) WHERE workflow_key='platform_run' AND payload->>'runId'='${staleRun}';`);
  const staleLease = await sql(`SELECT lease_token FROM public.workflow_jobs WHERE id='${staleJob}';`);
  assert.equal(await sql(`SELECT run_status FROM public.platform_tick_run('${staleJob}','${staleLease}');`), 'waiting');
  const staleCheckpoint = await sql(`SELECT id FROM public.platform_checkpoints WHERE run_id='${staleRun}';`);
  await sql(`SELECT revision FROM public.platform_update_sprint_backlog_item('${owner}','${workspace}','${linkedBacklogId}',1,'Updated video work','Revised task context',2,50,'open');`);
  await assert.rejects(decide(reviewer, staleCheckpoint, true), /Linked backlog item revision is stale/);
  assert.equal(await sql(`SELECT status FROM public.platform_checkpoints WHERE id='${staleCheckpoint}';`), 'pending', 'stale backlog evidence cannot resolve the review');

  const evidenceBrief = {
    ...brief, briefId: randomUUID(), backlogLink: null,
    claimEvidence: [{ claim: 'This synthetic claim has no approved public basis.', sourceReference: 'Acceptance-only unverified source', sourceDate: null, publicationBasis: 'unknown', permissionEvidence: null }],
  };
  await save(owner, workspace, evidenceBrief);
  const evidenceRun = await reviewStart(owner, evidenceBrief.briefId, 1);
  const evidenceJob = await sql(`SELECT id FROM public.claim_workflow_jobs(100,30) WHERE workflow_key='platform_run' AND payload->>'runId'='${evidenceRun}';`);
  const evidenceLease = await sql(`SELECT lease_token FROM public.workflow_jobs WHERE id='${evidenceJob}';`);
  assert.equal(await sql(`SELECT run_status FROM public.platform_tick_run('${evidenceJob}','${evidenceLease}');`), 'waiting');
  const evidenceCheckpoint = await sql(`SELECT id FROM public.platform_checkpoints WHERE run_id='${evidenceRun}';`);
  await assert.rejects(decide(reviewer, evidenceCheckpoint, true), /need cleared publication evidence/);
  assert.equal(await decide(reviewer, evidenceCheckpoint, false), evidenceCheckpoint, 'reviewer can reject a draft with uncleared claims');
  assert.equal(await sql(`SELECT status FROM public.platform_runs WHERE id='${evidenceRun}';`), 'cancelled', 'rejection stops review without any downstream effect');

  const stale = { ...brief, briefId: randomUUID(), backlogLink: { ...brief.backlogLink, expectedRevision: 3 } };
  await assert.rejects(save(owner, workspace, stale), /Linked backlog item revision is stale/);
  const staleAtApproval = { ...brief, briefId: randomUUID() };
  await assert.rejects(save(owner, workspace, staleAtApproval), /Linked backlog item revision is stale/);
  await sql(`SELECT status FROM public.platform_remove_sprint_backlog_item('${owner}','${workspace}','${linkedBacklogId}',2);`);
  const cancelled = { ...brief, briefId: randomUUID(), backlogLink: { itemId: linkedBacklogId, expectedRevision: 3 } };
  await assert.rejects(save(owner, workspace, cancelled), /Linked backlog item is unavailable/);

  assert.equal(await sql(`SELECT has_table_privilege('authenticated','public.seller_video_briefs','INSERT');`), 'f', 'clients must not insert directly');
  assert.equal(await sql(`SELECT has_table_privilege('authenticated','public.seller_video_briefs','UPDATE');`), 'f', 'clients must not update immutable revisions');
  assert.equal(await sql(`SELECT has_table_privilege('service_role','public.platform_memberships','SELECT');`), 't', 'server-side workspace resolution can read memberships');
  assert.equal(await sql(`SELECT has_table_privilege('service_role','public.platform_workspaces','SELECT');`), 't', 'server-side workspace resolution can read workspace metadata');
  assert.equal(await sql(`SELECT has_table_privilege('authenticated','public.platform_memberships','SELECT');`), 'f', 'browser clients cannot enumerate workspace memberships directly');
  assert.equal(await sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${owner}'; SELECT count(*)::text FROM public.seller_video_briefs WHERE workspace_id='${workspace}'; COMMIT;`).then((result) => result.split(/\r?\n/).at(-1)), '3', 'workspace members can read only drafts saved in their workspace');
  assert.equal(await sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${stranger}'; SELECT count(*)::text FROM public.seller_video_briefs WHERE workspace_id='${workspace}'; COMMIT;`).then((result) => result.split(/\r?\n/).at(-1)), '0', 'non-members cannot read private drafts');
  await assert.rejects(sql(`UPDATE public.seller_video_briefs SET brief_data='{}'::jsonb WHERE brief_id='${briefId}';`), /Seller video brief revisions are immutable/);
  console.log('PASS: seller video drafts are immutable and private; exact-revision review is reviewer-gated, audited, idempotent, evidence- and backlog-fenced, and effect-free');
}
