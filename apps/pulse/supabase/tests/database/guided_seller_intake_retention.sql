BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(14);

DO $$
DECLARE
  owner_id uuid := gen_random_uuid();
  expired_id uuid := gen_random_uuid();
  active_id uuid := gen_random_uuid();
  legacy_id uuid := gen_random_uuid();
  request_key uuid := gen_random_uuid();
  action jsonb;
  details jsonb := '{"sellerPlan":{"offerVersion":"3","requestFingerprint":"stable-fingerprint","requestedContact":{"granted":true},"marketingOptIn":{"granted":false},"journey":{"address":"100 Example Lane","mortgage":123400}}}';
BEGIN
  INSERT INTO auth.users(id, email) VALUES (owner_id, 'guided-retention-owner@example.test');
  INSERT INTO public.site_config(agent_id, owner_id, subdomain, status)
    VALUES ('guided-retention-site', owner_id, 'guided-retention', 'active');
  INSERT INTO public.agent_site_leads(id, created_at, agent_id, site, source, name, email, message, metadata, idempotency_key)
    VALUES
      (expired_id, now() - interval '2160 hours', 'guided-retention-site', 'guided-retention', 'seller_plan', 'Expired', 'expired@example.test', 'Saved request', details, 'test-guided-retention-key'),
      (active_id, now() - interval '2160 hours' + interval '1 second', 'guided-retention-site', 'guided-retention', 'seller_plan', 'Active', 'active@example.test', 'Saved request', details, NULL),
      (legacy_id, now() - interval '2161 hours', 'guided-retention-site', 'guided-retention', 'seller_plan', 'Legacy', 'legacy@example.test', 'Saved request', jsonb_set(details, '{sellerPlan,offerVersion}', '"2"'), NULL);

  action := jsonb_build_object('id', expired_id, 'expectedRevision', 1, 'requestKey', request_key, 'action', 'note', 'note', 'Reviewed');
  PERFORM public.agent_apply_lead_action(owner_id::text, action, '{}'::jsonb);
  PERFORM set_config('test.guided_retention_owner', owner_id::text, true);
  PERFORM set_config('test.guided_retention_expired', expired_id::text, true);
  PERFORM set_config('test.guided_retention_active', active_id::text, true);
  PERFORM set_config('test.guided_retention_legacy', legacy_id::text, true);
  PERFORM set_config('test.guided_retention_action', action::text, true);
  PERFORM set_config('test.guided_retention_key', request_key::text, true);
END;
$$;

SELECT ok(NOT has_function_privilege('anon', 'public.purge_expired_guided_seller_intake()', 'EXECUTE'), 'anonymous callers cannot prune intake');
SELECT ok(NOT has_function_privilege('authenticated', 'public.purge_expired_guided_seller_intake()', 'EXECUTE'), 'authenticated callers cannot prune intake');
SELECT ok(has_function_privilege('service_role', 'public.purge_expired_guided_seller_intake()', 'EXECUTE'), 'the scheduled service can prune intake');
SELECT ok((SELECT response #> '{lead,metadata,sellerPlan,journey}' IS NULL
  FROM public.agent_site_lead_action_receipts WHERE request_key = current_setting('test.guided_retention_key')::uuid), 'new action receipts exclude private intake at write time');

UPDATE public.agent_site_lead_action_receipts
SET response = jsonb_set(response, '{lead,metadata,sellerPlan,journey}', '{"address":"Synthetic legacy copy"}')
WHERE request_key = current_setting('test.guided_retention_key')::uuid;
SELECT ok((SELECT response #> '{lead,metadata,sellerPlan,journey}' IS NULL
  FROM public.agent_site_lead_action_receipts WHERE request_key = current_setting('test.guided_retention_key')::uuid), 'receipt updates cannot restore private intake');

SET LOCAL ROLE service_role;
SELECT set_config('test.guided_retention_pruned', public.purge_expired_guided_seller_intake()::text, true);
RESET ROLE;
SELECT is(current_setting('test.guided_retention_pruned')::integer, 1, 'the exact 90-day boundary is eligible');
SELECT ok((SELECT metadata #> '{sellerPlan,journey}' IS NULL FROM public.agent_site_leads
  WHERE id = current_setting('test.guided_retention_expired')::uuid), 'expired private intake is removed without removing the lead');
SELECT ok((SELECT metadata #> '{sellerPlan,journey}' IS NOT NULL FROM public.agent_site_leads
  WHERE id = current_setting('test.guided_retention_active')::uuid), 'intake inside the window survives');
SELECT ok((SELECT metadata #> '{sellerPlan,journey}' IS NOT NULL FROM public.agent_site_leads
  WHERE id = current_setting('test.guided_retention_legacy')::uuid), 'the cleanup only targets version 3');
SELECT is((SELECT metadata->'sellerPlan' FROM public.agent_site_leads WHERE idempotency_key = 'test-guided-retention-key'),
  '{"offerVersion":"3","requestFingerprint":"stable-fingerprint","requestedContact":{"granted":true},"marketingOptIn":{"granted":false}}'::jsonb,
  'the original fingerprint, idempotency key and contact grants survive');
SELECT is(public.agent_apply_lead_action(current_setting('test.guided_retention_owner'), current_setting('test.guided_retention_action')::jsonb, '{}'::jsonb),
  (SELECT response || '{"replayed":true}'::jsonb FROM public.agent_site_lead_action_receipts WHERE request_key = current_setting('test.guided_retention_key')::uuid),
  'the original action still replays without the private answers after cleanup');
SELECT is(public.purge_expired_guided_seller_intake(), 0, 'an identical cleanup is a no-op');

INSERT INTO public.agent_site_leads(created_at, agent_id, site, source, name, email, message, metadata)
SELECT now() - interval '91 days', 'guided-retention-site', 'guided-retention', 'seller_plan', 'Batch fixture',
  'batch@example.test', 'Saved request', '{"sellerPlan":{"offerVersion":"3","journey":{}}}'::jsonb
FROM generate_series(1, 501);
SELECT is(public.purge_expired_guided_seller_intake(), 500, 'one scheduled call caps work at 500 leads');
SELECT is(public.purge_expired_guided_seller_intake(), 1, 'the next call resumes the bounded backlog');

SELECT * FROM finish();
ROLLBACK;
