BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(4);

SELECT has_column('public', 'realtor_planner_items', 'source_sprint_task_id',
  'planner items retain campaign task provenance');
SELECT has_index('public', 'realtor_planner_items', 'realtor_planner_items_source_task_once_idx',
  'a source backlog task can be scheduled only once per owner');
SELECT ok(position('seller-acquisition:' in pg_get_functiondef(
  'public.realtor_save_planner_item(uuid,uuid,uuid,integer,uuid,jsonb,jsonb)'::regprocedure)) > 0,
  'the save boundary checks seller-acquisition provenance');
SELECT ok(position('source_type' in pg_get_functiondef(
  'public.realtor_save_planner_item(uuid,uuid,uuid,integer,uuid,jsonb,jsonb)'::regprocedure)) > 0,
  'the save boundary confirms a manual owner backlog row before linking');

SELECT * FROM finish();
ROLLBACK;
