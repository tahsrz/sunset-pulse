BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(21);

DO $$
DECLARE owner_id UUID := gen_random_uuid(); other_id UUID := gen_random_uuid();
  lead_id UUID := gen_random_uuid(); first_key UUID := gen_random_uuid();
  generic_lead_id UUID := gen_random_uuid(); generic_key UUID := gen_random_uuid();
  action_input JSONB; result JSONB; replay JSONB; generic_input JSONB; generic_result JSONB;
BEGIN
  INSERT INTO auth.users(id,email) VALUES
    (owner_id,'seller-actions-owner@example.test'),(other_id,'seller-actions-other@example.test');
  INSERT INTO public.site_config(agent_id,owner_id,subdomain,status)
    VALUES ('seller-actions-site',owner_id,'seller-actions','active');
  INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata)
    VALUES (lead_id,'seller-actions-site','seller-actions','seller_plan','Seller Action Test',
      'seller-actions@example.test','Please help me prepare.',
      jsonb_build_object('sellerPlan',jsonb_build_object(
        'requestKind','seller_plan','timing','one-to-three-months',
        'requestedContact',jsonb_build_object('granted',true,'capturedAt',now())
      )));
  INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message)
    VALUES(generic_lead_id,'seller-actions-site','seller-actions','agent_site','Buyer Action Test',
      'buyer-actions@example.test','Buyer request.');
  PERFORM set_config('test.seller_actions_owner_id',owner_id::TEXT,true);
  PERFORM set_config('test.seller_actions_other_id',other_id::TEXT,true);
  PERFORM set_config('test.seller_actions_lead_id',lead_id::TEXT,true);
  PERFORM set_config('test.seller_actions_event_id','',true);
  PERFORM set_config('test.seller_actions_key',first_key::TEXT,true);

  action_input := jsonb_build_object('leadId',lead_id,'expectedRevision',1,
    'requestKey',first_key,'action','record_contact','channel','email','occurredAt',now());
  result := public.seller_lead_record_action(owner_id,action_input);
  PERFORM set_config('test.seller_actions_event_id',result->>'eventId',true);
  PERFORM set_config('test.seller_actions_input',action_input::TEXT,true);
  replay := public.seller_lead_record_action(owner_id,action_input);
  PERFORM set_config('test.seller_actions_replay',replay::TEXT,true);

  generic_input:=jsonb_build_object('id',generic_lead_id,'expectedRevision',1,
    'requestKey',generic_key,'action','note','note','First note');
  generic_result:=public.agent_apply_lead_action('operator-test',generic_input,
    jsonb_build_object('userId','operator-test','name','Operator','role','admin'));
  PERFORM set_config('test.generic_lead_id',generic_lead_id::TEXT,true);
  PERFORM set_config('test.generic_input',generic_input::TEXT,true);
  PERFORM set_config('test.generic_replay',public.agent_apply_lead_action('operator-test',generic_input,
    jsonb_build_object('userId','operator-test','name','Operator','role','admin'))::TEXT,true);
END $$;

SELECT has_column('public','agent_site_leads','revision','seller leads have an optimistic revision');
SELECT has_table('public','seller_lead_events','seller actions have an immutable event table');
SELECT has_index('public','seller_lead_events','seller_lead_events_cancel_target_idx','a consultation cannot be cancelled twice');
SELECT ok(NOT has_table_privilege('authenticated','public.seller_lead_events','SELECT'),'clients cannot read seller event rows directly');
SELECT ok(has_function_privilege('service_role','public.seller_lead_record_action(uuid,jsonb)','EXECUTE'),'the scoped server action RPC is executable by service role');
SELECT ok(NOT has_function_privilege('authenticated','public.seller_lead_record_action(uuid,jsonb)','EXECUTE'),'authenticated clients cannot call the action RPC');
SELECT is((SELECT count(*)::INTEGER FROM public.seller_lead_list_owned(current_setting('test.seller_actions_owner_id')::UUID,10))
  ,1,'the current owner sees their seller request');
SELECT is((SELECT count(*)::INTEGER FROM public.seller_lead_list_owned(current_setting('test.seller_actions_other_id')::UUID,10))
  ,0,'another account cannot list the seller request');
SELECT is((SELECT revision FROM public.agent_site_leads WHERE id=current_setting('test.seller_actions_lead_id')::UUID)
  ,2,'recording contact increments the lead revision once');
SELECT is((current_setting('test.seller_actions_replay')::JSONB->>'replayed')::BOOLEAN,true,'an identical action retry returns its original receipt');
SELECT throws_ok(format($sql$SELECT public.seller_lead_record_action(%L::UUID,%L::JSONB)$sql$,
    current_setting('test.seller_actions_owner_id'),
    (current_setting('test.seller_actions_input')::JSONB || jsonb_build_object('occurredAt',now()+INTERVAL '1 second'))::TEXT),
  '23505','Seller action key was reused with different input','a changed payload cannot reuse an action key');
SELECT throws_ok(format($sql$UPDATE public.seller_lead_events SET details='{}'::JSONB WHERE id=%L::UUID$sql$,
    current_setting('test.seller_actions_event_id')),
  '55000','Seller outcome history is immutable','an event receipt cannot be edited');
SELECT has_table('public','agent_site_lead_action_receipts','generic inbox writes have replay receipts');
SELECT ok(has_function_privilege('service_role','public.agent_apply_lead_action(text,jsonb,jsonb)','EXECUTE'),'service role can apply an atomic generic lead action');
SELECT ok(NOT has_function_privilege('authenticated','public.agent_apply_lead_action(text,jsonb,jsonb)','EXECUTE'),'authenticated clients cannot call the generic lead action RPC');
SELECT is((SELECT revision FROM public.agent_site_leads WHERE id=current_setting('test.generic_lead_id')::UUID)
  ,2,'a generic inbox action increments the lead revision once');
SELECT is((current_setting('test.generic_replay')::JSONB->>'replayed')::BOOLEAN,true,'a generic action retry returns its frozen receipt');
SELECT throws_ok(format($sql$SELECT public.agent_apply_lead_action('operator-test',%L::JSONB,'{}'::JSONB)$sql$,
    (current_setting('test.generic_input')::JSONB||jsonb_build_object('note','Changed'))::TEXT),
  '23505','Lead action key was reused with different input','changed generic input cannot reuse an action key');
SELECT throws_ok(format($sql$SELECT public.agent_apply_lead_action('operator-test',%L::JSONB,'{}'::JSONB)$sql$,
    (current_setting('test.generic_input')::JSONB||jsonb_build_object('requestKey',gen_random_uuid()))::TEXT),
  '40001','Lead changed before this action','a stale generic action is rejected');

SELECT throws_ok(format($sql$SELECT public.seller_lead_record_action(%L::UUID,%L::JSONB)$sql$,
  current_setting('test.seller_actions_owner_id'),
  (current_setting('test.seller_actions_input')::JSONB || jsonb_build_object('requestKey',gen_random_uuid()))::TEXT),
  'PT409','Seller lead changed before this action','a stale seller action is a non-retryable business conflict');
SELECT is((SELECT count(*)::INTEGER FROM public.seller_lead_events WHERE lead_id=current_setting('test.seller_actions_lead_id')::UUID),
  1,'the stale seller action creates no additional receipt');
SELECT * FROM finish();
ROLLBACK;
