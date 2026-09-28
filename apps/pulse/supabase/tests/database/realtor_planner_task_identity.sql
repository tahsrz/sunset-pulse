BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;
-- Use deterministic local identities without requiring auth fixture shape.
SET LOCAL session_replication_role = replica;

SELECT plan(22);

SELECT has_column(
  'public', 'realtor_planner_items', 'source_sprint_task_id',
  'planner items retain the source personal sprint task'
);
SELECT has_index(
  'public', 'realtor_planner_items', 'realtor_planner_items_source_task_once_idx',
  'a source sprint task can be linked to at most one planner item per user'
);
SELECT ok(has_function_privilege(
  'service_role',
  'public.realtor_save_planner_item(uuid,uuid,uuid,integer,uuid,jsonb,jsonb)',
  'EXECUTE'
), 'service role can save planner task links');
SELECT ok(NOT has_function_privilege(
  'anon',
  'public.realtor_save_planner_item(uuid,uuid,uuid,integer,uuid,jsonb,jsonb)',
  'EXECUTE'
), 'anonymous callers cannot save planner task links');
SELECT ok(NOT has_function_privilege(
  'authenticated',
  'public.realtor_save_planner_item(uuid,uuid,uuid,integer,uuid,jsonb,jsonb)',
  'EXECUTE'
), 'authenticated clients cannot bypass the server save path');

CREATE TEMP TABLE realtor_task_identity_observations (
  name TEXT PRIMARY KEY,
  bool_value BOOLEAN NOT NULL
);

DO $$
DECLARE
  actor_id UUID := gen_random_uuid();
  other_actor_id UUID := gen_random_uuid();
  workspace_id UUID := gen_random_uuid();
  other_workspace_id UUID := gen_random_uuid();
  v_property_id UUID := gen_random_uuid();
  other_property_id UUID := gen_random_uuid();
  archived_property_id UUID := gen_random_uuid();
  task_id UUID := gen_random_uuid();
  stale_task_id UUID := gen_random_uuid();
  other_owner_task_id UUID := gen_random_uuid();
  wrong_property_task_id UUID := gen_random_uuid();
  archived_property_task_id UUID := gen_random_uuid();
  saved_item_id UUID;
  replay_item_id UUID;
  saved_revision INTEGER;
  replay_revision INTEGER;
  replayed BOOLEAN;
  due_date TEXT := to_char(CURRENT_DATE + 10, 'YYYY-MM-DD');
  due_spec JSONB;
  occurrence_candidates JSONB;
  planner_item JSONB;
  caught_state TEXT;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  INSERT INTO public.platform_workspaces(id, kind, name, created_by)
  VALUES (workspace_id, 'personal', 'Planner task test', actor_id),
         (other_workspace_id, 'personal', 'Other owner test', other_actor_id);
  INSERT INTO public.platform_memberships(workspace_id, user_id, role)
  VALUES (workspace_id, actor_id, 'owner'), (other_workspace_id, other_actor_id, 'owner');
  INSERT INTO public.realtor_preferences(user_id, workspace_id)
  VALUES (actor_id, workspace_id), (other_actor_id, other_workspace_id);

  INSERT INTO public.property_shortlist_entries(id, owner_id, area_key, address, property_kind, revision, status)
  VALUES (v_property_id, actor_id, 'keller-westlake', '100 Current Way', 'residential', 3, 'active'),
         (other_property_id, actor_id, 'keller-westlake', '200 Different Way', 'residential', 1, 'active'),
         (archived_property_id, actor_id, 'keller-westlake', '300 Archived Way', 'residential', 1, 'archived'),
         (gen_random_uuid(), other_actor_id, 'keller-westlake', '400 Other Owner Way', 'residential', 1, 'active');

  INSERT INTO public.sprint_backlog_items(id, owner_id, title, source_type, property_id, property_task_kind, input_revision)
  VALUES (task_id, actor_id, 'Current property task', 'property_shortlist', v_property_id, 'verify_facts', 3),
         (stale_task_id, actor_id, 'Stale property task', 'property_shortlist', v_property_id, 'verify_facts', 2),
         (other_owner_task_id, other_actor_id, 'Other owner task', 'property_shortlist', other_property_id, 'verify_facts', 1),
         (wrong_property_task_id, actor_id, 'Wrong property task', 'property_shortlist', v_property_id, 'verify_facts', 3),
         (archived_property_task_id, actor_id, 'Archived property task', 'property_shortlist', archived_property_id, 'verify_facts', 1);

  due_spec := jsonb_build_object(
    'anchorDate', due_date, 'localTime', NULL, 'timeZone', 'America/Chicago',
    'recurrence', jsonb_build_object('frequency', 'once'), 'endsOn', NULL,
    'reminderOffsetsDays', '[]'::jsonb
  );
  occurrence_candidates := jsonb_build_array(jsonb_build_object(
    'occurrenceKeyDate', due_date, 'effectiveDate', due_date, 'reminders', '[]'::jsonb
  ));

  planner_item := jsonb_build_object(
    'kind', 'task', 'title', 'Current property task', 'notes', '', 'due', due_spec,
    'expectedAmountCents', NULL, 'property', jsonb_build_object('propertyId', v_property_id),
    'sourceSprintTaskId', task_id
  );
  SELECT result.item_id, result.revision, result.reused INTO saved_item_id, saved_revision, replayed
    FROM public.realtor_save_planner_item(
      actor_id, workspace_id, NULL, NULL, gen_random_uuid(), planner_item, occurrence_candidates
    ) AS result;
  INSERT INTO realtor_task_identity_observations
  SELECT 'source_link_persisted', source_sprint_task_id = task_id
    FROM public.realtor_planner_items WHERE id = saved_item_id AND user_id = actor_id;
  INSERT INTO realtor_task_identity_observations
  SELECT 'property_link_persisted', planner.property_id = v_property_id
    FROM public.realtor_planner_items AS planner WHERE planner.id = saved_item_id AND planner.user_id = actor_id;
  INSERT INTO realtor_task_identity_observations
  SELECT 'task_status_unchanged_after_save', status = 'open'
    FROM public.sprint_backlog_items WHERE id = task_id;

  SELECT result.item_id, result.revision, result.reused INTO replay_item_id, replay_revision, replayed
    FROM public.realtor_save_planner_item(
      actor_id, workspace_id, NULL, NULL,
      (SELECT request_key FROM public.realtor_mutation_receipts WHERE resource_id = saved_item_id AND operation = 'planner_item'),
      planner_item, occurrence_candidates
    ) AS result;
  INSERT INTO realtor_task_identity_observations VALUES
    ('same_key_returns_same_item', replay_item_id = saved_item_id),
    ('same_key_reports_reuse', replayed),
    ('retry_does_not_duplicate_occurrence', (SELECT count(*) = 1 FROM public.realtor_planner_occurrences WHERE item_id = saved_item_id));

  caught_state := NULL;
  BEGIN
    PERFORM * FROM public.realtor_save_planner_item(
      actor_id, workspace_id, NULL, NULL, gen_random_uuid(),
      planner_item || jsonb_build_object('title', 'Duplicate claim'), occurrence_candidates
    );
  EXCEPTION WHEN OTHERS THEN caught_state := SQLSTATE;
  END;
  INSERT INTO realtor_task_identity_observations VALUES
    ('duplicate_claim_rejected', caught_state = '23505'),
    ('only_one_item_claims_source', (SELECT count(*) = 1 FROM public.realtor_planner_items WHERE user_id = actor_id AND source_sprint_task_id = task_id)),
    ('task_still_open_after_duplicate', (SELECT status = 'open' FROM public.sprint_backlog_items WHERE id = task_id));

  caught_state := NULL;
  BEGIN
    PERFORM * FROM public.realtor_save_planner_item(
      actor_id, workspace_id, NULL, NULL, gen_random_uuid(),
      jsonb_build_object('kind', 'task', 'title', 'Stale claim', 'notes', '', 'due', due_spec,
        'expectedAmountCents', NULL, 'property', jsonb_build_object('propertyId', v_property_id),
        'sourceSprintTaskId', stale_task_id), occurrence_candidates
    );
  EXCEPTION WHEN OTHERS THEN caught_state := SQLSTATE;
  END;
  INSERT INTO realtor_task_identity_observations VALUES
    ('stale_task_rejected', caught_state = '23505'),
    ('stale_task_save_rolled_back', NOT EXISTS (SELECT 1 FROM public.realtor_planner_items WHERE user_id = actor_id AND title = 'Stale claim'));

  caught_state := NULL;
  BEGIN
    PERFORM * FROM public.realtor_save_planner_item(
      actor_id, workspace_id, NULL, NULL, gen_random_uuid(),
      jsonb_build_object('kind', 'task', 'title', 'Wrong owner claim', 'notes', '', 'due', due_spec,
        'expectedAmountCents', NULL, 'property', jsonb_build_object('propertyId', v_property_id),
        'sourceSprintTaskId', other_owner_task_id), occurrence_candidates
    );
  EXCEPTION WHEN OTHERS THEN caught_state := SQLSTATE;
  END;
  INSERT INTO realtor_task_identity_observations VALUES
    ('wrong_owner_task_rejected', caught_state = '23505'),
    ('wrong_owner_save_rolled_back', NOT EXISTS (SELECT 1 FROM public.realtor_planner_items WHERE user_id = actor_id AND title = 'Wrong owner claim'));

  caught_state := NULL;
  BEGIN
    PERFORM * FROM public.realtor_save_planner_item(
      actor_id, workspace_id, NULL, NULL, gen_random_uuid(),
      jsonb_build_object('kind', 'task', 'title', 'Wrong property claim', 'notes', '', 'due', due_spec,
        'expectedAmountCents', NULL, 'property', jsonb_build_object('propertyId', other_property_id),
        'sourceSprintTaskId', wrong_property_task_id), occurrence_candidates
    );
  EXCEPTION WHEN OTHERS THEN caught_state := SQLSTATE;
  END;
  INSERT INTO realtor_task_identity_observations VALUES
    ('wrong_property_task_rejected', caught_state = '23505'),
    ('wrong_property_save_rolled_back', NOT EXISTS (SELECT 1 FROM public.realtor_planner_items WHERE user_id = actor_id AND title = 'Wrong property claim'));

  caught_state := NULL;
  BEGIN
    PERFORM * FROM public.realtor_save_planner_item(
      actor_id, workspace_id, NULL, NULL, gen_random_uuid(),
      jsonb_build_object('kind', 'task', 'title', 'Archived property claim', 'notes', '', 'due', due_spec,
        'expectedAmountCents', NULL, 'property', jsonb_build_object('propertyId', archived_property_id),
        'sourceSprintTaskId', archived_property_task_id), occurrence_candidates
    );
  EXCEPTION WHEN OTHERS THEN caught_state := SQLSTATE;
  END;
  INSERT INTO realtor_task_identity_observations VALUES
    ('archived_property_task_rejected', caught_state = '23505'),
    ('archived_property_save_rolled_back', NOT EXISTS (SELECT 1 FROM public.realtor_planner_items WHERE user_id = actor_id AND title = 'Archived property claim'));
END;
$$;

SELECT ok(bool_value, name) FROM realtor_task_identity_observations ORDER BY name;
SELECT * FROM finish();
ROLLBACK;
