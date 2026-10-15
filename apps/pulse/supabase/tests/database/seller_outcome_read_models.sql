BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(16);

DO $$
DECLARE owner_id UUID:=gen_random_uuid(); other_id UUID:=gen_random_uuid();
  busy_lead UUID:=gen_random_uuid(); quiet_lead UUID:=gen_random_uuid();
  active_closing UUID:=gen_random_uuid(); voided_closing UUID:=gen_random_uuid();
  cancelled_consultation UUID:=gen_random_uuid();
BEGIN
  INSERT INTO auth.users(id,email) VALUES (owner_id,'outcome-owner-'||owner_id||'@example.test'),
    (other_id,'outcome-other-'||other_id||'@example.test');
  INSERT INTO public.site_config(agent_id,owner_id,subdomain,status)
    VALUES('outcome-read-site',owner_id,'outcome-read-test','active');
  INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message)
    VALUES(busy_lead,'outcome-read-site','outcome-read-test','seller_plan','Busy Seller','busy@example.test','Fixture'),
      (quiet_lead,'outcome-read-site','outcome-read-test','seller_plan','Quiet Seller','quiet@example.test','Fixture');
  INSERT INTO public.seller_lead_events(id,lead_id,agent_id,actor_id,request_key,input_hash,event_type,lead_revision,occurred_at,created_at,details)
    VALUES(active_closing,busy_lead,'outcome-read-site',owner_id,gen_random_uuid(),repeat('a',64),'closing_recorded',1,now()-INTERVAL '30 days',now()-INTERVAL '30 days','{"reference":"old-active"}'),
      (voided_closing,busy_lead,'outcome-read-site',owner_id,gen_random_uuid(),repeat('b',64),'closing_recorded',1,now()-INTERVAL '20 days',now()-INTERVAL '20 days','{"reference":"voided"}'),
      (cancelled_consultation,busy_lead,'outcome-read-site',owner_id,gen_random_uuid(),repeat('c',64),'consultation_confirmed',1,now()+INTERVAL '90 days',now()-INTERVAL '10 days','{}'),
      (gen_random_uuid(),busy_lead,'outcome-read-site',owner_id,gen_random_uuid(),repeat('d',64),'consultation_cancelled',1,now()-INTERVAL '1 hour',now()-INTERVAL '1 hour',jsonb_build_object('consultationEventId',cancelled_consultation)),
      (gen_random_uuid(),busy_lead,'outcome-read-site',owner_id,gen_random_uuid(),repeat('e',64),'outcome_voided',1,now()-INTERVAL '1 hour',now()-INTERVAL '1 hour',jsonb_build_object('outcomeEventId',voided_closing)),
      (gen_random_uuid(),quiet_lead,'outcome-read-site',owner_id,gen_random_uuid(),repeat('f',64),'closing_recorded',1,now()-INTERVAL '1 day',now()-INTERVAL '1 day','{"reference":"quiet-active"}');
  INSERT INTO public.seller_lead_events(lead_id,agent_id,actor_id,request_key,input_hash,event_type,lead_revision,occurred_at,created_at)
    SELECT busy_lead,'outcome-read-site',owner_id,gen_random_uuid(),repeat('a',64),'contact_attempted',1,now(),now()
    FROM generate_series(1,1200);
  INSERT INTO public.seller_lead_events(lead_id,agent_id,actor_id,request_key,input_hash,event_type,lead_revision,occurred_at,created_at)
    SELECT busy_lead,'outcome-read-site',owner_id,gen_random_uuid(),repeat('a',64),'consultation_confirmed',1,
      now()+INTERVAL '1 day',now()-INTERVAL '5 days' FROM generate_series(1,30);
  PERFORM set_config('test.outcome_owner',owner_id::TEXT,true);
  PERFORM set_config('test.outcome_other',other_id::TEXT,true);
  PERFORM set_config('test.outcome_busy',busy_lead::TEXT,true);
  PERFORM set_config('test.outcome_quiet',quiet_lead::TEXT,true);
  PERFORM set_config('test.outcome_closing',active_closing::TEXT,true);
  PERFORM set_config('test.outcome_cancelled',cancelled_consultation::TEXT,true);
END $$;

SELECT ok(has_function_privilege('service_role','public.seller_lead_list_active_outcomes(uuid,uuid,text,integer,timestamptz,uuid)','EXECUTE'),'service role can read scoped active outcomes');
SELECT ok(NOT has_function_privilege('authenticated','public.seller_lead_list_active_outcomes(uuid,uuid,text,integer,timestamptz,uuid)','EXECUTE'),'authenticated clients cannot invoke the privileged outcome RPC');
SELECT ok(NOT has_function_privilege('anon','public.seller_lead_read_recent_events(uuid,uuid[])','EXECUTE'),'anonymous clients cannot invoke the privileged history RPC');
SELECT is((SELECT count(*)::INTEGER FROM public.seller_lead_read_recent_events(current_setting('test.outcome_owner')::UUID,ARRAY[current_setting('test.outcome_busy')::UUID,current_setting('test.outcome_quiet')::UUID])),21,'1200 events on one lead do not hide another lead history');
SELECT is((SELECT count(*)::INTEGER FROM public.seller_lead_read_recent_events(current_setting('test.outcome_owner')::UUID,ARRAY[current_setting('test.outcome_busy')::UUID])),20,'recent history is bounded per lead');
SELECT is((SELECT outcome->>'id' FROM public.seller_lead_list_active_outcomes(current_setting('test.outcome_owner')::UUID,current_setting('test.outcome_busy')::UUID,'closing_recorded',25) outcome),current_setting('test.outcome_closing'),'an old active closing remains correctable after 1200 contact events; the voided closing is excluded');
SELECT is((SELECT count(*)::INTEGER FROM public.seller_lead_list_active_outcomes(current_setting('test.outcome_owner')::UUID,current_setting('test.outcome_busy')::UUID,'consultation_confirmed',51)),30,'a cancelled future consultation is excluded independently of its cancellation timestamp');
SELECT is((SELECT count(*)::INTEGER FROM public.seller_lead_list_active_outcomes(current_setting('test.outcome_owner')::UUID,current_setting('test.outcome_busy')::UUID,'consultation_confirmed',2)),2,'active outcome pages are bounded');
WITH first_page AS (SELECT outcome FROM public.seller_lead_list_active_outcomes(current_setting('test.outcome_owner')::UUID,current_setting('test.outcome_busy')::UUID,'consultation_confirmed',2) outcome), boundary AS (
  SELECT outcome FROM first_page ORDER BY outcome->>'created_at',outcome->>'id' LIMIT 1
) SELECT is((SELECT count(*)::INTEGER FROM boundary, LATERAL public.seller_lead_list_active_outcomes(current_setting('test.outcome_owner')::UUID,current_setting('test.outcome_busy')::UUID,'consultation_confirmed',51,(boundary.outcome->>'created_at')::TIMESTAMPTZ,(boundary.outcome->>'id')::UUID)),28,'equal-timestamp pagination uses the event ID and returns remaining outcomes once');
SELECT is((SELECT count(*)::INTEGER FROM public.seller_lead_list_active_outcomes(current_setting('test.outcome_other')::UUID,current_setting('test.outcome_busy')::UUID,'closing_recorded',25)),0,'an unrelated owner sees no outcomes');
SELECT is((SELECT count(*)::INTEGER FROM public.seller_lead_read_recent_events(current_setting('test.outcome_other')::UUID,ARRAY[current_setting('test.outcome_busy')::UUID])),0,'an unrelated owner sees no recent event history');
SELECT throws_ok(format('SELECT * FROM public.seller_lead_list_active_outcomes(%L::UUID,%L::UUID,''contact_attempted'',25)',current_setting('test.outcome_owner'),current_setting('test.outcome_busy')),'22023','Invalid seller outcome page','only consultation and closing outcomes can be paged');
SELECT throws_ok(format('SELECT * FROM public.seller_lead_list_active_outcomes(%L::UUID,%L::UUID,''closing_recorded'',52)',current_setting('test.outcome_owner'),current_setting('test.outcome_busy')),'22023','Invalid seller outcome page','the SQL read rejects unbounded pages');
SELECT throws_ok(format('SELECT * FROM public.seller_lead_list_active_outcomes(%L::UUID,%L::UUID,''closing_recorded'',25,now(),NULL)',current_setting('test.outcome_owner'),current_setting('test.outcome_busy')),'22023','Invalid seller outcome page','the SQL read rejects a partial cursor');
UPDATE public.site_config SET owner_id=current_setting('test.outcome_other')::UUID WHERE agent_id='outcome-read-site';
SELECT is((SELECT count(*)::INTEGER FROM public.seller_lead_list_active_outcomes(current_setting('test.outcome_owner')::UUID,current_setting('test.outcome_busy')::UUID,'closing_recorded',25)),0,'the old owner loses outcome access when a site transfers');
SELECT is((SELECT count(*)::INTEGER FROM public.seller_lead_read_recent_events(current_setting('test.outcome_owner')::UUID,ARRAY[current_setting('test.outcome_busy')::UUID])),0,'the old owner loses history access when a site transfers');

SELECT * FROM finish();
ROLLBACK;
