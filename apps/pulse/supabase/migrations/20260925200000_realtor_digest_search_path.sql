-- pgcrypto is installed in Supabase's trusted `extensions` schema. These
-- SECURITY DEFINER mutation functions intentionally pin their search paths;
-- include that trusted schema so their digest() calls resolve after deploy.
ALTER FUNCTION public.realtor_setup_personal_workspace(UUID,UUID,UUID,INTEGER,TEXT,TEXT,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,DATE)
  SET search_path = public, extensions;
ALTER FUNCTION public.realtor_save_planner_item_without_task_identity(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  SET search_path = public, extensions;
ALTER FUNCTION public.realtor_save_planner_item(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  SET search_path = public, extensions;
ALTER FUNCTION public.realtor_apply_occurrence_action(UUID,UUID,UUID,INTEGER,UUID,TEXT,DATE,TIME,JSONB)
  SET search_path = public, extensions;
ALTER FUNCTION public.realtor_save_financial_record(UUID,UUID,UUID,INTEGER,UUID,TEXT,DATE,JSONB,UUID,INTEGER)
  SET search_path = public, extensions;
ALTER FUNCTION public.realtor_save_goal(UUID,UUID,UUID,INTEGER,UUID,SMALLINT,TEXT,BIGINT,BOOLEAN)
  SET search_path = public, extensions;
ALTER FUNCTION public.realtor_update_reminder(UUID,UUID,UUID,INTEGER,UUID,TEXT,TIMESTAMPTZ)
  SET search_path = public, extensions;
ALTER FUNCTION public.realtor_materialize_planner_occurrence(UUID,UUID,UUID,INTEGER,UUID,DATE,JSONB)
  SET search_path = public, extensions;
ALTER FUNCTION public.realtor_correct_financial_record(UUID,UUID,UUID,INTEGER,UUID,TEXT,DATE,JSONB)
  SET search_path = public, extensions;
ALTER FUNCTION public.realtor_void_financial_record(UUID,UUID,UUID,INTEGER,UUID)
  SET search_path = public, extensions;
ALTER FUNCTION public.realtor_realize_expected_income(UUID,UUID,UUID,INTEGER,UUID,DATE,JSONB)
  SET search_path = public, extensions;
