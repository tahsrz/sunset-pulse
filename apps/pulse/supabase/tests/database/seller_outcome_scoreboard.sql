BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(9);

DO $$
DECLARE owner_id UUID:=gen_random_uuid(); workspace_id UUID:=gen_random_uuid();
  week_start DATE:=date_trunc('week',now() AT TIME ZONE 'America/Chicago')::DATE;
  first_lead UUID:=gen_random_uuid(); second_lead UUID:=gen_random_uuid();
  contact_at TIMESTAMPTZ:=now()-INTERVAL '30 minutes';
  request_at TIMESTAMPTZ:=now()-INTERVAL '60 minutes';
  local_today DATE:=(now() AT TIME ZONE 'America/Chicago')::DATE;
  summary JSONB;
BEGIN
  INSERT INTO auth.users(id,email) VALUES(owner_id,'seller-scoreboard-'||owner_id||'@example.test');
  PERFORM public.platform_create_workspace_with_owner(owner_id,workspace_id,'personal','Seller scoreboard test');
  INSERT INTO public.realtor_preferences(user_id,workspace_id,time_zone)
    VALUES(owner_id,workspace_id,'America/Chicago');
  INSERT INTO public.site_config(agent_id,owner_id,subdomain,status)
    VALUES('seller-scoreboard-'||owner_id,owner_id,'seller-scoreboard-'||left(owner_id::TEXT,8),'active');
  INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata,created_at)
    VALUES(first_lead,'seller-scoreboard-'||owner_id,'seller-scoreboard','seller_plan','Scoreboard Seller One',
      'one@example.test','Seller request',jsonb_build_object('campaign',jsonb_build_object('campaign','autumn-video')),request_at),
      (second_lead,'seller-scoreboard-'||owner_id,'seller-scoreboard','seller_plan','Scoreboard Seller Two',
      'two@example.test','Seller request','{}'::JSONB,request_at+INTERVAL '5 minutes');
  INSERT INTO public.seller_lead_events(lead_id,agent_id,actor_id,request_key,input_hash,event_type,lead_revision,occurred_at,details)
    VALUES(first_lead,'seller-scoreboard-'||owner_id,owner_id,gen_random_uuid(),repeat('a',64),'contact_attempted',1,contact_at,'{}'),
      (first_lead,'seller-scoreboard-'||owner_id,owner_id,gen_random_uuid(),repeat('b',64),'customer_replied',2,now()-INTERVAL '20 minutes','{}'),
      (first_lead,'seller-scoreboard-'||owner_id,owner_id,gen_random_uuid(),repeat('c',64),'consultation_confirmed',3,now()-INTERVAL '1 minute','{}'),
      (first_lead,'seller-scoreboard-'||owner_id,owner_id,gen_random_uuid(),repeat('d',64),'closing_recorded',4,
        (local_today::TIMESTAMP AT TIME ZONE 'America/Chicago'),
        jsonb_build_object('reference','scoreboard-'||owner_id,'closedOn',local_today));
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  summary:=public.realtor_read_seller_daily_summary(owner_id,workspace_id,'America/Chicago',week_start,week_start+7);
  PERFORM set_config('test.seller_scoreboard_summary',summary::TEXT,true);
END $$;

SELECT is(current_setting('test.seller_scoreboard_summary')::JSONB#>>'{counts,newRequests}','2','request cohort counts both owner seller requests');
SELECT is(current_setting('test.seller_scoreboard_summary')::JSONB#>>'{counts,customerReplies}','1','reply counts use distinct replying leads');
SELECT is(current_setting('test.seller_scoreboard_summary')::JSONB#>>'{counts,confirmedConsultations}','1','recorded active consultation is counted once');
SELECT is(current_setting('test.seller_scoreboard_summary')::JSONB#>>'{counts,recordedClosings}','1','seller closing is counted independently from cash');
SELECT is(current_setting('test.seller_scoreboard_summary')::JSONB#>>'{firstContactTiming,medianSeconds}','1800','first-contact median uses recorded attempt timestamps');
SELECT is(current_setting('test.seller_scoreboard_summary')::JSONB#>>'{firstContactTiming,sampleSize}','1','first-contact median reports its request denominator');
SELECT is((SELECT value->>'requests' FROM jsonb_array_elements(current_setting('test.seller_scoreboard_summary')::JSONB->'campaigns') value WHERE value->>'campaignKey'='autumn-video'),'1','campaign requests follow their creation cohort');
SELECT is((SELECT value->>'recordedClosings' FROM jsonb_array_elements(current_setting('test.seller_scoreboard_summary')::JSONB->'campaigns') value WHERE value->>'campaignKey'='autumn-video'),'1','campaign outcomes follow event occurrence time');
SELECT is((SELECT value->>'requests' FROM jsonb_array_elements(current_setting('test.seller_scoreboard_summary')::JSONB->'campaigns') value WHERE value->>'campaignKey'='unattributed/unknown'),'1','missing campaign identity remains explicitly unattributed');

SELECT * FROM finish();
ROLLBACK;
