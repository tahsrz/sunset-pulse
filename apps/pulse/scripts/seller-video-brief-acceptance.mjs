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
  const recordPublication = (actor, id, platform = 'tiktok', url = 'https://www.tiktok.com/@fixture/video/123456', publishedAt = '2026-10-05T12:00:00Z', key = randomUUID()) =>
    sql(`SELECT reused::text FROM public.platform_record_seller_video_publication('${actor}','${workspace}','${id}',1,'${platform}',${quote(url)},${quote(publishedAt)}::timestamptz,'${key}');`);
  const outcomeCapturedAt = await sql("SELECT (date_trunc('minute',now())-interval '1 minute')::text;");
  const recordOutcome = (actor, publicationId, values = {}, key = randomUUID()) => sql(`
    SELECT reused::text FROM public.platform_record_seller_video_publication_outcome(
      '${actor}','${workspace}','${publicationId}',${quote(outcomeCapturedAt)}::timestamptz,
      ${values.views ?? 120},${values.engagements ?? 18},${values.linkClicks ?? 4},
      ${values.sellerPlanRequests ?? 2},${quote(values.sourceNote ?? 'Entered from visible platform post insights.')},'${key}'
    );`);
  await assert.rejects(recordPublication(owner, briefId), /approved review for this exact brief revision is required/);
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
  await assert.rejects(recordPublication(member, briefId), /Workspace action denied/);
  await assert.rejects(recordPublication(stranger, briefId), /Workspace action denied/);
  await assert.rejects(recordPublication(owner, briefId, 'youtube-shorts'), /Platform, claim evidence, and media permission must match/);
  const publicationRequest = randomUUID();
  assert.equal(await recordPublication(owner, briefId, 'tiktok', undefined, undefined, publicationRequest), 'false', 'owner can record an already-published URL only after approval');
  assert.equal(await recordPublication(owner, briefId, 'tiktok', undefined, undefined, publicationRequest), 'true', 'exact publication retries reuse the immutable record');
  await assert.rejects(recordPublication(owner, briefId, 'tiktok', 'https://www.tiktok.com/@fixture/video/changed', undefined, publicationRequest), /idempotency key was reused with different content/i);
  await assert.rejects(recordPublication(owner, briefId, 'tiktok', 'https://www.tiktok.com/@fixture/video/conflicting', undefined, randomUUID()), /conflicts with an existing request or platform post/i);
  assert.equal(await sql(`SELECT count(*) FROM public.seller_video_publication_records WHERE workspace_id='${workspace}' AND brief_id='${briefId}';`), '1');
  assert.equal(await sql(`SELECT count(*) FROM public.platform_effect_receipts WHERE run_id='${runId}';`), '0', 'publication logging creates no provider or outbound effect');
  const publicationId = await sql(`SELECT id FROM public.seller_video_publication_records WHERE workspace_id='${workspace}' AND brief_id='${briefId}';`);
  await assert.rejects(recordOutcome(member, publicationId), /Workspace action denied/);
  await assert.rejects(recordOutcome(stranger, publicationId), /Workspace action denied/);
  await assert.rejects(recordOutcome(owner, publicationId, { views: 2, engagements: 3 }), /Seller video outcome snapshot is invalid/);
  const outcomeRequest = randomUUID();
  assert.equal(await recordOutcome(owner, publicationId, {}, outcomeRequest), 'false', 'owner can save bounded manual outcome measurements');
  assert.equal(await recordOutcome(owner, publicationId, {}, outcomeRequest), 'true', 'exact outcome retries reuse the immutable snapshot');
  await assert.rejects(recordOutcome(owner, publicationId, { views: 121 }, outcomeRequest), /idempotency key was reused with different content/i);
  await assert.rejects(recordOutcome(owner, publicationId, { views: 121 }), /conflicts with an existing capture/i);
  assert.equal(await sql(`SELECT count(*) FROM public.seller_video_publication_outcomes WHERE workspace_id='${workspace}' AND publication_id='${publicationId}';`), '1');
  assert.equal(await sql(`SELECT has_table_privilege('authenticated','public.seller_video_publication_outcomes','SELECT');`), 'f', 'outcome snapshots are private behind the owner/admin API');
  assert.equal(await sql(`SELECT has_table_privilege('authenticated','public.seller_video_publication_outcomes','INSERT');`), 'f', 'clients cannot directly write outcome snapshots');

  const siteAgent = `seller-video-${randomUUID()}`;
  const sellerLeadId = randomUUID();
  const foreignAgent = `seller-video-foreign-${randomUUID()}`;
  const foreignLeadId = randomUUID();
  await sql(`
    INSERT INTO public.site_config(id,agent_id,owner_id,status) VALUES (gen_random_uuid(),${quote(siteAgent)},'${owner}','active'),(gen_random_uuid(),${quote(foreignAgent)},'${stranger}','active');
    INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata)
      VALUES ('${sellerLeadId}',${quote(siteAgent)},'seller-video-acceptance','seller_plan','Fixture Seller','seller@example.test','Synthetic seller inquiry','{"sellerPlan":{"requestKind":"seller_plan"}}'::jsonb),
        ('${foreignLeadId}',${quote(foreignAgent)},'seller-video-foreign','seller_plan','Other Seller','other@example.test','Synthetic foreign seller inquiry','{}'::jsonb);
  `);
  const recordAttribution = (actor, leadId, note = 'Seller identified this post in their inquiry.', key = randomUUID()) => sql(`
    SELECT reused::text FROM public.platform_record_seller_lead_publication_attribution(
      '${actor}','${workspace}','${publicationId}','${leadId}',${quote(note)},'${key}'
    );
  `);
  await assert.rejects(recordAttribution(reviewer, sellerLeadId), /Workspace action denied/);
  await assert.rejects(recordAttribution(member, sellerLeadId), /Workspace action denied/);
  await assert.rejects(recordAttribution(owner, foreignLeadId), /Seller inquiry is unavailable to this site owner/);
  const attributionKey = randomUUID();
  assert.equal(await recordAttribution(owner, sellerLeadId, undefined, attributionKey), 'false', 'owner records a manually supplied relationship to a known post');
  assert.equal(await recordAttribution(owner, sellerLeadId, undefined, attributionKey), 'true', 'exact attribution retries reuse the immutable record');
  await assert.rejects(recordAttribution(owner, sellerLeadId, 'A changed source note', attributionKey), /idempotency key was reused with different content/i);
  await assert.rejects(recordAttribution(owner, sellerLeadId, 'The owner names another post.', randomUUID()), /different immutable attribution/i);
  assert.equal(await sql(`SELECT count(*) FROM public.seller_lead_publication_attributions WHERE workspace_id='${workspace}';`), '1');
  assert.equal(await sql(`SELECT has_table_privilege('authenticated','public.seller_lead_publication_attributions','SELECT');`), 'f', 'attribution records are private behind the owner API');
  assert.equal(await sql(`SELECT has_table_privilege('authenticated','public.seller_lead_publication_attributions','INSERT');`), 'f', 'clients cannot directly write attribution records');
  assert.equal(await sql(`SELECT count(*) FROM public.seller_lead_publication_attributions WHERE workspace_id='${workspace}' AND lead_id='${sellerLeadId}' AND to_jsonb(seller_lead_publication_attributions)->>'email' IS NULL;`), '1', 'persisted attribution contains only the lead ID rather than copied contact fields');

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
  assert.equal(await sql(`SELECT has_table_privilege('authenticated','public.seller_video_publication_records','SELECT');`), 'f', 'publication records are private behind the owner/admin API');
  assert.equal(await sql(`SELECT has_table_privilege('authenticated','public.seller_video_publication_records','INSERT');`), 'f', 'clients cannot write publication records directly');
  assert.equal(await sql(`SELECT has_table_privilege('service_role','public.platform_memberships','SELECT');`), 't', 'server-side workspace resolution can read memberships');
  assert.equal(await sql(`SELECT has_table_privilege('service_role','public.platform_workspaces','SELECT');`), 't', 'server-side workspace resolution can read workspace metadata');
  assert.equal(await sql(`SELECT has_table_privilege('authenticated','public.platform_memberships','SELECT');`), 'f', 'browser clients cannot enumerate workspace memberships directly');
  assert.equal(await sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${owner}'; SELECT count(*)::text FROM public.seller_video_briefs WHERE workspace_id='${workspace}'; COMMIT;`).then((result) => result.split(/\r?\n/).at(-1)), '3', 'workspace members can read only drafts saved in their workspace');
  assert.equal(await sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${stranger}'; SELECT count(*)::text FROM public.seller_video_briefs WHERE workspace_id='${workspace}'; COMMIT;`).then((result) => result.split(/\r?\n/).at(-1)), '0', 'non-members cannot read private drafts');
  await assert.rejects(sql(`UPDATE public.seller_video_briefs SET brief_data='{}'::jsonb WHERE brief_id='${briefId}';`), /Seller video brief revisions are immutable/);
  console.log('PASS: seller video drafts are immutable and private; exact-revision review is reviewer-gated, audited, idempotent, evidence- and backlog-fenced, and effect-free');
}
