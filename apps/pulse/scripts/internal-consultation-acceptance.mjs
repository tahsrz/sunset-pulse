import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

// Runs only inside scheduler-concurrency-acceptance's disposable PostgreSQL.
export async function internalConsultationAcceptance(sql) {
  const q = text => sql(`SET request.jwt.claim.role='service_role'; ${text}`);
  const json = value => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  const owner=randomUUID(), other=randomUUID(), workspace=randomUUID();
  const leads=Array.from({length:5},()=>({leadId:randomUUID(),funnelId:randomUUID(),agentId:'internal-test',site:'internal-test'}));
  await q(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${owner}','calendar@example.test',now()),('${other}','other@example.test',now());
    SELECT workspace_id FROM platform_create_workspace_with_owner('${owner}','${workspace}','personal','Calendar test');
    INSERT INTO realtor_preferences(user_id,workspace_id,reminders_enabled) VALUES('${owner}','${workspace}',true);
    INSERT INTO site_config(id,agent_id,owner_id,status) VALUES(gen_random_uuid(),'internal-test','${owner}','active');
    ${leads.map((lead,i)=>`INSERT INTO agent_site_leads(id,funnel_id,agent_id,site,source,name,email,message,metadata)
      VALUES('${lead.leadId}','${lead.funnelId}','internal-test','internal-test','seller_plan','Seller ${i}','seller${i}@example.test','Test',
        '{"sellerPlan":{"requestedContact":{"granted":true}}}');`).join('\n')}`);
  const settings={requestId:randomUUID(),expectedRevision:null,enabled:false,timeZone:'America/Chicago',durationMinutes:30,noticeMinutes:120,horizonDays:30,internalCalendarAcknowledged:false,windows:[]};
  const configure=(value,actor=owner)=>q(`SELECT seller_consultation_configure('${actor}','internal-test','internal-test',${json(value)});`);
  assert.equal(JSON.parse(await configure(settings)).revision,1);
  assert.equal(JSON.parse(await configure(settings)).revision,1,'exact configuration replay');
  await assert.rejects(configure({...settings,enabled:true}),/Invalid consultation calendar/);
  await assert.rejects(configure({...settings,requestId:randomUUID(),expectedRevision:1},other),/Calendar unavailable/);
  const enabled={...settings,requestId:randomUUID(),expectedRevision:1,enabled:true,internalCalendarAcknowledged:true,windows:Array.from({length:7},(_,weekday)=>({weekday,start:'00:00',end:'23:59'}))};
  assert.equal(JSON.parse(await configure(enabled)).revision,2);
  await assert.rejects(configure({...enabled,requestId:randomUUID()}),/Calendar changed/);
  await assert.rejects(configure({...enabled,requestId:randomUUID(),expectedRevision:2,timeZone:'Invalid/Zone'}),/Invalid consultation calendar/);
  assert.equal(await q(`SELECT has_table_privilege('authenticated','seller_consultation_settings','SELECT') OR has_function_privilege('anon','seller_consultation_reserve(jsonb,text,uuid)','EXECUTE');`),'f');
  console.log('PASS: owner setup, disabled defaults, consent to calendar authority, revisions, replay and grants');
  const list=async(identity=leads[0])=>JSON.parse(await q(`SELECT seller_consultation_availability(${json(identity)},now()+interval '1 day',now()+interval '3 days');`));
  let slots=(await list()).slots;
  assert(slots.length>10);
  await assert.rejects(list({...leads[0],funnelId:randomUUID()}),/Saved request unavailable/);
  const reserve=(lead,slot,key)=>`SELECT seller_consultation_reserve(${json(lead)},'${slot.id}','${key}');`;
  const key=randomUUID();
  // Hold A after its reservation. Observe B waiting, proving actual overlap.
  const first=q(`SET application_name='consultation_a'; BEGIN; ${reserve(leads[0],slots[0],key)} SELECT pg_sleep(2); COMMIT;`);
  first.catch(()=>{});
  async function wait(name,predicate) {
    for(let i=0;i<60;i++) {
      if(await q(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='${name}' AND ${predicate});`)==='t') return;
      await delay(40);
    }
    throw new Error(`Missing concurrency barrier: ${name}`);
  }
  let second;
  try {
    await wait('consultation_a',"wait_event='PgSleep'");
    second=q(`SET application_name='consultation_b'; ${reserve(leads[1],slots[0],randomUUID())}`);
    second.catch(()=>{});
    await wait('consultation_b',"wait_event_type='Lock'");
    assert.equal(JSON.parse(await second).status,'conflict');
    assert.equal(JSON.parse((await first).trim().split(/\r?\n/)[0]).status,'confirmed');
  } finally { await Promise.allSettled([first,second].filter(Boolean)); }
  const replay=JSON.parse(await q(reserve(leads[0],slots[0],key)));
  assert.equal(replay.status,'confirmed');
  assert.equal(JSON.parse(await q(reserve(leads[0],slots[1],key))).status,'conflict');
  for(const table of ['scheduling_attendees','seller_consultation_claims','seller_case_booking_links']) {
    assert.equal(await q(`SELECT count(*) FROM ${table} WHERE booking_id='${replay.bookingId}';`),'1');
  }
  assert.equal(await q(`SELECT count(*) FROM realtor_planner_items WHERE source_lead_id='${leads[0].leadId}';`),'1');
  assert.equal(await q(`SELECT count(*) FROM realtor_reminders WHERE user_id='${owner}' AND status='scheduled';`),'1');
  console.log('PASS: real overlapping reservations have one winner; replay preserves one booking, attendee, case link, planner item and reminder');
  await assert.rejects(q(`SELECT seller_consultation_cancel('${other}','${replay.bookingId}');`),/Consultation unavailable/);
  for(let i=0;i<2;i++) assert.equal(JSON.parse(await q(`SELECT seller_consultation_cancel('${owner}','${replay.bookingId}');`)).status,'cancelled');
  assert.equal(JSON.parse(await q(reserve(leads[0],slots[0],key))).status,'cancelled');
  assert.equal(await q(`SELECT count(*) FROM seller_consultation_claims WHERE booking_id='${replay.bookingId}';`),'0');
  assert.equal(await q(`SELECT count(*) FROM realtor_reminders WHERE user_id='${owner}' AND status IN ('scheduled','visible');`),'0');
  assert.equal(await q(`SELECT count(*) FROM seller_lead_events WHERE lead_id='${leads[0].leadId}' AND event_type='consultation_cancelled';`),'1');
  const secondBooking=JSON.parse(await q(reserve(leads[1],slots[0],key)));
  assert.equal(secondBooking.status,'confirmed','same UUID is scoped to a different saved lead');
  await assert.rejects(q(`UPDATE scheduling_bookings SET status='accepted' WHERE id='${replay.bookingId}';`),/Cancel and create/);
  await assert.rejects(q(`UPDATE scheduling_bookings SET user_id=NULL WHERE id='${secondBooking.bookingId}';`),/resource is immutable/);
  await assert.rejects(q(`UPDATE scheduling_bookings SET idempotency_key='changed-key' WHERE id='${secondBooking.bookingId}';`),/Cancel and create/);
  console.log('PASS: owner-only cancellation releases capacity, cancels existing reminders and never resurrects a cancelled replay');
  // A deliberate attendee failure must roll back every booking side effect.
  await q(`CREATE FUNCTION public.test_attendee_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Test attendee failure'; END $$;
    CREATE TRIGGER test_failure BEFORE INSERT ON scheduling_attendees FOR EACH ROW EXECUTE FUNCTION test_attendee_failure();`);
  const atomicKey=randomUUID();
  await assert.rejects(q(reserve(leads[2],slots[1],atomicKey)),/Test attendee failure/);
  assert.equal(await q(`SELECT count(*) FROM scheduling_bookings WHERE lead_id='${leads[2].leadId}';`),'0');
  assert.equal(await q(`SELECT count(*) FROM seller_case_booking_links WHERE lead_id='${leads[2].leadId}';`),'0');
  await q('DROP TRIGGER test_failure ON scheduling_attendees; DROP FUNCTION test_attendee_failure();');
  assert.equal(JSON.parse(await q(reserve(leads[2],slots[1],atomicKey))).status,'confirmed');
  // Direct legacy writers cannot bypass the interval invariant.
  const resource=await q("SELECT resource_id FROM seller_consultation_settings WHERE agent_id='internal-test';");
  await assert.rejects(q(`INSERT INTO scheduling_bookings(uid,user_id,title,start_time,end_time,status) VALUES(gen_random_uuid()::text,'${resource}','Legacy','${slots[1].startsAt}','${slots[1].endsAt}','accepted');`),/exclusion constraint/);
  await q(`UPDATE agent_site_leads SET metadata='{"sellerPlan":{"requestedContact":{"granted":true,"revokedAt":"now"}}}' WHERE id='${leads[3].leadId}';`);
  await assert.rejects(q(reserve(leads[3],slots[2],randomUUID())),/Saved request unavailable/);
  console.log('PASS: attendee failure rolls back transaction; direct writers cannot overlap; withdrawn consent blocks reservation');
  const cfg=await q("SELECT id FROM seller_consultation_settings WHERE agent_id='internal-test';");
  for(const day of ['2027-03-14','2026-11-01']) {
    const result=JSON.parse(await q(`SELECT COALESCE(jsonb_agg(jsonb_build_object('id',slot_id,'start',starts_at,'end',ends_at)),'[]')
      FROM seller_consultation_slots_internal('${cfg}','${day} 00:00 America/Chicago','${day} 06:00 America/Chicago','${day} 00:00 America/Chicago'::timestamptz-interval '1 day');`));
    assert(result.length>5);
    assert.equal(new Set(result.map(s=>s.id)).size,result.length);
    for(const slot of result) assert.equal(Date.parse(slot.end)-Date.parse(slot.start),30*60000);
    if(day==='2027-03-14') assert.equal(await q(`SELECT count(*) FROM seller_consultation_slots_internal('${cfg}','${day} 00:00 America/Chicago','${day} 06:00 America/Chicago','${day} 00:00 America/Chicago'::timestamptz-interval '1 day') WHERE to_char(starts_at AT TIME ZONE 'America/Chicago','HH24')='02';`),'0');
  }
  assert.equal(JSON.parse(await configure({...enabled,requestId:randomUUID(),expectedRevision:2,enabled:false})).revision,3);
  assert.equal((await list()).status,'unavailable');
  assert.equal(JSON.parse(await q(reserve(leads[1],slots[0],key))).bookingId,secondBooking.bookingId,'disabling new bookings does not hide an existing receipt');
  assert.equal(JSON.parse(await q(reserve(leads[4],slots[2],randomUUID()))).status,'conflict');
  await q(`UPDATE agent_site_leads SET metadata='{"sellerPlan":{"requestedContact":{"granted":true,"revokedAt":"now"}}}' WHERE id='${leads[1].leadId}';`);
  await assert.rejects(q(reserve(leads[1],slots[0],key)),/Saved request unavailable/);
  await q(`UPDATE site_config SET owner_id='${other}' WHERE agent_id='internal-test';`);
  assert.equal((await list()).status,'unavailable');
  console.log('PASS: spring/fall DST slots have stable physical durations and unique IDs; ownership transfer disables booking');
}
