BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(5);

SELECT ok(position(quote_literal('1') in pg_get_functiondef('public.realtor_validate_weekly_review_evidence()'::regprocedure))>0,
  'weekly review trigger retains version 1 evidence');
SELECT ok(position(quote_literal('2') in pg_get_functiondef('public.realtor_validate_weekly_review_evidence()'::regprocedure))>0,
  'weekly review trigger accepts version 2 evidence');
SELECT has_index('public','realtor_planner_occurrences','realtor_weekly_review_one_per_local_week_idx',
  'weekly reviews remain unique by owner-local week');
SELECT ok((SELECT indisunique FROM pg_index WHERE indexrelid='public.realtor_weekly_review_one_per_local_week_idx'::regclass),
  'the local-week review index remains unique');
SELECT ok(position('localWeekKey' in pg_get_functiondef('public.realtor_audit_weekly_review_transition()'::regprocedure))>0,
  'review completion audit continues to retain its local-week evidence');

SELECT * FROM finish();
ROLLBACK;
