BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(6);

DO $$
DECLARE owner_id UUID := gen_random_uuid();
  other_id UUID := gen_random_uuid();
  owner_lead UUID := gen_random_uuid();
  expired_lead UUID := gen_random_uuid();
  misrouted_lead UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users(id,email) VALUES
    (owner_id,'cma-owner@example.test'),
    (other_id,'cma-other@example.test');
  INSERT INTO public.profiles(id,role) VALUES
    (owner_id,'realtor'),
    (other_id,'realtor')
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

  INSERT INTO public.site_config(agent_id,owner_id,subdomain) VALUES
    ('cma-owner-site',owner_id,'cma-owner-test'),
    ('cma-other-site',other_id,'cma-other-test');

  INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata) VALUES
    (owner_lead,'cma-owner-site','cma-owner-test','seller_plan','CMA Owner','owner@example.test','Pricing review requested.',jsonb_build_object('sellerPlan',jsonb_build_object('requestKind','pricing_review'))),
    (expired_lead,'cma-owner-site','cma-owner-test','seller_plan','CMA Owner','owner@example.test','Expired review.',jsonb_build_object('sellerPlan',jsonb_build_object('requestKind','pricing_review'))),
    (misrouted_lead,'cma-other-site','cma-other-test','seller_plan','CMA Owner','owner@example.test','Other site review.',jsonb_build_object('sellerPlan',jsonb_build_object('requestKind','pricing_review')));

  INSERT INTO public.seller_cma_private_details(lead_id,agent_id,owner_user_id,property_address,seller_permission_confirmed,consent_text_version,created_at) VALUES
    (owner_lead,'cma-owner-site',owner_id,'12 Cedar Street',true,'cma-address-consent.v1',now()),
    (expired_lead,'cma-owner-site',owner_id,'14 Cedar Street',true,'cma-address-consent.v1',now() - INTERVAL '91 days'),
    (misrouted_lead,'cma-other-site',owner_id,'16 Cedar Street',true,'cma-address-consent.v1',now());

  PERFORM set_config('test.cma_owner_id', owner_id::text, true);
  PERFORM set_config('test.cma_other_id', other_id::text, true);
  PERFORM set_config('test.cma_owner_lead', owner_lead::text, true);
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claim.sub',current_setting('test.cma_owner_id'),true);
SELECT is((SELECT count(*)::INTEGER FROM public.seller_cma_private_details),1,'owner sees only the current, correctly routed CMA detail');
SELECT is((SELECT property_address FROM public.seller_cma_private_details WHERE lead_id=current_setting('test.cma_owner_lead')::UUID),'12 Cedar Street','owner can read their pricing-review address');
SELECT is((SELECT expires_at = created_at + INTERVAL '90 days' FROM public.seller_cma_private_details WHERE lead_id=current_setting('test.cma_owner_lead')::UUID),true,'database fixes expiry at 90 days from creation');
SELECT is(has_table_privilege('authenticated','public.seller_cma_private_details','INSERT'),false,'authenticated clients cannot insert/backdate rows outside the API');
SELECT is((WITH removed AS (DELETE FROM public.seller_cma_private_details WHERE lead_id=current_setting('test.cma_owner_lead')::UUID RETURNING lead_id) SELECT count(*)::INTEGER FROM removed),1,'owner can explicitly delete their own private details');
SELECT set_config('request.jwt.claim.sub',current_setting('test.cma_other_id'),true);
SELECT is((SELECT count(*)::INTEGER FROM public.seller_cma_private_details),0,'another realtor cannot read owner, expired, or misrouted CMA details');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
