BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(18);

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('8c000000-0000-4000-8000-000000000001','profile-admin-claim@example.test','{"role":"admin"}'),
 ('8c000000-0000-4000-8000-000000000002','profile-operator-claim@example.test','{"role":"operator"}'),
 ('8c000000-0000-4000-8000-000000000003','profile-realtor@example.test','{"role":"realtor"}'),
 ('8c000000-0000-4000-8000-000000000004','profile-unknown-role@example.test','{"role":"unknown"}');
SELECT is((SELECT role FROM public.profiles WHERE id='8c000000-0000-4000-8000-000000000001'),'consumer','signup admin claim becomes consumer');
SELECT is((SELECT role FROM public.profiles WHERE id='8c000000-0000-4000-8000-000000000002'),'consumer','signup operator claim becomes consumer');
SELECT is((SELECT role FROM public.profiles WHERE id='8c000000-0000-4000-8000-000000000003'),'realtor','existing public realtor registration is preserved');
SELECT is((SELECT role FROM public.profiles WHERE id='8c000000-0000-4000-8000-000000000004'),'consumer','unknown signup role becomes consumer');
SELECT lives_ok($$UPDATE public.profiles SET role='operator' WHERE id='8c000000-0000-4000-8000-000000000003'$$,'trusted SQL can assign operator');
SELECT lives_ok($$UPDATE public.profiles SET role='admin' WHERE id='8c000000-0000-4000-8000-000000000003'$$,'trusted SQL can assign admin');

-- Exercise the guard even if hosted table/column grants differ. These grants roll back.
GRANT UPDATE(role,full_name),INSERT ON public.profiles TO authenticated;
GRANT UPDATE(role) ON public.profiles TO service_role;
GRANT SELECT ON public.profiles TO service_role;
SELECT set_config('request.jwt.claim.sub','8c000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$UPDATE public.profiles SET role='admin' WHERE id='8c000000-0000-4000-8000-000000000001'$$,'42501','Profile roles must be assigned by the server.','consumer cannot self-promote to admin');
SELECT throws_ok($$UPDATE public.profiles SET role='operator' WHERE id='8c000000-0000-4000-8000-000000000001'$$,'42501','Profile roles must be assigned by the server.','consumer cannot self-promote to operator');
SELECT throws_ok($$UPDATE public.profiles SET role='realtor' WHERE id='8c000000-0000-4000-8000-000000000001'$$,'42501','Profile roles must be assigned by the server.','existing role changes use the trusted path');
SELECT lives_ok($$UPDATE public.profiles SET full_name='Ordinary profile edit' WHERE id='8c000000-0000-4000-8000-000000000001'$$,'ordinary profile edits remain usable');
SELECT is((SELECT role FROM public.profiles WHERE id='8c000000-0000-4000-8000-000000000001'),'consumer','denied changes preserve the consumer role');
RESET ROLE;

DELETE FROM public.profiles WHERE id='8c000000-0000-4000-8000-000000000002';
SELECT set_config('request.jwt.claim.sub','8c000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$INSERT INTO public.profiles(id,email,role) VALUES('8c000000-0000-4000-8000-000000000002','profile-operator-claim@example.test','admin')$$,'42501','Profile roles must be assigned by the server.','self-insert cannot assign admin');
SELECT lives_ok($$INSERT INTO public.profiles(id,email,role) VALUES('8c000000-0000-4000-8000-000000000002','profile-operator-claim@example.test','consumer')$$,'self-insert can restore an ordinary profile');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','8c000000-0000-4000-8000-000000000003',true);
SET LOCAL ROLE authenticated;
SELECT lives_ok($$UPDATE public.profiles SET full_name='Administrator profile edit' WHERE id='8c000000-0000-4000-8000-000000000003'$$,'existing administrators can edit ordinary profile fields');
SELECT is((SELECT role FROM public.profiles WHERE id='8c000000-0000-4000-8000-000000000003'),'admin','ordinary edits preserve assigned administrator roles');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT lives_ok($$UPDATE public.profiles SET role='admin' WHERE id='8c000000-0000-4000-8000-000000000001'$$,'trusted service role can assign admin');
RESET ROLE;
SELECT is((SELECT role FROM public.profiles WHERE id='8c000000-0000-4000-8000-000000000001'),'admin','trusted role assignment persists');

UPDATE auth.users SET raw_user_meta_data='{"role":"admin"}' WHERE id='8c000000-0000-4000-8000-000000000004';
SELECT is((SELECT role FROM public.profiles WHERE id='8c000000-0000-4000-8000-000000000004'),'consumer','later auth metadata edits do not change the profile role');
SELECT * FROM finish();
ROLLBACK;
