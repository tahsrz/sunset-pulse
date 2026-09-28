CREATE OR REPLACE FUNCTION public.realtor_audit_weekly_review_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE review JSONB; action_name TEXT; week_key TEXT; zone TEXT;
BEGIN
  IF NEW.kind_snapshot <> 'weekly_review'
    OR (NEW.status IS NOT DISTINCT FROM OLD.status
      AND NEW.completion_details IS NOT DISTINCT FROM OLD.completion_details) THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' THEN
    review := NEW.completion_details->'weeklyReview';
    action_name := 'realtor.weekly_review.completed';
  ELSIF OLD.status = 'completed' THEN
    review := OLD.completion_details->'weeklyReview';
    action_name := 'realtor.weekly_review.left_completed';
  ELSE
    RETURN NEW;
  END IF;

  week_key := review->>'localWeekKey';
  zone := review->>'timeZone';
  INSERT INTO public.platform_audit_events(
    workspace_id, actor_id, actor_kind, action, resource_type, resource_id, safe_metadata
  ) VALUES (
    NEW.workspace_id, NEW.user_id, 'user', action_name, 'realtor_weekly_review', NEW.id::TEXT,
    jsonb_build_object(
      'revision', NEW.revision,
      'fromStatus', OLD.status,
      'toStatus', NEW.status,
      'localWeekKey', week_key,
      'timeZone', zone,
      'checklistVersion', review->>'version'
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS realtor_weekly_review_audit_transition ON public.realtor_planner_occurrences;
CREATE TRIGGER realtor_weekly_review_audit_transition
AFTER UPDATE ON public.realtor_planner_occurrences
FOR EACH ROW EXECUTE FUNCTION public.realtor_audit_weekly_review_transition();

REVOKE ALL ON FUNCTION public.realtor_audit_weekly_review_transition() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.realtor_audit_goal_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE action_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_name := 'realtor.goal.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'archived' THEN
    action_name := 'realtor.goal.archived';
  ELSIF NEW.target IS DISTINCT FROM OLD.target THEN
    action_name := 'realtor.goal.updated';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.platform_audit_events(
    workspace_id, actor_id, actor_kind, action, resource_type, resource_id, safe_metadata
  ) VALUES (
    NEW.workspace_id, NEW.user_id, 'user', action_name, 'realtor_goal', NEW.id::TEXT,
    jsonb_build_object('revision', NEW.revision, 'year', NEW.year, 'metric', NEW.metric, 'status', NEW.status)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS realtor_goal_audit_change ON public.realtor_goals;
CREATE TRIGGER realtor_goal_audit_change
AFTER INSERT OR UPDATE ON public.realtor_goals
FOR EACH ROW EXECUTE FUNCTION public.realtor_audit_goal_change();

REVOKE ALL ON FUNCTION public.realtor_audit_goal_change() FROM PUBLIC, anon, authenticated;
