-- A stale reminder is a business conflict, not a transaction to retry.
-- Preserve the reviewed function body, search path, and existing execute ACLs.
DO $$
DECLARE definition TEXT;
BEGIN
  definition := pg_get_functiondef('public.realtor_update_reminder(uuid,uuid,uuid,integer,uuid,text,timestamp with time zone)'::regprocedure);
  IF (length(definition) - length(replace(definition, '''40001''', ''))) / length('''40001''') <> 1 THEN
    RAISE EXCEPTION 'Unexpected reminder conflict definition';
  END IF;
  EXECUTE replace(definition, '''40001''', '''PT409''');
END $$;
