import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function sellerVideoBriefAcceptance(sql) {
  const owner = randomUUID();
  const stranger = randomUUID();
  const workspace = randomUUID();
  const otherWorkspace = randomUUID();
  const backlogItem = randomUUID();
  const briefId = randomUUID();
  const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
  const json = (value) => `${quote(JSON.stringify(value))}::jsonb`;

  await sql(`
    INSERT INTO auth.users(id,email) VALUES ('${owner}','seller-video-owner@example.test'),('${stranger}','seller-video-stranger@example.test');
    SELECT workspace_id FROM public.platform_create_workspace_with_owner('${owner}','${workspace}','personal','Seller video workspace');
    SELECT workspace_id FROM public.platform_create_workspace_with_owner('${owner}','${otherWorkspace}','team','Other seller video workspace');
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

  const stale = { ...brief, briefId: randomUUID(), backlogLink: { ...brief.backlogLink, expectedRevision: 2 } };
  await assert.rejects(save(owner, workspace, stale), /Linked backlog item revision is stale/);
  await sql(`SELECT revision FROM public.platform_update_sprint_backlog_item('${owner}','${workspace}','${linkedBacklogId}',1,'Updated video work','Revised task context',2,50,'open');`);
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
  assert.equal(await sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${owner}'; SELECT count(*)::text FROM public.seller_video_briefs WHERE workspace_id='${workspace}'; COMMIT;`).then((result) => result.split(/\r?\n/).at(-1)), '1', 'workspace members can read their private draft');
  assert.equal(await sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${stranger}'; SELECT count(*)::text FROM public.seller_video_briefs WHERE workspace_id='${workspace}'; COMMIT;`).then((result) => result.split(/\r?\n/).at(-1)), '0', 'non-members cannot read private drafts');
  await assert.rejects(sql(`UPDATE public.seller_video_briefs SET brief_data='{}'::jsonb WHERE brief_id='${briefId}';`), /Seller video brief revisions are immutable/);
  console.log('PASS: seller video drafts are workspace-scoped, immutable, idempotent and backlog-revision fenced');
}
