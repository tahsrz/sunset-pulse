import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

export async function sellerConcurrencyAcceptance(sql, ownerId, workspaceId) {
  const createLead = async (label, owner = ownerId) => {
    const agentId = `seller-race-${label}-${randomUUID()}`;
    const leadId = randomUUID();
    await sql(`
      INSERT INTO auth.users(id,email) VALUES ('${owner}','seller-race-${label}@example.test') ON CONFLICT(id) DO NOTHING;
      INSERT INTO public.site_config(id,agent_id,owner_id,status)
        VALUES (gen_random_uuid(),'${agentId}','${owner}','active');
      INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata)
        VALUES ('${leadId}','${agentId}','${agentId}','seller_plan','Race fixture','race@example.test','Concurrency acceptance lead',
          jsonb_build_object('sellerPlan',jsonb_build_object('requestKind','seller_plan',
            'requestedContact',jsonb_build_object('granted',true,'capturedAt',now()))));
    `);
    return { agentId, leadId };
  };

  const sellerAction = (actor, leadId, action, values = {}, expectedRevision = 1) => sql(`
    SET request.jwt.claim.role='service_role';
    SELECT public.seller_lead_record_action('${actor}',jsonb_build_object(
      'leadId','${leadId}','expectedRevision',${expectedRevision},'requestKey','${randomUUID()}','action','${action}'
      ${Object.entries(values).map(([key, value]) => `,'${key}',${typeof value === 'string' ? `'${value.replaceAll("'", "''")}'` : value}`).join('')}
    ));
  `);

  const taskSave = ({ actor = ownerId, leadId, actionKey = 'initial-response:v1', key = randomUUID(), kind = 'follow_up' }) => sql(`
    SET request.jwt.claim.role='service_role';
    SELECT * FROM public.realtor_save_planner_item('${actor}','${workspaceId}',NULL,NULL,'${key}',
      jsonb_build_object('kind','${kind}','title','Seller response race','notes','','expectedAmountCents',NULL,
        'property',NULL,'sourceSprintTaskId',NULL,
        'sellerLead',jsonb_build_object('leadId','${leadId}','expectedLeadRevision',1,'actionKey','${actionKey}'),
        'due',jsonb_build_object('anchorDate',CURRENT_DATE+1,'localTime','09:00','timeZone','America/Chicago',
          'recurrence',jsonb_build_object('frequency','once'),'endsOn',NULL,'reminderOffsetsDays','[1]'::jsonb)),
      jsonb_build_array(jsonb_build_object('occurrenceKeyDate',CURRENT_DATE+1,'effectiveDate',CURRENT_DATE+1,'effectiveTime','09:00',
        'reminders',jsonb_build_array(jsonb_build_object('offsetDays',1,
          'scheduledAt',((CURRENT_DATE+TIME '09:00') AT TIME ZONE 'America/Chicago'))))));
  `);

  const revokedFixture = await createLead('revocation');
  const [revokeResult, scheduleResult] = await Promise.allSettled([
    sellerAction(ownerId, revokedFixture.leadId, 'revoke_requested_contact'),
    taskSave({ leadId: revokedFixture.leadId }),
  ]);
  assert.equal(revokeResult.status, 'fulfilled', 'the consent revocation must commit');
  if (scheduleResult.status === 'rejected') {
    assert.match(String(scheduleResult.reason), /Seller source changed or is unavailable/,
      'a schedule that loses the consent race must fail at the source authorization fence');
  }
  assert.equal(await sql(`SELECT metadata#>>'{sellerPlan,requestedContact,revokedAt}' IS NOT NULL FROM public.agent_site_leads WHERE id='${revokedFixture.leadId}';`), 't');
  assert.equal(await sql(`SELECT count(*)::text FROM public.realtor_planner_occurrences occurrence JOIN public.realtor_planner_items item ON item.id=occurrence.item_id WHERE item.source_lead_id='${revokedFixture.leadId}' AND occurrence.status='pending';`), '0',
    'revocation cannot leave a pending seller occurrence');
  assert.equal(await sql(`SELECT count(*)::text FROM public.realtor_reminders reminder JOIN public.realtor_planner_occurrences occurrence ON occurrence.id=reminder.occurrence_id JOIN public.realtor_planner_items item ON item.id=occurrence.item_id WHERE item.source_lead_id='${revokedFixture.leadId}' AND reminder.status IN ('scheduled','visible');`), '0',
    'revocation cannot leave an active seller reminder');
  console.log('PASS: contact-consent revocation and task scheduling serialize with pending reminders fenced');

  const transferOwner = randomUUID();
  const transferFixture = await createLead('transfer');
  await sql(`INSERT INTO auth.users(id,email) VALUES ('${transferOwner}','seller-race-transfer-new@example.test');`);
  const [transferAction, transferWrite] = await Promise.allSettled([
    sellerAction(ownerId, transferFixture.leadId, 'record_contact', { channel: 'email', occurredAt: new Date().toISOString() }),
    sql(`UPDATE public.site_config SET owner_id='${transferOwner}' WHERE agent_id='${transferFixture.agentId}';`),
  ]);
  assert.equal(transferWrite.status, 'fulfilled', 'site ownership transfer must commit');
  if (transferAction.status === 'rejected') {
    assert.match(String(transferAction.reason), /Seller lead not found/,
      'a source write that loses the ownership race must fail its owner check');
  }
  assert.equal(await sql(`SELECT count(*)::text FROM public.seller_lead_list_owned('${ownerId}',10) AS lead WHERE lead->>'id'='${transferFixture.leadId}';`), '0',
    'the former site owner cannot read the lead after transfer');
  assert.equal(await sql(`SELECT count(*)::text FROM public.seller_lead_list_owned('${transferOwner}',10) AS lead WHERE lead->>'id'='${transferFixture.leadId}';`), '1',
    'the new site owner can read the lead after transfer');
  await assert.rejects(sellerAction(ownerId, transferFixture.leadId, 'record_contact', { channel: 'email', occurredAt: new Date().toISOString() },
    Number(await sql(`SELECT revision::text FROM public.agent_site_leads WHERE id='${transferFixture.leadId}';`))), /Seller lead not found/);
  console.log('PASS: site transfer fences source reads and later seller writes');

  const duplicateFixture = await createLead('duplicate-task');
  const duplicateSaves = await Promise.allSettled([taskSave({ leadId: duplicateFixture.leadId }), taskSave({ leadId: duplicateFixture.leadId })]);
  assert.equal(duplicateSaves.filter((result) => result.status === 'fulfilled').length, 1,
    `duplicate seller tasks must have one winner: ${duplicateSaves.map((result) => result.status).join(', ')}`);
  assert.equal(await sql(`SELECT count(*)::text FROM public.realtor_planner_items WHERE source_lead_id='${duplicateFixture.leadId}' AND source_lead_action_key='initial-response:v1';`), '1');
  console.log('PASS: concurrent duplicate seller task creation persists one source identity');

  const noteContactFixture = await createLead('note-contact');
  const noteAction = `SET request.jwt.claim.role='service_role'; SELECT public.agent_apply_lead_action('${ownerId}',
    jsonb_build_object('id','${noteContactFixture.leadId}','expectedRevision',1,'requestKey','${randomUUID()}','action','note','note','Concurrent seller note'),
    jsonb_build_object('userId','${ownerId}','name','Seller owner','role','admin'));`;
  const noteLock = sql(`BEGIN; SELECT id FROM public.agent_site_leads WHERE id='${noteContactFixture.leadId}' FOR UPDATE; SELECT pg_sleep(2); COMMIT;`);
  await delay(300);
  const noteContact = await Promise.allSettled([
    sql(noteAction),
    sellerAction(ownerId, noteContactFixture.leadId, 'record_contact', { channel: 'email', occurredAt: new Date().toISOString() }),
  ]);
  await noteLock;
  assert.equal(noteContact.filter((result) => result.status === 'fulfilled').length, 1,
    `note/contact contenders must serialize on one lead revision: ${noteContact.map((result) => result.status).join(', ')}`);
  assert.equal(await sql(`SELECT revision::text FROM public.agent_site_leads WHERE id='${noteContactFixture.leadId}';`), '2');
  console.log('PASS: concurrent lead note and contact updates consume one optimistic revision');

  const consultationFixture = await createLead('consultation-cancel');
  await sql(`UPDATE public.realtor_preferences SET reminders_enabled=true WHERE user_id='${ownerId}' AND workspace_id='${workspaceId}';`);
  await sql(`SET request.jwt.claim.role='service_role'; SELECT public.seller_lead_record_action('${ownerId}',jsonb_build_object(
    'leadId','${consultationFixture.leadId}','expectedRevision',1,'requestKey','${randomUUID()}','action','confirm_consultation',
    'startsAt',((CURRENT_DATE+1)+TIME '09:00') AT TIME ZONE 'America/Chicago','confirmationBasis','confirmed_booking'));`);
  const consultationEventId = (await sql(`SELECT id::text FROM public.seller_lead_events WHERE lead_id='${consultationFixture.leadId}' AND event_type='consultation_confirmed';`)).trim();
  await sql(`SET request.jwt.claim.role='service_role'; SELECT * FROM public.realtor_save_planner_item('${ownerId}','${workspaceId}',NULL,NULL,'${randomUUID()}',
    jsonb_build_object('kind','appointment','title','Confirmed seller consultation','notes','','expectedAmountCents',NULL,'property',NULL,'sourceSprintTaskId',NULL,
      'sellerLead',jsonb_build_object('leadId','${consultationFixture.leadId}','expectedLeadRevision',2,'actionKey','consultation:${consultationEventId}'),
      'due',jsonb_build_object('anchorDate',CURRENT_DATE+1,'localTime','09:00','timeZone','America/Chicago',
        'recurrence',jsonb_build_object('frequency','once'),'endsOn',NULL,'reminderOffsetsDays','[2]'::jsonb)),
    jsonb_build_array(jsonb_build_object('occurrenceKeyDate',CURRENT_DATE+1,'effectiveDate',CURRENT_DATE+1,'effectiveTime','09:00',
      'reminders',jsonb_build_array(jsonb_build_object('offsetDays',2,'scheduledAt',((CURRENT_DATE-1)+TIME '09:00') AT TIME ZONE 'America/Chicago')))));`);
  const consultationItemId = (await sql(`SELECT id::text FROM public.realtor_planner_items WHERE source_lead_id='${consultationFixture.leadId}' AND source_lead_action_key='consultation:${consultationEventId}';`)).trim();
  const consultationOccurrenceId = (await sql(`SELECT id::text FROM public.realtor_planner_occurrences WHERE item_id='${consultationItemId}';`)).trim();
  const consultationReminderId = (await sql(`SELECT id::text FROM public.realtor_reminders WHERE occurrence_id='${consultationOccurrenceId}' AND status='scheduled';`)).trim();
  const reminderJobId = (await sql(`SELECT id::text FROM public.workflow_jobs WHERE workflow_key='realtor_reminder' AND payload->>'reminderId'='${consultationReminderId}' AND status='queued' ORDER BY created_at DESC LIMIT 1;`)).trim();
  assert.match(reminderJobId, /^[0-9a-f-]{36}$/i, 'consultation reminder should enqueue a durable job');
  await sql(`SELECT id FROM public.claim_workflow_jobs(100,30) WHERE id='${reminderJobId}';`);
  const reminderLease = (await sql(`SELECT lease_token::text FROM public.workflow_jobs WHERE id='${reminderJobId}';`)).trim();
  const [cancelResult, activateResult] = await Promise.allSettled([
    sellerAction(ownerId, consultationFixture.leadId, 'cancel_consultation', { consultationEventId }, 2),
    sql(`SET request.jwt.claim.role='service_role'; SELECT * FROM public.realtor_commit_reminder_job('${reminderJobId}','${reminderLease}');`),
  ]);
  assert.equal(cancelResult.status, 'fulfilled', 'the consultation cancellation must commit');
  assert.equal(activateResult.status, 'fulfilled', 'the claimed reminder job must settle');
  assert.equal(await sql(`SELECT status FROM public.realtor_planner_occurrences WHERE id='${consultationOccurrenceId}';`), 'cancelled');
  assert.equal(await sql(`SELECT status FROM public.realtor_reminders WHERE id='${consultationReminderId}';`), 'superseded',
    'a concurrent cancellation cannot leave the appointment reminder visible or scheduled');
  console.log('PASS: consultation cancellation fences concurrent reminder activation');
}
