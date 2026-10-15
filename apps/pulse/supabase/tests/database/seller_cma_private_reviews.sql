BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(5);

DO $$
DECLARE
  owner_id UUID := gen_random_uuid();
  other_id UUID := gen_random_uuid();
  lead_id UUID := gen_random_uuid();
  review_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users(id,email) VALUES
    (owner_id,'cma-review-owner@example.test'),
    (other_id,'cma-review-other@example.test');
  INSERT INTO public.profiles(id,email,role) VALUES
    (owner_id,'cma-review-owner@example.test','realtor'),
    (other_id,'cma-review-other@example.test','realtor')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role;
  INSERT INTO public.site_config(agent_id,owner_id,subdomain)
  VALUES ('cma-review-site',owner_id,'cma-review-test');
  INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata)
  VALUES (lead_id,'cma-review-site','cma-review-test','seller_plan','CMA Review','review@example.test','Pricing review requested.',jsonb_build_object('sellerPlan',jsonb_build_object('requestKind','pricing_review')));
  INSERT INTO public.seller_cma_private_details(lead_id,agent_id,owner_user_id,property_address,seller_permission_confirmed,consent_text_version)
  VALUES (lead_id,'cma-review-site',owner_id,'12 Cedar Street',true,'cma-address-consent.v1');
  INSERT INTO public.seller_cma_private_reviews(
    review_id,lead_id,agent_id,owner_user_id,revision,supersedes_review_id,status,review_data,prepared_at,expires_at
  ) VALUES (
    review_id,lead_id,'cma-review-site',owner_id,1,NULL,'draft',
    jsonb_build_object('schemaVersion',1,'reviewId',review_id,'revision',1,'leadId',lead_id,'status','draft','useRestriction','private-review-only','supersedesReviewId',NULL),
    now(),now() + INTERVAL '30 days'
  );
  PERFORM set_config('test.cma_review_owner_id',owner_id::text,true);
  PERFORM set_config('test.cma_review_other_id',other_id::text,true);
  PERFORM set_config('test.cma_review_lead_id',lead_id::text,true);
  PERFORM set_config('test.cma_review_id',review_id::text,true);
END $$;

SELECT is(has_table_privilege('authenticated','public.seller_cma_private_reviews','INSERT'),false,'authenticated clients cannot write review revisions directly');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claim.sub',current_setting('test.cma_review_owner_id'),true);
SELECT is((SELECT count(*)::INTEGER FROM public.seller_cma_private_reviews),1,'owning realtor can read an unexpired private review');
SELECT set_config('request.jwt.claim.sub',current_setting('test.cma_review_other_id'),true);
SELECT is((SELECT count(*)::INTEGER FROM public.seller_cma_private_reviews),0,'another realtor cannot read a private review');
RESET ROLE;

SELECT throws_ok(
  format('UPDATE public.seller_cma_private_reviews SET status = ''reviewed'' WHERE review_id = %L::UUID',current_setting('test.cma_review_id')),
  '55000',
  'CMA review revisions are immutable',
  'an existing CMA review cannot be edited in place'
);
SELECT throws_ok(
  format($sql$
    INSERT INTO public.seller_cma_private_reviews(review_id,lead_id,agent_id,owner_user_id,revision,supersedes_review_id,status,review_data,prepared_at,expires_at)
    VALUES (gen_random_uuid(),%L::UUID,'cma-review-site',%L::UUID,3,%L::UUID,'draft',
      jsonb_build_object('schemaVersion',1,'reviewId',gen_random_uuid(),'revision',3,'leadId',%L::UUID,'status','draft','useRestriction','private-review-only','supersedesReviewId',%L::UUID),
      now(),now() + INTERVAL '30 days')
  $sql$,
    current_setting('test.cma_review_lead_id'),
    current_setting('test.cma_review_owner_id'),
    current_setting('test.cma_review_id'),
    current_setting('test.cma_review_lead_id'),
    current_setting('test.cma_review_id')
  ),
  '23514',
  'CMA review revision must supersede the latest immutable revision',
  'revision sequence and predecessor are enforced by the database'
);

SELECT * FROM finish();
ROLLBACK;
