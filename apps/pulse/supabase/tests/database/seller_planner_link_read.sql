BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(14);

DO $$
DECLARE
  owner_id UUID := gen_random_uuid(); other_id UUID := gen_random_uuid();
  workspace_id UUID := gen_random_uuid(); lead_id UUID := gen_random_uuid(); item_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users(id,email) VALUES (owner_id,'seller-link-owner@example.test'),(other_id,'seller-link-other@example.test');
  INSERT INTO public.platform_workspaces(id,kind,name,created_by) VALUES(workspace_id,'personal','Seller link test',owner_id);
  INSERT INTO public.platform_memberships(workspace_id,user_id,role) VALUES(workspace_id,owner_id,'owner');
  INSERT INTO public.realtor_preferences(user_id,workspace_id) VALUES(owner_id,workspace_id);
  INSERT INTO public.site_config(agent_id,owner_id,subdomain,status) VALUES('seller-link-test',owner_id,'seller-link-test','active');
  INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata)
    VALUES(lead_id,'seller-link-test','seller-link-test','seller_plan','Link test','seller-link@example.test','Request','{}');
  INSERT INTO public.realtor_planner_items(id,user_id,workspace_id,kind,title,due_spec,source_lead_id,source_lead_action_key,source_lead_revision)
    VALUES(item_id,owner_id,workspace_id,'follow_up','Saved response','{}',lead_id,'initial-response:v1',1);
  INSERT INTO public.realtor_planner_occurrences(item_id,user_id,workspace_id,occurrence_key,original_date,effective_date,item_revision,title_snapshot,kind_snapshot,status)
    VALUES(item_id,owner_id,workspace_id,item_id||':2025-12-31','2025-12-31','2026-01-02',1,'Saved response','follow_up','completed');
  PERFORM set_config('test.seller_link_owner',owner_id::TEXT,true);
  PERFORM set_config('test.seller_link_other',other_id::TEXT,true);
  PERFORM set_config('test.seller_link_workspace',workspace_id::TEXT,true);
  PERFORM set_config('test.seller_link_lead',lead_id::TEXT,true);
  PERFORM set_config('test.seller_link_item',item_id::TEXT,true);
END $$;

CREATE FUNCTION pg_temp.seller_link() RETURNS JSONB LANGUAGE sql AS $$
  SELECT public.seller_lead_read_planner_link(current_setting('test.seller_link_owner')::UUID,
    current_setting('test.seller_link_workspace')::UUID,current_setting('test.seller_link_lead')::UUID,'initial-response:v1');
$$;
SELECT ok(has_function_privilege('service_role','public.seller_lead_read_planner_link(uuid,uuid,uuid,text)','EXECUTE'),'scoped server can read the planner link');
SELECT ok(NOT has_function_privilege('authenticated','public.seller_lead_read_planner_link(uuid,uuid,uuid,text)','EXECUTE'),'authenticated clients cannot bypass the server');
SELECT ok(NOT has_function_privilege('anon','public.seller_lead_read_planner_link(uuid,uuid,uuid,text)','EXECUTE'),'anonymous clients cannot read the link');
SELECT is(pg_temp.seller_link()->>'itemId',current_setting('test.seller_link_item'),'current owner sees the exact saved task');
SELECT is(pg_temp.seller_link()->>'effectiveDate','2026-01-02','link opens the rescheduled date rather than the original date');
SELECT is(pg_temp.seller_link()->>'occurrenceStatus','completed','completed source tasks remain discoverable');
SELECT is(public.seller_lead_read_planner_link(current_setting('test.seller_link_other')::UUID,
  current_setting('test.seller_link_workspace')::UUID,current_setting('test.seller_link_lead')::UUID,'initial-response:v1'),NULL::JSONB,'foreign owner receives no planner detail');
SELECT is(public.seller_lead_read_planner_link(current_setting('test.seller_link_owner')::UUID,
  gen_random_uuid(),current_setting('test.seller_link_lead')::UUID,'initial-response:v1'),NULL::JSONB,'wrong workspace receives no planner detail');
SELECT is(public.seller_lead_read_planner_link(current_setting('test.seller_link_owner')::UUID,
  current_setting('test.seller_link_workspace')::UUID,current_setting('test.seller_link_lead')::UUID,'reply:'||gen_random_uuid()),NULL::JSONB,'another source identity does not reuse the initial response task');
UPDATE public.platform_memberships SET status='revoked' WHERE workspace_id=current_setting('test.seller_link_workspace')::UUID;
SELECT is(pg_temp.seller_link(),NULL::JSONB,'revoked membership loses the link');
UPDATE public.platform_memberships SET status='active' WHERE workspace_id=current_setting('test.seller_link_workspace')::UUID;
UPDATE public.site_config SET owner_id=current_setting('test.seller_link_other')::UUID WHERE agent_id='seller-link-test';
SELECT is(pg_temp.seller_link(),NULL::JSONB,'former seller-site owner loses the link');
UPDATE public.site_config SET owner_id=current_setting('test.seller_link_owner')::UUID,status='suspended' WHERE agent_id='seller-link-test';
SELECT is(pg_temp.seller_link(),NULL::JSONB,'inactive seller site loses the link');
UPDATE public.site_config SET status='active' WHERE agent_id='seller-link-test';
UPDATE public.platform_workspaces SET status='archived' WHERE id=current_setting('test.seller_link_workspace')::UUID;
SELECT is(pg_temp.seller_link(),NULL::JSONB,'archived workspace loses the link');
SELECT is((SELECT count(*)::INTEGER FROM public.seller_lead_events WHERE lead_id=current_setting('test.seller_link_lead')::UUID),0,'reading the link creates no seller receipt');
SELECT * FROM finish();
ROLLBACK;
