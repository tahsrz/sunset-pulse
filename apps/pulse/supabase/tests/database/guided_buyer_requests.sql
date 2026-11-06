BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(15);

INSERT INTO auth.users(id, email) VALUES
  ('11111111-1111-4111-8111-111111111111', 'buyer-owner-one@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'buyer-owner-two@example.test');
INSERT INTO public.site_config(agent_id, subdomain, owner_id, status) VALUES
  ('buyer-test-one-site', 'buyer-test-one', '11111111-1111-4111-8111-111111111111', 'active'),
  ('buyer-test-two-site', 'buyer-test-two', '22222222-2222-4222-8222-222222222222', 'active');

CREATE FUNCTION pg_temp.save_buyer(site text, agent text, fingerprint text)
RETURNS text LANGUAGE sql AS $$
  SELECT public.save_guided_buyer_request(site, agent, '33333333-3333-4333-8333-333333333333',
    repeat(fingerprint, 64), 'Taylor Example', 'taylor@example.test',
    '{"mode":"buy","buyingStage":{"state":"answered","value":"searching"},"buyerPreferences":{"destination":{"state":"unknown"},"construction":{"state":"unknown"},"representation":{"state":"unknown"},"preApproval":"yes"}}',
    '{"source":"local-test"}', false);
$$;

SELECT ok(NOT has_table_privilege('authenticated', 'public.guided_buyer_requests', 'SELECT'), 'signed-in clients have no direct table access');
SELECT ok(NOT has_function_privilege('anon', 'public.save_guided_buyer_request(text,text,uuid,text,text,text,jsonb,jsonb,boolean)', 'EXECUTE'), 'anonymous clients cannot invoke the writer');
SELECT ok(NOT has_function_privilege('authenticated', 'public.list_owned_guided_buyer_requests(uuid,uuid)', 'EXECUTE'), 'a signed-in client cannot supply a forged owner to the RPC');
SELECT ok(has_function_privilege('service_role', 'public.list_owned_guided_buyer_requests(uuid,uuid)', 'EXECUTE'), 'the application service can call the owner RPC');
SELECT is(pg_temp.save_buyer('buyer-test-one', 'buyer-test-two-site', 'a'), 'configuration', 'the configured slug must match the resolved agent');
SELECT is(pg_temp.save_buyer('buyer-test-one', 'buyer-test-one-site', 'a'), 'saved', 'the configured active owner can receive a request');
SELECT is(pg_temp.save_buyer('buyer-test-one', 'buyer-test-one-site', 'a'), 'replayed', 'the same submission and fingerprint replay');
SELECT is(pg_temp.save_buyer('buyer-test-one', 'buyer-test-one-site', 'b'), 'conflict', 'a changed fingerprint cannot overwrite the request');
SELECT is(pg_temp.save_buyer('buyer-test-two', 'buyer-test-two-site', 'a'), 'saved', 'a second site may use the same submission ID');
SELECT is((SELECT count(*)::integer FROM public.guided_buyer_requests), 2, 'each site has one durable row');
SELECT is((SELECT array_agg(item->>'site') FROM public.list_owned_guided_buyer_requests('22222222-2222-4222-8222-222222222222') AS item),
  ARRAY['buyer-test-two']::text[], 'the second active owner sees only its own request');
SELECT is((SELECT count(*)::integer FROM public.list_owned_guided_buyer_requests('22222222-2222-4222-8222-222222222222',
    (SELECT id FROM public.guided_buyer_requests WHERE assigned_owner_id = '11111111-1111-4111-8111-111111111111'))),
  0, 'a known request ID cannot cross the owner boundary');
SELECT ok((SELECT item->>'email' = 'taylor@example.test' AND item->>'requestedContactAt' IS NOT NULL
    AND item->'marketingOptIn' = 'false'::jsonb AND NOT (item ?| ARRAY['submissionId','requestFingerprint','campaign','ownerId'])
  FROM public.list_owned_guided_buyer_requests('11111111-1111-4111-8111-111111111111') AS item),
  'the owner receives the permitted projection and separate consent values');

UPDATE public.site_config SET owner_id = '22222222-2222-4222-8222-222222222222' WHERE subdomain = 'buyer-test-one';
SELECT is((SELECT count(*)::integer FROM public.list_owned_guided_buyer_requests('11111111-1111-4111-8111-111111111111')), 0,
  'the previous owner loses access after transfer');
SELECT is((SELECT count(*)::integer FROM public.list_owned_guided_buyer_requests('22222222-2222-4222-8222-222222222222')), 1,
  'the new owner does not inherit a previous owner’s private requests');

SELECT * FROM finish();
ROLLBACK;
