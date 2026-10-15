-- Business revision/source conflicts require the caller to reload. SQLSTATE
-- 40001 instead asks older PostgREST transaction runners to retry indefinitely.
-- Patch only the two seller functions, retaining their definitions and ACLs.
DO $$
DECLARE
  target RECORD;
  definition TEXT;
  conflict_count INTEGER;
BEGIN
  FOR target IN SELECT * FROM (VALUES
    ('public.seller_lead_record_action(uuid,jsonb)', 4),
    ('public.realtor_save_planner_item_without_campaign_identity(uuid,uuid,uuid,integer,uuid,jsonb,jsonb)', 3)
  ) AS functions(signature, expected_conflicts) LOOP
    definition := pg_get_functiondef(target.signature::regprocedure);
    conflict_count := (length(definition) - length(replace(definition, '''40001''', ''))) / length('''40001''');
    IF conflict_count <> target.expected_conflicts THEN
      RAISE EXCEPTION 'Unexpected seller conflict definition for %', target.signature;
    END IF;
    EXECUTE replace(definition, '''40001''', '''PT409''');
  END LOOP;
END $$;
