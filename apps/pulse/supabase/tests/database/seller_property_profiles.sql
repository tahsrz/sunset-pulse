BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(18);

INSERT INTO auth.users(id, email) VALUES
  ('8baef63d-044d-416f-8cb8-fd05238a6ab1', 'profile-owner@example.test'),
  ('8baef63d-044d-416f-8cb8-fd05238a6ab2', 'other-profile-owner@example.test');
INSERT INTO public.site_config(agent_id, owner_id, subdomain, status)
  VALUES ('profile-fixture', '8baef63d-044d-416f-8cb8-fd05238a6ab1', 'profile-fixture', 'active');
INSERT INTO public.agent_site_leads(id, agent_id, site, source, name, email, message, status)
  VALUES ('8baef63d-044d-416f-8cb8-fd05238a6ab3', 'profile-fixture', 'profile-fixture', 'seller_plan',
    'Private seller name', 'private-seller@example.test', 'Private notes', 'new');

CREATE FUNCTION pg_temp.profile_action(input jsonb)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT public.seller_property_profile('8baef63d-044d-416f-8cb8-fd05238a6ab1', '8baef63d-044d-416f-8cb8-fd05238a6ab3', input);
$$;

SELECT ok(NOT has_table_privilege('authenticated', 'public.seller_property_profiles', 'SELECT'), 'signed-in users cannot read drafts directly');
SELECT ok(NOT has_function_privilege('authenticated', 'public.seller_property_profile(uuid, uuid, jsonb)', 'EXECUTE'), 'signed-in database clients cannot invoke the owner RPC directly');
SELECT ok(NOT has_function_privilege('anon', 'public.read_shared_property_profile(uuid)', 'EXECUTE'), 'anonymous database clients cannot call the share RPC');
SELECT ok(has_function_privilege('service_role', 'public.read_shared_property_profile(uuid)', 'EXECUTE'), 'the server can resolve a share link');
SELECT throws_ok(
  $$SELECT public.seller_property_profile('8baef63d-044d-416f-8cb8-fd05238a6ab2', '8baef63d-044d-416f-8cb8-fd05238a6ab3')$$,
  'P0002', 'Seller request unavailable', 'another agent cannot read the profile');
SELECT is(pg_temp.profile_action(NULL), NULL::jsonb, 'a seller case starts without a profile');

CREATE TEMP TABLE profile_results (kind text PRIMARY KEY, result jsonb);
INSERT INTO profile_results VALUES ('save', pg_temp.profile_action('{
  "action":"save", "expectedRevision":0, "draft":{
    "title":"Example Land", "area":"Sunset, TX", "acres":2.5, "summary":"Synthetic test property",
    "driveway":{"latitude":33.45,"longitude":-97.77},
    "buildings":[{"id":"8baef63d-044d-416f-8cb8-fd05238a6ab4","name":"Main home","use":"Double-wide",
      "bedrooms":3,"bathrooms":2,"pin":{"latitude":33.451,"longitude":-97.771}}]
  }
}'));
SELECT is((SELECT result->>'shareToken' FROM profile_results WHERE kind = 'save'), NULL::text, 'saving a draft does not create a link');

INSERT INTO profile_results VALUES ('publish', pg_temp.profile_action('{"action":"publish","expectedRevision":1,"includeMap":false}'));
CREATE FUNCTION pg_temp.link_token() RETURNS uuid LANGUAGE sql AS $$
  SELECT (result->>'shareToken')::uuid FROM profile_results WHERE kind = 'publish';
$$;
SELECT ok(pg_temp.link_token() IS NOT NULL, 'publishing creates a share token');
SELECT is(public.read_shared_property_profile(pg_temp.link_token()), '{
  "title":"Example Land", "area":"Sunset, TX", "acres":2.5, "summary":"Synthetic test property",
  "buildings":[{"id":"8baef63d-044d-416f-8cb8-fd05238a6ab4","name":"Main home","use":"Double-wide","bedrooms":3,"bathrooms":2}]
}'::jsonb, 'the public snapshot excludes pins and private seller fields');

INSERT INTO profile_results SELECT 'edit', pg_temp.profile_action(jsonb_build_object('action', 'save',
  'expectedRevision', 2, 'draft', jsonb_set(result->'draft', '{title}', '"Draft edit"')))
  FROM profile_results WHERE kind = 'save';
SELECT is(public.read_shared_property_profile(pg_temp.link_token())->>'title', 'Example Land', 'draft edits leave the shared snapshot alone');
SELECT throws_ok($$SELECT pg_temp.profile_action('{"action":"publish","expectedRevision":2,"includeMap":true}')$$,
  '40001', 'Property profile changed', 'a stale revision cannot publish a newer draft');
INSERT INTO profile_results VALUES ('republish', pg_temp.profile_action('{"action":"publish","expectedRevision":3,"includeMap":true}'));
SELECT is((SELECT result->>'shareToken' FROM profile_results WHERE kind = 'republish'), pg_temp.link_token()::text,
  'updating the shared snapshot keeps the link');
SELECT is(public.read_shared_property_profile(pg_temp.link_token()), (SELECT result->'draft' FROM profile_results WHERE kind = 'edit'),
  'explicit map inclusion publishes driveway and building pins');

INSERT INTO profile_results VALUES ('revoke', pg_temp.profile_action('{"action":"revoke","expectedRevision":4}'));
SELECT is(public.read_shared_property_profile(pg_temp.link_token()), NULL::jsonb, 'the revoked link stops serving the snapshot');
INSERT INTO profile_results VALUES ('new_link', pg_temp.profile_action('{"action":"publish","expectedRevision":5,"includeMap":false}'));
SELECT isnt((SELECT result->>'shareToken' FROM profile_results WHERE kind = 'new_link'), pg_temp.link_token()::text,
  'sharing again issues a different link');

UPDATE public.site_config SET owner_id = '8baef63d-044d-416f-8cb8-fd05238a6ab2' WHERE agent_id = 'profile-fixture';
SELECT is(public.read_shared_property_profile((SELECT (result->>'shareToken')::uuid FROM profile_results WHERE kind = 'new_link')),
  NULL::jsonb, 'the link is hidden after the assigned site owner changes');
SELECT throws_ok(
  $$SELECT public.seller_property_profile('8baef63d-044d-416f-8cb8-fd05238a6ab2', '8baef63d-044d-416f-8cb8-fd05238a6ab3')$$,
  'P0002', 'Seller request unavailable', 'a new site owner cannot read a profile in the old owner’s seller case');
UPDATE public.site_config SET owner_id = '8baef63d-044d-416f-8cb8-fd05238a6ab1' WHERE agent_id = 'profile-fixture';

UPDATE public.agent_site_leads SET status = 'archived' WHERE id = '8baef63d-044d-416f-8cb8-fd05238a6ab3';
SELECT is(public.read_shared_property_profile((SELECT (result->>'shareToken')::uuid FROM profile_results WHERE kind = 'new_link')),
  NULL::jsonb, 'archiving the seller request hides the shared profile');

SELECT * FROM finish();
ROLLBACK;
